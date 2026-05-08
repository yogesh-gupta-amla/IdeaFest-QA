import type {
  QAIssue,
  ProjectHealthResult,
  AgeingItem,
  AgeingStatus,
  AgeingAnalysisResult,
  AgeingRiskInsight,
  TopStory,
  BugLeakageItem,
  OverburntItem,
  OverburntItemDetail,
  OverburntAnalysis,
  OverburntSeverity,
  FlowImpactItem,
  AIRecommendation,
  TrendPoint,
  SeverityBucket,
  DashboardFilters,
  RiskLevel,
  EarlyCompletionItem,
  EarlyCompletionAnalysis,
  CodeIntelIssue,
  CodeIntelAnalysis,
  ReusableComponent,
  RecentImplementation,
  DuplicateDetection,
  DeveloperInsight,
  CodeIntelRecommendation,
} from "../types/qa";
import type { QueryTimeRange } from "./queryTimeRange";

// ─── Helpers ────────────────────────────────────────────────────────────────

export const hoursSince = (dateStr: string): number => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60));
};

export const isActiveIssue = (issue: QAIssue): boolean =>
  !["Resolved", "Closed"].includes(issue.status);

export const filterIssues = (
  issues: QAIssue[],
  filters: DashboardFilters,
): QAIssue[] => {
  return issues.filter((issue) => {
    if (
      filters.severity.length > 0 &&
      !filters.severity.includes(issue.priority)
    )
      return false;
    if (
      filters.assignee.length > 0 &&
      !filters.assignee.includes(issue.assignee)
    )
      return false;
    if (
      filters.environment.length > 0 &&
      !filters.environment.includes(issue.environment)
    )
      return false;
    if (filters.module.length > 0 && !filters.module.includes(issue.module))
      return false;
    if (filters.dateRange) {
      const created = new Date(issue.created).getTime();
      const from = new Date(filters.dateRange[0]).getTime();
      const to = new Date(filters.dateRange[1]).getTime();
      if (created < from || created > to) return false;
    }
    return true;
  });
};

// ─── 1. Project Health ───────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  Blocker: "#ff0033",
  Critical: "#ff4d4f",
  High: "#fa8c16",
  Medium: "#faad14",
  Low: "#52c41a",
};

export const calculateProjectHealth = (
  issues: QAIssue[],
  recentlyResolved?: QAIssue[],
  timeRange: QueryTimeRange = "lastmonth",
  dateRange?: [string, string],
  ageingIssues?: QAIssue[],
  activeIssues?: QAIssue[],
): ProjectHealthResult => {
  // Total Active Issues comes from the dedicated active-issues JQL (Bug/Defect, not-Done).
  // Fall back to client-side filter only if the dedicated dataset isn't available.
  const active =
    activeIssues && activeIssues.length > 0
      ? activeIssues
      : issues.filter(
          (i) =>
            isActiveIssue(i) &&
            (i.issueType === "Bug" || i.issueType === "Defect"),
        );
  const total = active.length;
  // Critical/Blocker comes from the ageing JQL (Bug/Defect, Blocker|Critical, not-Done).
  const criticalBlockerCount =
    ageingIssues && ageingIssues.length > 0
      ? ageingIssues.length
      : active.filter(
          (i) => i.priority === "Critical" || i.priority === "Blocker",
        ).length;
  const highSeverityCount = active.filter((i) => i.priority === "High").length;
  const reopenedCount = active.filter(
    (i) => i.reopenCount > 0 || i.status === "Reopened",
  ).length;

  const slaBreachedIssues = active.filter((i) => {
    const elapsed = hoursSince(i.created);
    return elapsed > i.slaHours;
  });
  const slaBreachCount = slaBreachedIssues.length;

  const rangeHours = timeRange === "last6months" ? 180 * 24 : 30 * 24;

  // Use recentlyResolved (last 7d) for closure rate if provided
  const resolvedInLast7d = recentlyResolved
    ? recentlyResolved.length
    : issues.filter((i) => {
        if (!i.resolved) return false;
        return hoursSince(i.resolved) < rangeHours;
      }).length;
  const createdInLast7d = issues.filter(
    (i) => hoursSince(i.created) < rangeHours,
  ).length;
  const closureRate =
    createdInLast7d > 0 ? resolvedInLast7d / createdInLast7d : 1;
  const creationRate = createdInLast7d;

  const criticalBlockerRatio = total > 0 ? criticalBlockerCount / total : 0;
  const reopenedRatio = total > 0 ? reopenedCount / total : 0;

  // RED conditions
  const isRed =
    criticalBlockerRatio > 0.05 ||
    slaBreachCount > 0 ||
    reopenedRatio > 0.15 ||
    closureRate < 0.8;

  const drivers: string[] = [];
  if (criticalBlockerRatio > 0.05)
    drivers.push(
      `${criticalBlockerCount} Critical/Blocker issues (${(criticalBlockerRatio * 100).toFixed(1)}% of total)`,
    );
  if (slaBreachCount > 0)
    drivers.push(
      `${slaBreachCount} SLA breach${slaBreachCount > 1 ? "es" : ""} detected`,
    );
  if (reopenedRatio > 0.15)
    drivers.push(`High reopen rate: ${reopenedCount} reopened issues`);
  if (closureRate < 0.8)
    drivers.push(
      `Closure rate (${(closureRate * 100).toFixed(0)}%) below creation rate`,
    );
  if (!isRed) drivers.push("All health metrics within acceptable thresholds");

  const score = isRed
    ? Math.max(
        10,
        60 - criticalBlockerCount * 5 - slaBreachCount * 8 - reopenedCount * 3,
      )
    : Math.min(95, 75 + (closureRate - 0.8) * 50);

  const summary = isRed
    ? `Project health is RED. ${criticalBlockerCount} critical/blocker issues and ${slaBreachCount} SLA breaches require immediate attention.`
    : `Project health is GREEN. Closure rate is ${(closureRate * 100).toFixed(0)}%, with ${total} active issues well-managed.`;

  // Defect trend — combine open issues + recently resolved.
  // Bucket size adapts to range so charts stay legible:
  // Last Month → 30 daily buckets, Last 6 Months → 26 weekly buckets.
  const allIssuesForTrend = recentlyResolved
    ? [...issues, ...recentlyResolved]
    : issues;
  const isWeekly = timeRange === "last6months";
  const bucketCount = isWeekly ? 26 : 30;
  const bucketMs = (isWeekly ? 7 : 1) * 86400000;

  const defectTrend: TrendPoint[] = Array.from(
    { length: bucketCount },
    (_, i) => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const bucketEnd = end.getTime() - (bucketCount - 1 - i) * bucketMs;
      const bucketStart = bucketEnd - bucketMs + 1;
      const label = new Date(bucketEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const created = allIssuesForTrend.filter((iss) => {
        const t = new Date(iss.created).getTime();
        return t >= bucketStart && t <= bucketEnd;
      }).length;
      const resolved = allIssuesForTrend.filter((iss) => {
        if (!iss.resolved) return false;
        const t = new Date(iss.resolved).getTime();
        return t >= bucketStart && t <= bucketEnd;
      }).length;
      const open = allIssuesForTrend.filter((iss) => {
        return (
          new Date(iss.created).getTime() <= bucketEnd && isActiveIssue(iss)
        );
      }).length;
      return { date: label, created, resolved, open };
    },
  );

  const severityDistribution: SeverityBucket[] = (
    ["Blocker", "Critical", "High", "Medium", "Low"] as const
  )
    .map((p) => ({
      name: p,
      value: active.filter((i) => i.priority === p).length,
      color: SEVERITY_COLORS[p],
    }))
    .filter((b) => b.value > 0);

  return {
    status: isRed ? "RED" : "GREEN",
    score: Math.round(score),
    summary,
    keyDrivers: drivers,
    totalIssues: total,
    criticalBlockerCount,
    highSeverityCount,
    slaBreachCount,
    reopenedCount,
    defectTrend,
    severityDistribution,
    closureRate,
    creationRate,
  };
};

// ─── 2. Ageing Analysis ──────────────────────────────────────────────────────

const HIGH_RISK_MODULES = ["Checkout", "Payment"];
const PROD_ENVIRONMENTS = ["Production"];

/** Statuses considered "Backlog / Open" for the >48h and Fresh Bugs queries */
const BACKLOG_OPEN_STATUSES = new Set(["backlog", "open"]);

/** Check if originalStatus matches Backlog or Open */
const isBacklogOrOpen = (originalStatus: string): boolean =>
  BACKLOG_OPEN_STATUSES.has(originalStatus.toLowerCase().trim());

/** Check if originalStatus looks like "Blocked" */
const isBlockedStatus = (originalStatus: string): boolean =>
  originalStatus.toLowerCase().trim() === "blocked";

/**
 * Calculate weekday (Mon–Fri) business hours between two dates.
 * Counts only hours that fall on weekdays.
 */
function weekdayHoursBetween(from: Date, to: Date): number {
  let hours = 0;
  const cursor = new Date(from);
  cursor.setMinutes(0, 0, 0);
  while (cursor < to) {
    const day = cursor.getDay(); // 0=Sun, 6=Sat
    if (day >= 1 && day <= 5) hours++;
    cursor.setTime(cursor.getTime() + 3600000); // advance 1 hour
  }
  return hours;
}

/**
 * Get the most recent status change date; falls back to created date.
 */
function lastStatusUpdateDate(issue: QAIssue): Date {
  if (issue.statusChanges.length > 0) {
    const sorted = [...issue.statusChanges].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return new Date(sorted[0].date);
  }
  return new Date(issue.created);
}

function buildAgeingItem(issue: QAIssue): AgeingItem {
  const hoursElapsed = hoursSince(issue.created);
  const { slaHours } = issue;

  // Ageing logic: if no status update within 48 weekday (Mon–Fri) hours → AGED, otherwise FRESH
  const lastUpdate = lastStatusUpdateDate(issue);
  const businessHoursSinceUpdate = weekdayHoursBetween(lastUpdate, new Date());

  let ageingStatus: AgeingStatus;
  if (businessHoursSinceUpdate >= 48) ageingStatus = "AGED";
  else if (businessHoursSinceUpdate >= 24) ageingStatus = "AT_RISK";
  else ageingStatus = "FRESH";

  const isEscalated =
    hoursElapsed > 48 && isBacklogOrOpen(issue.originalStatus);

  let riskScore = (businessHoursSinceUpdate / 48) * 50;
  if (HIGH_RISK_MODULES.includes(issue.module)) riskScore += 20;
  if (PROD_ENVIRONMENTS.includes(issue.environment)) riskScore += 20;
  if (issue.reopenCount > 0) riskScore += issue.reopenCount * 5;
  if (issue.statusChanges.length <= 1 && hoursElapsed > 24) riskScore += 10;

  return {
    issue,
    hoursElapsed,
    slaHours,
    ageingStatus,
    isEscalated,
    isBlocked: isBlockedStatus(issue.originalStatus),
    riskScore: Math.min(100, Math.round(riskScore)),
    slaBreach: hoursElapsed > slaHours,
  };
}

/**
 * Ageing analysis driven by three Jira queries (Q1, Q2, Q3) executed
 * server-side. Each result set is used directly — there is no client-side
 * date filtering, so what you see in the dashboard matches the JQL exactly.
 *
 * - **Q1 / totalCriticalBlockers** — Bug/Defect, Blocker/Critical, NOT IN
 *   (Done, QA Done, Rejected, Ready for Production/QA/Testing/UAT).
 *
 * - **Q2 / reportedOver48** — Bug, status IN (Backlog, Open),
 *   Blocker/Critical, created within the last 48 hours.
 *
 * - **Q3 / freshBugs** — Bug/Defect, status IN (Backlog, Open),
 *   Blocker/Critical, created within the last 8 hours.
 */
export const calculateAgeingAnalysis = (
  totalCriticalBlockerIssues: QAIssue[],
  over48Issues: QAIssue[],
  freshIssues: QAIssue[],
): AgeingAnalysisResult => {
  const totalCriticalBlockers = totalCriticalBlockerIssues
    .map(buildAgeingItem)
    .sort((a, b) => b.riskScore - a.riskScore);
  const reportedOver48 = over48Issues
    .map(buildAgeingItem)
    .sort((a, b) => b.riskScore - a.riskScore);
  const freshBugs = freshIssues
    .map(buildAgeingItem)
    .sort((a, b) => b.riskScore - a.riskScore);

  const allItems = totalCriticalBlockers;

  // ─── Risk Insights ──────────────────────────────────────────────────────
  const riskInsights: AgeingRiskInsight[] = [];
  const aged = allItems.filter((i) => i.ageingStatus === "AGED").length;
  const atRisk = allItems.filter((i) => i.ageingStatus === "AT_RISK").length;
  const blocked = allItems.filter((i) => i.isBlocked).length;

  if (reportedOver48.length > 0) {
    riskInsights.push({
      type: "error",
      message: `${reportedOver48.length} Blocker/Critical bug(s) reported in the last 48 hours sitting in Backlog/Open — triage today`,
    });
  }
  if (aged > 0) {
    riskInsights.push({
      type: "error",
      message: `${aged} issue(s) have breached SLA — these are AGED and must be resolved urgently`,
    });
  }
  if (freshBugs.length > 0) {
    riskInsights.push({
      type: "warning",
      message: `${freshBugs.length} fresh Blocker/Critical bug(s) reported in the last 8 hours — assign owners now`,
    });
  }
  if (blocked > 0) {
    riskInsights.push({
      type: "warning",
      message: `${blocked} issue(s) are in Blocked status — identify and remove blockers to restore flow`,
    });
  }
  if (atRisk > 0) {
    riskInsights.push({
      type: "warning",
      message: `${atRisk} issue(s) approaching SLA deadline (AT RISK) — prioritize before they age`,
    });
  }

  // Module concentration
  const moduleMap = new Map<string, number>();
  allItems.forEach((i) => {
    const mod = i.issue.module;
    moduleMap.set(mod, (moduleMap.get(mod) || 0) + 1);
  });
  const hotModules = Array.from(moduleMap.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);
  hotModules.forEach(([mod, count]) => {
    riskInsights.push({
      type: "error",
      message: `Module "${mod}" has ${count} Critical/Blocker issues — RED area requiring focused attention`,
    });
  });

  if (riskInsights.length === 0) {
    riskInsights.push({
      type: "success",
      message:
        "No critical ageing risks detected — all Blocker/Critical issues are within acceptable timelines",
    });
  }

  // ─── Recommendations ────────────────────────────────────────────────────
  const recommendations: string[] = [];
  if (reportedOver48.length > 0) {
    recommendations.push(
      `Triage the ${reportedOver48.length} Blocker/Critical bug(s) reported in the last 48 hours that are still in Backlog/Open`,
    );
  }
  if (freshBugs.length > 0) {
    recommendations.push(
      `Assign owners to the ${freshBugs.length} fresh Blocker/Critical bug(s) reported in the last 8 hours`,
    );
  }
  if (blocked > 0) {
    recommendations.push(
      `Unblock the ${blocked} blocked issue(s) — escalate dependency or environment issues in today's standup`,
    );
  }
  if (hotModules.length > 0) {
    recommendations.push(
      `Focus QA effort on ${hotModules.map(([m]) => m).join(", ")} — high concentration of Critical/Blocker defects`,
    );
  }
  if (aged > 0) {
    recommendations.push(
      `Set up automated escalation alerts for issues approaching the 48-hour mark to prevent further ageing`,
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Continue current triage cadence — all Critical/Blocker issues are being handled within SLA",
    );
  }

  return {
    reportedOver48,
    totalCriticalBlockers,
    freshBugs,
    riskInsights,
    recommendations,
  };
};

// ─── 3. Top Stories with Max Bugs ────────────────────────────────────────────

export const calculateTopStories = (issues: QAIssue[]): TopStory[] => {
  const storyMap = new Map<string, TopStory>();

  issues.forEach((issue) => {
    if (!issue.storyKey || !issue.storyTitle) return;
    if (!storyMap.has(issue.storyKey)) {
      storyMap.set(issue.storyKey, {
        storyKey: issue.storyKey,
        storyTitle: issue.storyTitle,
        bugCount: 0,
        bugs: [],
        criticalCount: 0,
        highCount: 0,
      });
    }
    const story = storyMap.get(issue.storyKey)!;
    story.bugCount++;
    story.bugs.push(issue);
    if (issue.priority === "Critical" || issue.priority === "Blocker")
      story.criticalCount++;
    if (issue.priority === "High") story.highCount++;
  });

  return Array.from(storyMap.values())
    .sort((a, b) => b.bugCount - a.bugCount)
    .slice(0, 3);
};

// ─── 4. Bug Leakage ──────────────────────────────────────────────────────────

const PROD_KEYWORDS = ["prod", "production"];
const STAGE_KEYWORDS = ["stage", "staging"];
const NPR_KEYWORDS = ["npr"];
const NP_KEYWORDS = ["np", "non-prod", "nonprod"];

const detectLeakage = (
  issue: QAIssue,
): { type: string; env: string } | null => {
  const labelText = issue.labels.join(" ").toLowerCase();
  const summaryText = issue.summary.toLowerCase();
  const combined = `${labelText} ${summaryText}`;

  if (
    issue.environment === "Production" ||
    PROD_KEYWORDS.some((k) => combined.includes(k))
  )
    return { type: "Production Leakage", env: "Production" };
  if (
    issue.environment === "Staging" ||
    STAGE_KEYWORDS.some((k) => combined.includes(k))
  )
    return { type: "Stage Leakage", env: "Staging" };
  if (
    issue.environment === "NPR" ||
    NPR_KEYWORDS.some((k) => combined.includes(k))
  )
    return { type: "NPR Leakage", env: "NPR" };
  if (
    issue.environment === "Non-Prod" ||
    NP_KEYWORDS.some((k) => combined.includes(k))
  )
    return { type: "Non-Prod Leakage", env: "Non-Prod" };
  return null;
};

export const calculateBugLeakage = (issues: QAIssue[]): BugLeakageItem[] => {
  const results: BugLeakageItem[] = [];
  issues.forEach((issue) => {
    const detected = detectLeakage(issue);
    if (detected) {
      results.push({
        issue,
        leakageType: detected.type,
        detectedIn: detected.env,
      });
    }
  });
  return results.sort((a, b) => {
    const order = ["Production", "Staging", "NPR", "Non-Prod"];
    return order.indexOf(a.detectedIn) - order.indexOf(b.detectedIn);
  });
};

// ─── 5. Overburnt Items ──────────────────────────────────────────────────────

function classifySeverity(pct: number): OverburntSeverity {
  if (pct > 160) return "Critical";
  if (pct > 130) return "High";
  return "Moderate";
}

function inferOverburnReason(issue: QAIssue, contributorCount: number): string {
  const reasons: string[] = [];
  if (issue.reopenCount > 0) reasons.push("rework/reopened cycles");
  if (issue.assigneeChanges > 1) reasons.push("multiple handoffs");
  if (contributorCount > 2) reasons.push("too many contributors");
  if (issue.statusChanges.length > 6)
    reasons.push("excessive status transitions");
  if (issue.commentsCount > 10)
    reasons.push("unclear requirements (high discussion)");
  if (issue.timeEstimate > 0 && issue.timeLogged > issue.timeEstimate * 2)
    reasons.push("severe underestimation");
  else if (issue.timeEstimate > 0 && issue.timeLogged > issue.timeEstimate)
    reasons.push("underestimation");
  if (reasons.length === 0) reasons.push("general inefficiency or scope creep");
  return reasons.join(", ");
}

/** Legacy wrapper for backward compatibility */
export const calculateOverburntItems = (issues: QAIssue[]): OverburntItem[] => {
  const results: OverburntItem[] = [];
  issues.forEach((issue) => {
    const reasons: string[] = [];
    let score = 0;
    if (issue.timeLogged > issue.timeEstimate && issue.timeEstimate > 0) {
      reasons.push(
        `Time logged (${issue.timeLogged}h) > estimate (${issue.timeEstimate}h)`,
      );
      score += 30;
    }
    if (issue.statusChanges.length > 5) {
      reasons.push(`${issue.statusChanges.length} status changes`);
      score += 20;
    }
    if (issue.reopenCount > 0) {
      reasons.push(`Reopened ${issue.reopenCount} time(s)`);
      score += issue.reopenCount * 15;
    }
    if (issue.commentsCount > 10) {
      reasons.push(`${issue.commentsCount} comments`);
      score += 10;
    }
    if (issue.assigneeChanges > 0) {
      reasons.push(`Assignee changed ${issue.assigneeChanges} time(s)`);
      score += issue.assigneeChanges * 10;
    }
    if (reasons.length > 0) {
      results.push({
        issue,
        overburntReasons: reasons,
        riskLevel: score >= 40 ? "High" : "Medium",
        overburntScore: Math.min(100, score),
      });
    }
  });
  return results.sort((a, b) => b.overburntScore - a.overburntScore);
};

/** Full overburn analysis matching the AI Analyst prompt schema */
export const calculateOverburntAnalysis = (
  issues: QAIssue[],
): OverburntAnalysis => {
  // Build detailed items
  const items: OverburntItemDetail[] = issues
    .map((issue) => {
      const est = issue.timeEstimate;
      const spent = issue.timeLogged;
      const wr =
        issue.workratio > 0
          ? issue.workratio
          : est > 0
            ? Math.round((spent / est) * 100)
            : 100;
      const overburnPct = wr;
      const severity = classifySeverity(overburnPct);

      // Build contributor map from worklogs
      const contribMap = new Map<string, number>();
      for (const wl of issue.worklogs) {
        contribMap.set(
          wl.author,
          (contribMap.get(wl.author) || 0) + wl.timeSpentHours,
        );
      }
      // If no worklogs, use assignee with total time spent
      if (contribMap.size === 0 && spent > 0) {
        contribMap.set(issue.assignee, spent);
      }

      const allContributors = Array.from(contribMap.entries())
        .map(([name, timeLogged]) => ({
          name,
          timeLogged: Math.round(timeLogged * 100) / 100,
        }))
        .sort((a, b) => b.timeLogged - a.timeLogged);

      const totalContribTime = allContributors.reduce(
        (s, c) => s + c.timeLogged,
        0,
      );

      const topContrib = allContributors[0] || null;
      const topOverburnContributor = topContrib
        ? {
            name: topContrib.name,
            timeLogged: topContrib.timeLogged,
            isAssignee: topContrib.name === issue.assignee,
            contributionPercentage:
              totalContribTime > 0
                ? Math.round((topContrib.timeLogged / totalContribTime) * 100)
                : 100,
          }
        : null;

      const reason = inferOverburnReason(issue, allContributors.length);

      // Generate actionable fix
      let actionableFix = "Review estimation accuracy for this type of work";
      if (issue.reopenCount > 0)
        actionableFix =
          "Improve QA-dev handoff process to reduce rework cycles";
      else if (allContributors.length > 2)
        actionableFix =
          "Assign single owner to reduce context-switching overhead";
      else if (issue.assigneeChanges > 1)
        actionableFix = "Stabilize task ownership early in the sprint";
      else if (overburnPct > 160)
        actionableFix =
          "Split similar future tasks into smaller estimable units";

      const excessHours = Math.max(0, spent - est);
      const expectedImprovement =
        excessHours > 0
          ? `Save ~${excessHours}h by addressing ${reason.split(",")[0]}`
          : "Reduce overburn risk through better estimation";

      return {
        issue,
        originalEstimate: est,
        timeSpent: spent,
        workratio: wr,
        overburnPercentage: overburnPct,
        severity,
        topOverburnContributor,
        allContributors,
        overburnReason: reason,
        actionableFix,
        expectedImprovement,
      };
    })
    .sort((a, b) => b.overburnPercentage - a.overburnPercentage);

  const moderate = items.filter((i) => i.severity === "Moderate").length;
  const high = items.filter((i) => i.severity === "High").length;
  const critical = items.filter((i) => i.severity === "Critical").length;

  // Cross-issue contributor analysis
  const globalContribMap = new Map<
    string,
    { totalExtra: number; issues: Set<string> }
  >();
  for (const item of items) {
    const excessHours = Math.max(0, item.timeSpent - item.originalEstimate);
    for (const c of item.allContributors) {
      const entry = globalContribMap.get(c.name) || {
        totalExtra: 0,
        issues: new Set<string>(),
      };
      // Proportional excess attribution
      const totalContribTime = item.allContributors.reduce(
        (s, x) => s + x.timeLogged,
        0,
      );
      const proportion =
        totalContribTime > 0 ? c.timeLogged / totalContribTime : 0;
      entry.totalExtra += excessHours * proportion;
      entry.issues.add(item.issue.key);
      globalContribMap.set(c.name, entry);
    }
  }
  const topOverburnContributors = Array.from(globalContribMap.entries())
    .map(([name, data]) => ({
      name,
      totalExtraTimeLogged: Math.round(data.totalExtra * 10) / 10,
      issuesInvolved: data.issues.size,
      risk:
        data.issues.size >= 3
          ? "Repeatedly contributing to overburn — systemic issue"
          : "Isolated overburn",
      recommendation:
        data.issues.size >= 3
          ? `Review workload balance for ${name}; consider pairing or splitting tasks`
          : `Monitor ${name}'s upcoming tasks for estimation accuracy`,
    }))
    .filter((c) => c.totalExtraTimeLogged > 0)
    .sort((a, b) => b.totalExtraTimeLogged - a.totalExtraTimeLogged)
    .slice(0, 10);

  // Assignee vs actual contributor mismatch
  const assigneeMismatches = items
    .filter(
      (i) => i.topOverburnContributor && !i.topOverburnContributor.isAssignee,
    )
    .map((i) => ({
      issueId: i.issue.key,
      assignee: i.issue.assignee,
      actualTopContributor: i.topOverburnContributor!.name,
      insight: `${i.topOverburnContributor!.name} logged ${i.topOverburnContributor!.contributionPercentage}% of effort but is not the assignee — indicates task delegation or rework by others`,
    }));

  // Issue type analysis
  const typeMap = new Map<string, number[]>();
  for (const item of items) {
    const t = item.issue.issueType || "Unknown";
    const arr = typeMap.get(t) || [];
    arr.push(item.overburnPercentage);
    typeMap.set(t, arr);
  }
  const highRiskIssueTypes = Array.from(typeMap.entries())
    .map(([issuetype, pcts]) => ({
      issuetype,
      avgOverburn: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length),
      count: pcts.length,
    }))
    .filter((t) => t.avgOverburn > 130 || t.count >= 3)
    .sort((a, b) => b.avgOverburn - a.avgOverburn)
    .map((t) => ({
      issuetype: t.issuetype,
      reason: `${t.count} issues with avg ${t.avgOverburn}% overburn — high estimation risk`,
    }));

  // Priority analysis
  const prioMap = new Map<string, number[]>();
  for (const item of items) {
    const p = item.issue.priority;
    const arr = prioMap.get(p) || [];
    arr.push(item.overburnPercentage);
    prioMap.set(p, arr);
  }
  const priorityBasedOverburn = Array.from(prioMap.entries()).map(
    ([priority, pcts]) => ({
      priority,
      observation: `${pcts.length} overburnt issues (avg ${Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length)}%) — ${pcts.length > 2 ? "pattern suggests priority-level estimation gap" : "isolated cases"}`,
    }),
  );

  // Cycle time flags — issues with excessive status transitions or long resolution
  const cycleTimeFlags = items
    .filter(
      (i) => i.issue.statusChanges.length > 6 || i.overburnPercentage > 160,
    )
    .map((i) => ({
      issueId: i.issue.key,
      delayReason:
        i.issue.statusChanges.length > 6
          ? `${i.issue.statusChanges.length} status transitions indicate ping-pong or unclear workflow`
          : `${i.overburnPercentage}% overburn suggests scope creep or blocked progress`,
    }))
    .slice(0, 10);

  // Resource optimization
  const resourceTimeMap = new Map<string, number>();
  for (const item of items) {
    for (const c of item.allContributors) {
      resourceTimeMap.set(
        c.name,
        (resourceTimeMap.get(c.name) || 0) + c.timeLogged,
      );
    }
  }
  const allResourceTimes = Array.from(resourceTimeMap.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  const avgTime =
    allResourceTimes.length > 0
      ? allResourceTimes.reduce((s, [, t]) => s + t, 0) /
        allResourceTimes.length
      : 0;

  const overutilized = allResourceTimes
    .filter(([, t]) => t > avgTime * 1.5)
    .map(([name, totalLoggedTime]) => ({
      name,
      totalLoggedTime: Math.round(totalLoggedTime * 10) / 10,
      risk: "Burnout risk — significantly above average workload",
      recommendation: `Redistribute ${Math.round(totalLoggedTime - avgTime)}h of overburnt tasks from ${name}`,
    }));

  const underutilized = allResourceTimes
    .filter(([, t]) => t < avgTime * 0.5 && avgTime > 0)
    .map(([name, t]) => ({
      name,
      utilizationGap: `${Math.round(((avgTime - t) / avgTime) * 100)}% below team average`,
      recommendation: `Assign more overburnt/at-risk items to ${name} to balance team load`,
    }));

  // Executive summary
  const totalExcess = items.reduce(
    (s, i) => s + Math.max(0, i.timeSpent - i.originalEstimate),
    0,
  );
  const executiveSummary =
    items.length === 0
      ? "No overburnt issues found in the selected time range. Team is tracking well on estimates."
      : `${items.length} overburnt issues detected with ${Math.round(totalExcess)}h total excess time. ${critical} critical, ${high} high, ${moderate} moderate severity. ${assigneeMismatches.length > 0 ? `${assigneeMismatches.length} assignee-contributor mismatch(es) found.` : "No assignee mismatches."} ${topOverburnContributors.length > 0 ? `Top overburn contributor: ${topOverburnContributors[0].name} (${topOverburnContributors[0].totalExtraTimeLogged}h excess across ${topOverburnContributors[0].issuesInvolved} issues).` : ""}`;

  // AI recommendation
  let headline = "Improve estimation accuracy to reduce overburn";
  let keyDriver = "underestimation";
  let expectedImpact = `Reduce ~${Math.round(totalExcess * 0.3)}h of excess logged time`;
  let confidence: "High" | "Medium" | "Low" = "Medium";

  const reopenItems = items.filter((i) => i.issue.reopenCount > 0);
  const handoffItems = items.filter((i) => i.issue.assigneeChanges > 1);

  if (reopenItems.length > items.length * 0.3) {
    headline = `Reduce rework cycles to cut overburn by ~${Math.round((reopenItems.length / items.length) * 25)}%`;
    keyDriver = "excessive rework/reopen cycles";
    expectedImpact = `Eliminate ~${Math.round(totalExcess * 0.4)}h of rework-driven excess`;
    confidence = "High";
  } else if (assigneeMismatches.length > items.length * 0.2) {
    headline = `Fix assignee-contributor alignment to save ~${Math.round(totalExcess * 0.25)}h`;
    keyDriver = "task delegation without ownership transfer";
    expectedImpact = `Reduce context-switching overhead across ${assigneeMismatches.length} issues`;
    confidence = "Medium";
  } else if (handoffItems.length > items.length * 0.2) {
    headline = `Stabilize task ownership to reduce multi-handoff overburn by ~${Math.round((handoffItems.length / items.length) * 20)}%`;
    keyDriver = "multiple assignee handoffs";
    expectedImpact = `Save ~${Math.round(totalExcess * 0.3)}h by reducing handoff overhead`;
    confidence = "High";
  } else if (critical > 0) {
    headline = `Address ${critical} critically overburnt items to recover ~${Math.round(totalExcess * 0.5)}h`;
    keyDriver = "critical overburn concentration";
    expectedImpact = `Immediate recovery of ${Math.round(totalExcess * 0.5)}h through targeted fixes`;
    confidence = "High";
  }

  return {
    executiveSummary,
    overburnInsights: {
      totalItems: items.length,
      moderateOverburn: moderate,
      highOverburn: high,
      criticalOverburn: critical,
    },
    items,
    crossIssueAnalysis: {
      topOverburnContributors,
      assigneeVsActualMismatch: assigneeMismatches,
    },
    additionalInsights: {
      highRiskIssueTypes,
      priorityBasedOverburn,
      cycleTimeFlags,
    },
    resourceOptimization: { overutilized, underutilized },
    aiRecommendation: { headline, keyDriver, expectedImpact, confidence },
  };
};

// ─── 6. Flow Impact ──────────────────────────────────────────────────────────

const FUNCTIONAL_KEYWORDS = [
  "login",
  "checkout",
  "payment",
  "order",
  "cart",
  "authentication",
  "api",
  "transaction",
];
const FAILURE_KEYWORDS = [
  "failure",
  "fail",
  "broken",
  "error",
  "500",
  "crash",
  "corrupt",
  "data loss",
  "system",
];
const HIGH_RISK_DOMAINS = ["Checkout", "Payment", "Login"];

export const calculateFlowImpact = (issues: QAIssue[]): FlowImpactItem[] => {
  const active = issues.filter(isActiveIssue);

  return active
    .map((issue) => {
      const text = `${issue.summary} ${issue.description}`.toLowerCase();
      const foundFunctional = FUNCTIONAL_KEYWORDS.filter((k) =>
        text.includes(k),
      );
      const foundFailure = FAILURE_KEYWORDS.filter((k) => text.includes(k));
      const keywords = [...foundFunctional, ...foundFailure];

      const domain = issue.module;
      const isHighRiskDomain = HIGH_RISK_DOMAINS.includes(domain);
      const isHighPriority =
        issue.priority === "Critical" || issue.priority === "Blocker";
      const hasFailureKeyword = foundFailure.length > 0;
      const hasFunctionalKeyword = foundFunctional.length > 0;

      let sprintRisk: RiskLevel = "NONE";
      if (isHighPriority && isHighRiskDomain) sprintRisk = "HIGH";
      else if (isHighPriority || (isHighRiskDomain && hasFailureKeyword))
        sprintRisk = "MEDIUM";
      else if (hasFunctionalKeyword) sprintRisk = "LOW";

      let releaseImpact: RiskLevel = "NONE";
      if (isHighPriority && hasFailureKeyword) releaseImpact = "HIGH";
      else if (isHighPriority || (hasFailureKeyword && isHighRiskDomain))
        releaseImpact = "MEDIUM";
      else if (hasFunctionalKeyword) releaseImpact = "LOW";

      const riskOrder: RiskLevel[] = ["HIGH", "MEDIUM", "LOW", "NONE"];
      const overallRisk =
        riskOrder[
          Math.min(
            riskOrder.indexOf(sprintRisk),
            riskOrder.indexOf(releaseImpact),
          )
        ];

      return {
        issue,
        keywords,
        domain,
        sprintRisk,
        releaseImpact,
        overallRisk,
      };
    })
    .filter((item) => item.overallRisk !== "NONE")
    .sort((a, b) => {
      const order = ["HIGH", "MEDIUM", "LOW", "NONE"];
      return order.indexOf(a.overallRisk) - order.indexOf(b.overallRisk);
    });
};

// ─── 7. AI Recommendations ──────────────────────────────────────────────────

export const generateAIRecommendations = (
  issues: QAIssue[],
  topStories: TopStory[],
  ageingItems: AgeingItem[],
): AIRecommendation[] => {
  const recommendations: AIRecommendation[] = [];

  // Rec 1: Story with most bugs
  if (topStories[0]) {
    const story = topStories[0];
    const criticalRatio = story.criticalCount / Math.max(story.bugCount, 1);
    const impactPercent = Math.min(
      95,
      Math.round(10 + story.bugCount * 2 + criticalRatio * 30),
    );
    recommendations.push({
      id: "rec-1",
      title: `Fix ${story.bugCount} bugs in "${story.storyTitle}"`,
      description: `${story.storyKey} has the highest bug density with ${story.criticalCount} critical/blocker issues. Resolving these will significantly reduce overall severity score.`,
      bugCount: story.bugCount,
      storyName: story.storyTitle,
      impactPercent,
      priority: criticalRatio > 0.3 ? "Critical" : "High",
      action: "Schedule dedicated bug-bash session and assign 2 senior QAs",
      category: "Bug Density",
    });
  }

  // Rec 2: SLA-breached aged issues
  const aged = ageingItems.filter((a) => a.ageingStatus === "AGED");
  if (aged.length > 0) {
    const topAged = aged[0];
    const impactPercent = Math.min(90, 15 + aged.length * 5);
    recommendations.push({
      id: "rec-2",
      title: `Escalate ${aged.length} AGED critical issues immediately`,
      description: `${aged.length} critical/blocker issues have breached SLA. "${topAged.issue.summary}" has been open ${topAged.hoursElapsed}h (SLA: ${topAged.slaHours}h).`,
      bugCount: aged.length,
      storyName: topAged.issue.storyTitle || topAged.issue.module,
      impactPercent,
      priority: "Critical",
      action: "Escalate to engineering lead. Enforce 24h resolution SLA",
      category: "SLA Breach",
    });
  }

  // Rec 3: Overburnt / reopen drain
  const activeIssues = issues.filter(isActiveIssue);
  const highReopenIssues = activeIssues.filter((i) => i.reopenCount >= 2);
  if (highReopenIssues.length > 0) {
    const topModule = highReopenIssues[0].module;
    const impactPercent = Math.min(85, 12 + highReopenIssues.length * 6);
    recommendations.push({
      id: "rec-3",
      title: `Reduce reopen cycle: ${highReopenIssues.length} issues reopened 2+ times`,
      description: `Multiple issues in "${topModule}" have been reopened repeatedly, indicating incomplete root cause analysis or inadequate test coverage.`,
      bugCount: highReopenIssues.length,
      storyName: topModule,
      impactPercent,
      priority: "High",
      action:
        "Mandate root-cause documentation before closing. Add regression test cases",
      category: "Reopen Rate",
    });
  }

  return recommendations.slice(0, 3);
};

// ─── 8. Early Completions ───────────────────────────────────────────────────

export const calculateEarlyCompletions = (
  issues: QAIssue[],
): EarlyCompletionAnalysis => {
  // STRICT: Only issues with Status = Done
  const doneIssues = issues.filter(
    (i) =>
      i.originalStatus?.toLowerCase() === "done" ||
      i.status === "Resolved" ||
      i.status === "Closed",
  );

  // STRICT: Exclude issues where Original Estimate is missing or zero
  const withEstimate = doneIssues.filter(
    (i) => i.timeEstimate > 0 && i.resolved,
  );

  // STRICT: Exclude issues where Time Spent (Time Tracking) = 0
  const validIssues = withEstimate.filter((i) => (i.timeLogged || 0) > 0);

  const earlyItems: EarlyCompletionItem[] = [];

  for (const issue of validIssues) {
    const originalEstimateSeconds = issue.timeEstimate;
    const timeSpentSeconds = issue.timeLogged || 0;
    const originalEstimateHours =
      Math.round((originalEstimateSeconds / 3600) * 100) / 100;
    const timeTakenHours = Math.round((timeSpentSeconds / 3600) * 100) / 100;

    // Difference % = ((Original Estimate - Time Spent) / Original Estimate) * 100
    const differencePercent =
      Math.round(
        ((originalEstimateHours - timeTakenHours) / originalEstimateHours) *
          10000,
      ) / 100;

    const timeSavedHours =
      Math.round((originalEstimateHours - timeTakenHours) * 100) / 100;

    // If Difference % >= 20% → Early Completed
    if (differencePercent >= 20) {
      earlyItems.push({
        issue,
        createdDate: issue.created,
        resolutionDate: issue.resolved!,
        originalEstimateHours,
        timeTakenHours,
        timeSavedHours,
        differencePercent,
      });
    }
  }

  // Sort by differencePercent descending (most efficient first)
  earlyItems.sort((a, b) => b.differencePercent - a.differencePercent);

  const totalEarlyItems = earlyItems.length;
  const totalDoneItems = validIssues.length;
  const totalIssuesAnalyzed = doneIssues.length;
  const avgTimeSavedHours =
    totalEarlyItems > 0
      ? Math.round(
          (earlyItems.reduce((s, i) => s + i.timeSavedHours, 0) /
            totalEarlyItems) *
            100,
        ) / 100
      : 0;
  const avgPercentSaved =
    totalEarlyItems > 0
      ? Math.round(
          (earlyItems.reduce((s, i) => s + i.differencePercent, 0) /
            totalEarlyItems) *
            100,
        ) / 100
      : 0;
  const earlyCompletionPercentage =
    totalDoneItems > 0
      ? Math.round((totalEarlyItems / totalDoneItems) * 10000) / 100
      : 0;

  return {
    items: earlyItems,
    totalEarlyItems,
    totalDoneItems,
    totalIssuesAnalyzed,
    avgTimeSavedHours,
    avgPercentSaved,
    earlyCompletionPercentage,
  };
};

// ── Code Intelligence Analysis ──────────────────────────────────────────────
export const calculateCodeIntelligence = (
  issues: CodeIntelIssue[],
): CodeIntelAnalysis => {
  // ONLY consider Stories and Epics
  const filtered = issues.filter((i) => {
    const t = i.issueType.toLowerCase();
    return t === "story" || t === "epic";
  });
  const totalCommits = filtered.reduce((s, i) => s + i.commits.length, 0);
  const totalPRs = filtered.reduce((s, i) => s + i.pullRequests.length, 0);
  const hasDevInfo = totalCommits > 0 || totalPRs > 0;

  // ── Page/Module Categories ──
  const PAGE_CATEGORIES: Record<string, string[]> = {
    "Home Page": [
      "home",
      "homepage",
      "landing",
      "banner",
      "hero",
      "carousel",
      "slider",
      "featured",
    ],
    PLP: [
      "plp",
      "product list",
      "listing",
      "category",
      "catalog",
      "collection",
      "browse",
      "filter",
      "sort",
      "facet",
      "search result",
    ],
    PDP: [
      "pdp",
      "product detail",
      "product page",
      "product view",
      "product info",
      "size guide",
      "product image",
      "zoom",
      "swatch",
      "variant",
    ],
    Cart: [
      "cart",
      "add to cart",
      "minicart",
      "mini-cart",
      "bag",
      "shopping bag",
      "basket",
      "cart item",
      "quantity",
    ],
    Checkout: [
      "checkout",
      "shipping",
      "delivery",
      "address",
      "order summary",
      "order review",
      "place order",
      "guest checkout",
    ],
    Payment: [
      "payment",
      "pay",
      "credit card",
      "debit",
      "wallet",
      "upi",
      "cod",
      "cash on delivery",
      "razorpay",
      "stripe",
      "transaction",
      "refund",
    ],
    Authentication: [
      "login",
      "signup",
      "sign up",
      "register",
      "forgot password",
      "reset password",
      "otp",
      "auth",
      "sso",
      "session",
    ],
    "My Account": [
      "my account",
      "profile",
      "order history",
      "wishlist",
      "saved",
      "address book",
      "account settings",
      "loyalty",
      "rewards",
    ],
    Navigation: [
      "header",
      "footer",
      "menu",
      "navigation",
      "navbar",
      "breadcrumb",
      "sidebar",
      "mega menu",
    ],
    Search: [
      "search",
      "autocomplete",
      "typeahead",
      "search suggest",
      "search bar",
      "search result",
    ],
    "API / Backend": [
      "api",
      "endpoint",
      "backend",
      "server",
      "middleware",
      "service",
      "graphql",
      "rest",
      "webhook",
    ],
    Performance: [
      "performance",
      "speed",
      "load time",
      "cache",
      "cdn",
      "lazy load",
      "optimize",
      "lighthouse",
    ],
    Notifications: [
      "notification",
      "email",
      "sms",
      "push notification",
      "alert",
      "toast",
    ],
    "Admin / CMS": [
      "admin",
      "cms",
      "dashboard",
      "manage",
      "configuration",
      "settings",
    ],
  };

  function classifyIssueToPage(issue: CodeIntelIssue): string {
    const text =
      `${issue.summary} ${issue.description} ${issue.labels.join(" ")} ${issue.components.join(" ")}`.toLowerCase();
    let bestMatch = "";
    let bestScore = 0;
    for (const [page, keywords] of Object.entries(PAGE_CATEGORIES)) {
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) score += kw.split(" ").length; // multi-word matches score higher
      }
      // Also check components directly
      for (const comp of issue.components) {
        const cl = comp.toLowerCase();
        for (const kw of keywords) {
          if (cl.includes(kw) || kw.includes(cl)) score += 3;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = page;
      }
    }
    return bestMatch || issue.components[0] || issue.labels[0] || "General";
  }

  // ── 1. Classify all issues by page ──
  const issuesByPage = new Map<string, CodeIntelIssue[]>();
  for (const issue of filtered) {
    const page = classifyIssueToPage(issue);
    if (!issuesByPage.has(page)) issuesByPage.set(page, []);
    issuesByPage.get(page)!.push(issue);
  }

  // ── 2. Build keyword, file, and developer maps ──
  const devCommitMap = new Map<
    string,
    {
      commits: string[];
      issues: Set<string>;
      files: Set<string>;
      areas: Set<string>;
    }
  >();

  for (const issue of filtered) {
    const page = classifyIssueToPage(issue);
    for (const c of issue.commits) {
      const dev = c.author || issue.assignee;
      if (!devCommitMap.has(dev))
        devCommitMap.set(dev, {
          commits: [],
          issues: new Set(),
          files: new Set(),
          areas: new Set(),
        });
      const d = devCommitMap.get(dev)!;
      d.commits.push(c.id);
      d.issues.add(issue.issueKey);
      d.areas.add(page);
      c.files.forEach((f) => d.files.add(f));
    }
    if (
      issue.commits.length === 0 &&
      issue.assignee &&
      issue.assignee !== "Unassigned"
    ) {
      if (!devCommitMap.has(issue.assignee))
        devCommitMap.set(issue.assignee, {
          commits: [],
          issues: new Set(),
          files: new Set(),
          areas: new Set(),
        });
      const d = devCommitMap.get(issue.assignee)!;
      d.issues.add(issue.issueKey);
      d.areas.add(page);
    }
  }

  // ── 3. Reusable components grouped by page/module ──
  const reusableByPage: Record<string, ReusableComponent[]> = {};

  for (const [page, pageIssues] of issuesByPage) {
    if (pageIssues.length < 1) continue;
    const components: ReusableComponent[] = [];

    // File-based reuse within this page
    const fileMap = new Map<string, Set<string>>();
    for (const issue of pageIssues) {
      for (const c of issue.commits) {
        for (const f of c.files) {
          const dir = f.split("/").slice(0, -1).join("/") || f;
          if (!fileMap.has(dir)) fileMap.set(dir, new Set());
          fileMap.get(dir)!.add(issue.issueKey);
        }
      }
    }
    for (const [dir, issueKeys] of fileMap) {
      if (issueKeys.size >= 2) {
        const relIssues = Array.from(issueKeys);
        const commits = pageIssues
          .filter((i) => issueKeys.has(i.issueKey))
          .flatMap((i) => i.commits)
          .filter((c) => c.files.some((f) => f.startsWith(dir)))
          .slice(0, 5);
        components.push({
          componentName: dir.split("/").pop() || dir,
          description: `Shared code path: ${dir} — modified across ${issueKeys.size} issues in ${page}`,
          relatedIssues: relIssues,
          relevantCommits: commits.map((c) => ({
            commitId: c.id,
            githubUrl: c.url,
            url: c.url,
            summary: c.message.substring(0, 80),
          })),
          reusabilityScore:
            issueKeys.size >= 4
              ? "High"
              : issueKeys.size >= 3
                ? "Medium"
                : "Low",
          recommendedUsage: `Extract reusable logic from ${dir} into a shared ${page} module`,
        });
      }
    }

    // Keyword-based reuse within this page
    const keywordMap = new Map<string, Set<string>>();
    for (const issue of pageIssues) {
      const tokens = extractKeywords(issue);
      for (const token of tokens) {
        if (!keywordMap.has(token)) keywordMap.set(token, new Set());
        keywordMap.get(token)!.add(issue.issueKey);
      }
    }
    const processedKw = new Set<string>();
    for (const [keyword, issueKeys] of keywordMap) {
      if (issueKeys.size >= 2 && !processedKw.has(keyword)) {
        processedKw.add(keyword);
        const relIssues = Array.from(issueKeys);
        const commits = pageIssues
          .filter((i) => issueKeys.has(i.issueKey))
          .flatMap((i) => i.commits)
          .slice(0, 3);
        components.push({
          componentName: keyword,
          description: `"${keyword}" functionality appears in ${issueKeys.size} issues within ${page}`,
          relatedIssues: relIssues,
          relevantCommits: commits.map((c) => ({
            commitId: c.id,
            githubUrl: c.url,
            url: c.url,
            summary: c.message.substring(0, 80),
          })),
          reusabilityScore:
            issueKeys.size >= 4
              ? "High"
              : issueKeys.size >= 3
                ? "Medium"
                : "Low",
          recommendedUsage: `Consolidate "${keyword}" implementations into a reusable ${page} service`,
        });
      }
    }

    // If no file/keyword overlap but multiple issues, create a page-level component
    if (components.length === 0 && pageIssues.length >= 2) {
      const allCommits = pageIssues.flatMap((i) => i.commits).slice(0, 5);
      components.push({
        componentName: `${page} Module`,
        description: `${pageIssues.length} issues touch the ${page} area — consider shared patterns`,
        relatedIssues: pageIssues.map((i) => i.issueKey).slice(0, 10),
        relevantCommits: allCommits.map((c) => ({
          commitId: c.id,
          githubUrl: c.url,
          url: c.url,
          summary: c.message.substring(0, 80),
        })),
        reusabilityScore: pageIssues.length >= 5 ? "High" : "Medium",
        recommendedUsage: `Review ${page} area for shared component extraction opportunities`,
      });
    }

    components.sort(
      (a, b) =>
        (b.reusabilityScore === "High"
          ? 3
          : b.reusabilityScore === "Medium"
            ? 2
            : 1) -
        (a.reusabilityScore === "High"
          ? 3
          : a.reusabilityScore === "Medium"
            ? 2
            : 1),
    );

    if (components.length > 0) {
      reusableByPage[page] = components.slice(0, 10);
    }
  }

  const totalReusableCount = Object.values(reusableByPage).reduce(
    (s, arr) => s + arr.length,
    0,
  );

  // ── 4. Recent implementations ──
  const recentImplementations: RecentImplementation[] = [];
  for (const issue of filtered.slice(0, 30)) {
    const page = classifyIssueToPage(issue);
    if (issue.commits.length > 0) {
      const latestCommit = issue.commits[0];
      recentImplementations.push({
        featureArea: page,
        issueId: issue.issueKey,
        issueType: issue.issueType,
        commitId: latestCommit.id,
        url: latestCommit.url,
        description: issue.summary,
        filesImpacted: [
          ...new Set(issue.commits.flatMap((c) => c.files)),
        ].slice(0, 10),
      });
    } else {
      recentImplementations.push({
        featureArea: page,
        issueId: issue.issueKey,
        issueType: issue.issueType,
        commitId: "",
        url: "",
        description: issue.summary,
        filesImpacted: [],
      });
    }
  }

  // ── 5. Duplicate / overlap detection ──
  const duplicateDetection: DuplicateDetection[] = [];
  // Summary similarity
  const issuesBySummary = new Map<
    string,
    { keys: string[]; types: string[] }
  >();
  for (const issue of filtered) {
    const normalized = issue.summary
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .split(" ")
      .filter((w) => w.length > 3)
      .sort()
      .join(" ");
    const key = normalized.substring(0, 60);
    if (!issuesBySummary.has(key))
      issuesBySummary.set(key, { keys: [], types: [] });
    const entry = issuesBySummary.get(key)!;
    entry.keys.push(issue.issueKey);
    entry.types.push(issue.issueType);
  }
  for (const [, { keys, types }] of issuesBySummary) {
    if (keys.length >= 2) {
      duplicateDetection.push({
        issueIds: keys,
        issueTypes: types,
        similarityReason:
          "Similar summary text — likely duplicate or overlapping Story/Epic",
        risk:
          keys.length >= 3
            ? "High — significant wasted effort across multiple Stories/Epics"
            : "Medium — potential redundancy",
        recommendation: `Review ${keys.join(", ")} for consolidation or deduplication`,
      });
    }
  }
  // Component concentration
  const componentIssues = new Map<
    string,
    { keys: string[]; types: string[] }
  >();
  for (const issue of filtered) {
    for (const comp of issue.components) {
      if (!componentIssues.has(comp))
        componentIssues.set(comp, { keys: [], types: [] });
      const e = componentIssues.get(comp)!;
      e.keys.push(issue.issueKey);
      e.types.push(issue.issueType);
    }
  }
  for (const [comp, { keys, types }] of componentIssues) {
    if (keys.length >= 5) {
      duplicateDetection.push({
        issueIds: keys.slice(0, 6),
        issueTypes: types.slice(0, 6),
        similarityReason: `${keys.length} Stories/Epics touch component "${comp}" — possible overlap or shared implementation`,
        risk: "Medium — high concentration suggests shared root cause",
        recommendation: `Investigate "${comp}" for shared services, refactoring opportunities, or design improvements`,
      });
    }
  }
  // Cross-page overlap (same files modified in different page areas)
  const fileToPages = new Map<string, Set<string>>();
  for (const issue of filtered) {
    const page = classifyIssueToPage(issue);
    for (const c of issue.commits) {
      for (const f of c.files) {
        if (!fileToPages.has(f)) fileToPages.set(f, new Set());
        fileToPages.get(f)!.add(page);
      }
    }
  }
  for (const [file, pages] of fileToPages) {
    if (pages.size >= 3) {
      duplicateDetection.push({
        issueIds: Array.from(pages),
        issueTypes: [],
        similarityReason: `File "${file.split("/").pop()}" modified across ${pages.size} page areas (${Array.from(pages).join(", ")}) — cross-cutting concern`,
        risk: "Medium — shared file changes create coupling risk",
        recommendation: `Consider extracting shared logic from this file into a dedicated utility or service`,
      });
    }
  }

  // ── 6. Developer insights ──
  const developerInsights: DeveloperInsight[] = [];
  for (const [dev, info] of devCommitMap) {
    if (dev === "Unassigned") continue;
    const expertiseAreas = Array.from(info.areas).slice(0, 4);
    // Also include file-level areas
    const fileDirs = new Set<string>();
    for (const f of info.files) {
      const parts = f.split("/");
      if (parts.length >= 2) fileDirs.add(parts.slice(0, 2).join("/"));
    }
    const allAreas = [...expertiseAreas, ...Array.from(fileDirs).slice(0, 2)];
    const uniqueAreas = [...new Set(allAreas)].slice(0, 4);

    developerInsights.push({
      developer: dev,
      expertiseArea: uniqueAreas.join(", ") || "General",
      notableCommits: info.commits.slice(0, 5),
      recommendation:
        info.issues.size >= 5
          ? `${dev} is a key contributor across ${info.issues.size} issues (${expertiseAreas.join(", ")}). Ensure knowledge sharing to reduce bus factor.`
          : info.commits.length > 0
            ? `${dev} contributed ${info.commits.length} commits across ${info.issues.size} issue(s). Consider pairing in ${expertiseAreas[0] || "relevant area"} for skill growth.`
            : `${dev} assigned to ${info.issues.size} issue(s) with no linked commits. Verify commit linking for traceability.`,
    });
  }
  developerInsights.sort(
    (a, b) => b.notableCommits.length - a.notableCommits.length,
  );

  // ── 7. AI recommendations ──
  const aiRecommendations: CodeIntelRecommendation[] = [];
  // Top reusable module recommendation
  const allReusable = Object.entries(reusableByPage).flatMap(([page, comps]) =>
    comps.map((c) => ({ ...c, page })),
  );
  const highReusable = allReusable.filter((c) => c.reusabilityScore === "High");
  if (highReusable.length > 0) {
    const top = highReusable[0];
    aiRecommendations.push({
      headline: `Reuse "${top.componentName}" in ${top.page} to reduce dev effort by ~${Math.min(35, top.relatedIssues.length * 8)}%`,
      component: `${top.page} / ${top.componentName}`,
      mappedModule: top.page,
      action: top.recommendedUsage,
      expectedBenefit: `Eliminates redundancy across ${top.relatedIssues.length} Stories/Epics in ${top.page}`,
    });
  }
  if (duplicateDetection.length > 0) {
    aiRecommendations.push({
      headline: `${duplicateDetection.length} duplicate/overlap clusters detected — consolidate to save effort`,
      component: "Cross-cutting",
      mappedModule: "Cross-cutting",
      action:
        "Review flagged Story/Epic clusters and deduplicate overlapping implementations",
      expectedBenefit: `Reduce wasted effort across ${duplicateDetection.reduce((s, d) => s + d.issueIds.length, 0)} related items`,
    });
  }
  // Page with most issues — architectural concern
  const sortedPages = [...issuesByPage.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );
  if (sortedPages.length > 0 && sortedPages[0][1].length >= 5) {
    const [topPage, topPageIssues] = sortedPages[0];
    aiRecommendations.push({
      headline: `${topPage} has ${topPageIssues.length} resolved Stories/Epics — review for architectural stability`,
      component: topPage,
      mappedModule: topPage,
      action: `Perform a focused code review on ${topPage} area to identify structural improvements`,
      expectedBenefit: `Reduce future defect rate in ${topPage} by proactive refactoring`,
    });
  }
  if (developerInsights.length > 0) {
    const topDev = developerInsights[0];
    if (topDev.notableCommits.length >= 3) {
      aiRecommendations.push({
        headline: `Distribute knowledge from ${topDev.developer} — single-point-of-failure risk`,
        component: topDev.expertiseArea,
        mappedModule: topDev.expertiseArea.split(", ")[0] || "General",
        action: "Schedule pair programming or knowledge sharing sessions",
        expectedBenefit: "Reduce bus factor and improve team resilience",
      });
    }
  }
  if (!hasDevInfo) {
    aiRecommendations.push({
      headline: "Enable GitHub integration for file-level commit analysis",
      component: "DevOps",
      mappedModule: "DevOps",
      action:
        "Link GitHub repositories to Jira via Development panel or Jira app",
      expectedBenefit:
        "Unlock file-level reusability analysis, commit tracking, and PR insights",
    });
  }

  // ── Executive summary ──
  const pageNames = [...issuesByPage.keys()];
  const summaryParts: string[] = [];
  summaryParts.push(
    `Analyzed ${filtered.length} recently resolved Stories & Epics across ${pageNames.length} page/module areas with ${totalCommits} linked commits and ${totalPRs} PRs.`,
  );
  if (totalReusableCount > 0)
    summaryParts.push(
      `Identified ${totalReusableCount} reusable components across ${Object.keys(reusableByPage).length} modules (${Object.keys(reusableByPage).slice(0, 4).join(", ")}).`,
    );
  if (duplicateDetection.length > 0)
    summaryParts.push(
      `Detected ${duplicateDetection.length} overlap/duplication clusters requiring review.`,
    );
  if (highReusable.length > 0)
    summaryParts.push(
      `${highReusable.length} high-reusability components found — prioritize extraction to reduce future development effort.`,
    );
  if (!hasDevInfo)
    summaryParts.push(
      "No GitHub commit data available — analysis based on Jira metadata only. Link GitHub for richer insights.",
    );

  return {
    executiveSummary: summaryParts.join(" "),
    reusableComponents: reusableByPage,
    recentImplementations: recentImplementations.slice(0, 30),
    duplicateDetection: duplicateDetection.slice(0, 15),
    aiRecommendations,
    developerInsights: developerInsights.slice(0, 20),
    totalIssuesAnalyzed: filtered.length,
    totalCommits,
    totalPRs,
    hasDevInfo,
    totalReusableCount,
  };
};

function extractKeywords(issue: CodeIntelIssue): string[] {
  const text = `${issue.summary} ${issue.description}`.toLowerCase();
  const words = text
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const stopWords = new Set([
    "should",
    "would",
    "could",
    "about",
    "their",
    "there",
    "which",
    "where",
    "being",
    "after",
    "before",
    "while",
    "these",
    "those",
    "other",
    "shall",
    "issue",
    "please",
    "update",
    "added",
    "fixed",
  ]);
  const keywords = [
    ...words.filter((w) => !stopWords.has(w)),
    ...issue.labels.map((l) => l.toLowerCase()),
    ...issue.components.map((c) => c.toLowerCase()),
  ];
  return [...new Set(keywords)];
}

function inferArea(summary: string): string {
  const lower = summary.toLowerCase();
  const areas = [
    "auth",
    "login",
    "search",
    "payment",
    "checkout",
    "api",
    "database",
    "ui",
    "frontend",
    "backend",
    "notification",
    "email",
    "report",
    "dashboard",
    "admin",
    "user",
    "config",
    "setting",
    "upload",
    "import",
    "export",
    "integration",
    "sync",
    "cache",
    "performance",
    "security",
  ];
  return areas.find((a) => lower.includes(a)) || "General";
}
