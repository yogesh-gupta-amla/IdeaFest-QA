import type {
  QAIssue,
  ProjectHealthResult,
  AgeingItem,
  AgeingStatus,
  TopStory,
  BugLeakageItem,
  OverburntItem,
  FlowImpactItem,
  AIRecommendation,
  TrendPoint,
  SeverityBucket,
  DashboardFilters,
  RiskLevel,
} from "../types/qa";

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
): ProjectHealthResult => {
  const active = issues.filter(isActiveIssue);
  const total = active.length;
  const criticalBlockerCount = active.filter(
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

  // Use recentlyResolved (last 7d) for closure rate if provided
  const resolvedInLast7d = recentlyResolved
    ? recentlyResolved.length
    : issues.filter((i) => {
        if (!i.resolved) return false;
        return hoursSince(i.resolved) < 168;
      }).length;
  const createdInLast7d = issues.filter(
    (i) => hoursSince(i.created) < 168,
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

  // Defect trend (last 7 days) — combine open issues + recently resolved
  const allIssuesForTrend = recentlyResolved
    ? [...issues, ...recentlyResolved]
    : issues;
  const defectTrend: TrendPoint[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const date = day.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const dayMs = day.getTime();
    day.setHours(0, 0, 0, 0);
    const dayStart = day.getTime();
    const nextMs = dayStart + 86400000;
    const created = allIssuesForTrend.filter((iss) => {
      const t = new Date(iss.created).getTime();
      return t >= dayStart && t < nextMs;
    }).length;
    const resolved = allIssuesForTrend.filter((iss) => {
      if (!iss.resolved) return false;
      const t = new Date(iss.resolved).getTime();
      return t >= dayStart && t < nextMs;
    }).length;
    const open = allIssuesForTrend.filter((iss) => {
      return new Date(iss.created).getTime() <= nextMs && isActiveIssue(iss);
    }).length;
    return { date, created, resolved, open };
  });

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

export const calculateAgeingItems = (issues: QAIssue[]): AgeingItem[] => {
  const active = issues.filter(
    (i) =>
      isActiveIssue(i) &&
      (i.priority === "Critical" || i.priority === "Blocker"),
  );

  return active
    .map((issue) => {
      const hoursElapsed = hoursSince(issue.created);
      const { slaHours } = issue;
      const slaRatio = hoursElapsed / slaHours;

      let ageingStatus: AgeingStatus;
      if (slaRatio < 0.6) ageingStatus = "FRESH";
      else if (slaRatio < 1.0) ageingStatus = "AT_RISK";
      else ageingStatus = "AGED";

      // 48-hour override: if >48h and still Open → escalate regardless
      const isEscalated = hoursElapsed > 48 && issue.status === "Open";
      if (isEscalated && ageingStatus === "FRESH") ageingStatus = "AT_RISK";

      let riskScore = slaRatio * 50;
      if (HIGH_RISK_MODULES.includes(issue.module)) riskScore += 20;
      if (PROD_ENVIRONMENTS.includes(issue.environment)) riskScore += 20;
      if (issue.reopenCount > 0) riskScore += issue.reopenCount * 5;
      if (issue.statusChanges.length <= 1 && hoursElapsed > 24) riskScore += 10; // stagnation

      return {
        issue,
        hoursElapsed,
        slaHours,
        ageingStatus,
        isEscalated,
        riskScore: Math.min(100, Math.round(riskScore)),
        slaBreach: hoursElapsed > slaHours,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
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
      reasons.push(
        `${issue.statusChanges.length} status changes (threshold: 5)`,
      );
      score += 20;
    }
    if (issue.reopenCount > 0) {
      reasons.push(`Reopened ${issue.reopenCount} time(s)`);
      score += issue.reopenCount * 15;
    }
    if (issue.commentsCount > 10) {
      reasons.push(`${issue.commentsCount} comments (threshold: 10)`);
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
