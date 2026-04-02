import type { JiraIssue, Metrics } from "../types";
import type {
  AIConfidence,
  AIImmediateAction,
  AIOptimizationTip,
  AIProjectAnalysis,
  AIPrioritizedFix,
  AIRiskPrediction,
  AIStoryWithMaxBugsInsight,
  AIResourceOptimizationRecommendation,
  AIOverutilizedResource,
  AIUnderutilizedResource,
} from "../types/qa";
import { getTimeRangeLabel, type QueryTimeRange } from "./queryTimeRange";

interface AIAnalysisInput {
  projectKey: string;
  projectName: string;
  sprintName?: string;
  timeRange: QueryTimeRange;
  metrics: Metrics;
  openIssues: JiraIssue[];
  recentlyResolved: JiraIssue[];
}

interface StoryBucket {
  storyId: string;
  storyName: string;
  issues: JiraIssue[];
  highSeverityCount: number;
  reopenedCount: number;
}

const HIGH_SEVERITY = new Set(["blocker", "highest", "critical"]);
const STORY_TYPES = new Set(["story", "task", "epic"]);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const toHours = (from: string, to?: string | null): number => {
  if (!from || !to) return 0;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return diff > 0 ? diff / (1000 * 60 * 60) : 0;
};

const isBugIssue = (issue: JiraIssue): boolean => {
  const issueType = (issue.issueType || "").toLowerCase();
  return issueType === "bug" || issueType === "defect";
};

const isResolvedIssue = (issue: JiraIssue): boolean => {
  const status = (issue.status || "").toLowerCase();
  const resolution = (issue.resolution || "").toLowerCase();
  return (
    Boolean(issue.resolved) ||
    ["done", "closed", "resolved", "complete"].some(
      (token) => status.includes(token) || resolution.includes(token),
    )
  );
};

const normalizePriority = (priority: string): string => priority.toLowerCase();

const formatPercent = (value: number): string => `${Math.round(value)}%`;

const buildStoryKey = (
  issue: JiraIssue,
): { storyId: string; storyName: string } => {
  if (issue.epic) {
    return {
      storyId: issue.epic,
      storyName: issue.epicName || issue.epic,
    };
  }

  if (issue.components && issue.components.length > 0) {
    return {
      storyId: issue.components[0],
      storyName: issue.components[0],
    };
  }

  return {
    storyId: issue.key,
    storyName: issue.summary || issue.key,
  };
};

const uniqueIssues = (...groups: JiraIssue[][]): JiraIssue[] => {
  const byKey = new Map<string, JiraIssue>();
  groups.flat().forEach((issue) => {
    if (issue?.key && !byKey.has(issue.key)) {
      byKey.set(issue.key, issue);
    }
  });
  return Array.from(byKey.values());
};

const inferRootCause = (bucket: StoryBucket): string => {
  const commentHeavy = bucket.issues.filter(
    (issue) => (issue.commentsCount || 0) >= 6,
  ).length;
  const missingEstimate = bucket.issues.filter(
    (issue) => !issue.storyPoints && !issue.timeEstimate,
  ).length;

  if (bucket.reopenedCount >= 2) {
    return "Repeated reopen cycles indicate incomplete root-cause correction and weak regression coverage.";
  }
  if (bucket.highSeverityCount >= 2) {
    return "High-severity defects are concentrated in one delivery stream, which points to unstable implementation or weak pre-QA checks.";
  }
  if (commentHeavy >= 2) {
    return "High comment traffic suggests unclear acceptance behavior and too many handoffs before closure.";
  }
  if (missingEstimate >= Math.ceil(bucket.issues.length / 2)) {
    return "Low planning fidelity is hiding the effort and test depth needed for this work area.";
  }
  return "Defects are clustering in the same scope, which usually signals test coverage gaps or unresolved upstream design issues.";
};

const getConfidence = (
  sampleSize: number,
  strongSignals: number,
): AIConfidence => {
  if (sampleSize >= 12 || strongSignals >= 3) return "High";
  if (sampleSize >= 5 || strongSignals >= 1) return "Medium";
  return "Low";
};

const buildResourceSuggestions = (
  openIssues: JiraIssue[],
): {
  overutilizedResources: AIOverutilizedResource[];
  underutilizedResources: AIUnderutilizedResource[];
  imbalanceRatio: number;
} => {
  const counts = new Map<string, number>();

  openIssues.forEach((issue) => {
    const assignee = issue.assignee || "Unassigned";
    if (assignee === "Unassigned") return;
    counts.set(assignee, (counts.get(assignee) || 0) + 1);
  });

  const entries = Array.from(counts.entries()).map(([name, count]) => ({
    name,
    count,
  }));
  const avgLoad = average(entries.map((entry) => entry.count));
  const maxLoad =
    entries.length > 0 ? Math.max(...entries.map((entry) => entry.count)) : 0;
  const imbalanceRatio = avgLoad > 0 ? maxLoad / avgLoad : 1;

  const overutilizedResources = entries
    .map((entry) => ({
      name: entry.name,
      utilizationPercentage:
        avgLoad > 0 ? Math.round((entry.count / avgLoad) * 100) : 0,
      risk: `${entry.count} active items owned, above team average of ${avgLoad.toFixed(1)}.`,
      recommendation:
        "Shift at least one active defect or review queue from this owner in the next sync.",
    }))
    .filter((entry) => entry.utilizationPercentage >= 130)
    .sort(
      (left, right) => right.utilizationPercentage - left.utilizationPercentage,
    )
    .slice(0, 3);

  const underutilizedResources = entries
    .map((entry) => ({
      name: entry.name,
      utilizationPercentage:
        avgLoad > 0 ? Math.round((entry.count / avgLoad) * 100) : 0,
      opportunity: `${entry.count} active items owned, below team average of ${avgLoad.toFixed(1)}.`,
      recommendation:
        "Use this capacity for regression coverage, verification, or backlog burn-down support.",
    }))
    .filter(
      (entry) =>
        entry.utilizationPercentage > 0 && entry.utilizationPercentage <= 70,
    )
    .sort(
      (left, right) => left.utilizationPercentage - right.utilizationPercentage,
    )
    .slice(0, 3);

  return { overutilizedResources, underutilizedResources, imbalanceRatio };
};

const buildStoryInsight = (
  bugIssues: JiraIssue[],
): AIStoryWithMaxBugsInsight | null => {
  if (bugIssues.length === 0) return null;

  const bucketMap = new Map<string, StoryBucket>();
  bugIssues.forEach((issue) => {
    const { storyId, storyName } = buildStoryKey(issue);
    if (!bucketMap.has(storyId)) {
      bucketMap.set(storyId, {
        storyId,
        storyName,
        issues: [],
        highSeverityCount: 0,
        reopenedCount: 0,
      });
    }
    const bucket = bucketMap.get(storyId)!;
    bucket.issues.push(issue);
    if (HIGH_SEVERITY.has(normalizePriority(issue.priority))) {
      bucket.highSeverityCount += 1;
    }
    bucket.reopenedCount += issue.reopenCount || 0;
  });

  const topBucket = Array.from(bucketMap.values()).sort((left, right) => {
    if (right.issues.length !== left.issues.length) {
      return right.issues.length - left.issues.length;
    }
    return right.highSeverityCount - left.highSeverityCount;
  })[0];

  if (!topBucket) return null;

  const impactReduction = clamp(
    8 + topBucket.issues.length * 4 + topBucket.highSeverityCount * 6,
    10,
    35,
  );

  return {
    storyId: topBucket.storyId,
    bugCount: topBucket.issues.length,
    rootCause: inferRootCause(topBucket),
    recommendation: `Run focused triage on ${topBucket.storyName}, close the highest-severity defects first, and add regression coverage before the next handoff.`,
    expectedImpact: `Expected health gain ${impactReduction}% if the ${topBucket.issues.length} clustered defects are reduced in this workstream.`,
  };
};

export const generateAIProjectAnalysis = ({
  projectKey,
  projectName,
  sprintName = "",
  timeRange,
  metrics,
  openIssues,
  recentlyResolved,
}: AIAnalysisInput): AIProjectAnalysis => {
  const createdIssues = metrics.todayCreated || [];
  const resolvedIssues = uniqueIssues(
    metrics.todayResolvedIssues || [],
    recentlyResolved,
  ).filter(isResolvedIssue);
  const allIssues = uniqueIssues(openIssues, createdIssues, resolvedIssues);
  const bugIssues = allIssues.filter(isBugIssue);
  const highSeverityBugs = bugIssues.filter((issue) =>
    HIGH_SEVERITY.has(normalizePriority(issue.priority)),
  );
  const reopenedIssues = allIssues.filter(
    (issue) =>
      (issue.reopenCount || 0) > 0 ||
      (issue.status || "").toLowerCase().includes("reopen"),
  );
  const overdueTasks = openIssues.filter(
    (issue) => issue.dueDate && new Date(issue.dueDate).getTime() < Date.now(),
  );
  const cycleTimeHours = average(
    resolvedIssues
      .map((issue) => toHours(issue.created, issue.resolved))
      .filter((value) => value > 0),
  );
  const leadTimeHours = average(
    allIssues
      .map((issue) => toHours(issue.created, issue.resolved || issue.updated))
      .filter((value) => value > 0),
  );
  const completionRate =
    createdIssues.length > 0
      ? resolvedIssues.length / createdIssues.length
      : resolvedIssues.length > 0
        ? 1
        : 0;
  const sprintVelocity = resolvedIssues
    .filter((issue) => STORY_TYPES.has((issue.issueType || "").toLowerCase()))
    .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
  const backlogDelta = createdIssues.length - resolvedIssues.length;
  const storyInsight = buildStoryInsight(bugIssues);
  const { overutilizedResources, underutilizedResources, imbalanceRatio } =
    buildResourceSuggestions(openIssues);
  const highSeverityRatio =
    bugIssues.length > 0 ? highSeverityBugs.length / bugIssues.length : 0;

  let score = 92;
  if (highSeverityRatio > 0.4) score -= 18;
  else if (highSeverityRatio > 0.25) score -= 10;
  if (completionRate < 0.8) score -= 16;
  else if (completionRate < 1) score -= 8;
  if (reopenedIssues.length > 0)
    score -= Math.min(12, reopenedIssues.length * 3);
  if (overdueTasks.length > 0) score -= Math.min(12, overdueTasks.length * 4);
  if (cycleTimeHours > 96) score -= 12;
  else if (cycleTimeHours > 72) score -= 8;
  else if (cycleTimeHours > 48) score -= 4;
  if (leadTimeHours > 120) score -= 8;
  else if (leadTimeHours > 72) score -= 4;
  if (imbalanceRatio > 1.8) score -= 10;
  else if (imbalanceRatio > 1.4) score -= 5;
  if (storyInsight && storyInsight.bugCount >= 5) score -= 8;
  score = clamp(Math.round(score), 0, 100);

  const immediateActions: AIImmediateAction[] = [];
  if (storyInsight) {
    immediateActions.push({
      issue: `${storyInsight.storyId} carries the highest defect concentration with ${storyInsight.bugCount} linked bugs.`,
      severity: storyInsight.bugCount >= 5 ? "High" : "Medium",
      action: storyInsight.recommendation,
      expectedImpact: storyInsight.expectedImpact,
    });
  }
  if (completionRate < 1) {
    immediateActions.push({
      issue: `Completion rate is ${formatPercent(completionRate * 100)}, with ${createdIssues.length} created versus ${resolvedIssues.length} resolved in the selected window.`,
      severity: completionRate < 0.8 ? "High" : "Medium",
      action:
        "Pull one focused closure plan for carry-forward defects before starting lower-priority intake.",
      expectedImpact: `Backlog growth can be reduced by ${Math.max(8, Math.abs(backlogDelta) * 3)}% if closure rate is lifted above incoming rate.`,
    });
  }
  if (overdueTasks.length > 0) {
    immediateActions.push({
      issue: `${overdueTasks.length} active tasks are overdue and still open.`,
      severity: overdueTasks.length >= 3 ? "High" : "Medium",
      action:
        "Escalate due-date breaches in the next stand-up and assign a named closure owner per task.",
      expectedImpact: `Expected lead-time improvement ${Math.min(20, overdueTasks.length * 5)}% once overdue work is cleared.`,
    });
  }
  if (reopenedIssues.length > 0) {
    immediateActions.push({
      issue: `${reopenedIssues.length} issues show reopen behavior in the current analysis set.`,
      severity: reopenedIssues.length >= 3 ? "High" : "Medium",
      action:
        "Require root-cause notes and regression evidence before closing repeat defects.",
      expectedImpact: `Expected rework reduction ${Math.min(18, reopenedIssues.length * 4)}% across repeated defects.`,
    });
  }
  if (immediateActions.length === 0) {
    immediateActions.push({
      issue:
        "No dominant failure signal is active in the selected project window.",
      severity: "Low",
      action:
        "Maintain current execution discipline and continue daily hygiene on defect ownership.",
      expectedImpact:
        "Keeps health stable while preserving current closure velocity.",
    });
  }

  const risksAndPredictions: AIRiskPrediction[] = [];
  if (backlogDelta > 0) {
    risksAndPredictions.push({
      risk: "Incoming work is outpacing completion.",
      probability: backlogDelta >= 5 ? "High" : "Medium",
      impact: `${backlogDelta} more issues were created than resolved in the selected ${getTimeRangeLabel(timeRange).toLowerCase()} window.`,
      prediction:
        "If this trend continues for the next cycle, carry-forward QA load will increase and completion confidence will drop.",
      mitigation:
        "Temporarily cap low-priority intake and reserve capacity for closure-heavy work.",
    });
  }
  if (highSeverityRatio > 0.25) {
    risksAndPredictions.push({
      risk: "High-severity defect mix is elevated.",
      probability: highSeverityRatio > 0.4 ? "High" : "Medium",
      impact: `${formatPercent(highSeverityRatio * 100)} of bug volume is Blocker/Critical.`,
      prediction:
        "Without containment, downstream validation and release confidence will degrade quickly.",
      mitigation:
        "Create a same-day triage lane for high-severity fixes and pause non-critical churn in the affected area.",
    });
  }
  if (imbalanceRatio > 1.4 && overutilizedResources.length > 0) {
    risksAndPredictions.push({
      risk: "Workload distribution is uneven.",
      probability: imbalanceRatio > 1.8 ? "High" : "Medium",
      impact: `${overutilizedResources[0].name} is carrying ${overutilizedResources[0].utilizationPercentage}% of team-average load.`,
      prediction:
        "Review latency and handoff quality will slip if ownership concentration stays this high.",
      mitigation:
        "Rebalance verification and defect follow-up to the lowest-loaded qualified owners this cycle.",
    });
  }
  if (risksAndPredictions.length === 0) {
    risksAndPredictions.push({
      risk: "No immediate delivery risk dominates the current window.",
      probability: "Low",
      impact:
        "Created, open, and resolved signals are within controllable thresholds.",
      prediction:
        "Project health should remain stable if current closure discipline holds.",
      mitigation:
        "Keep the current review cadence and watch for backlog growth after the next refresh.",
    });
  }

  const optimizationTips: AIOptimizationTip[] = [];
  if (cycleTimeHours > 0) {
    optimizationTips.push({
      area: "Cycle Time",
      issue: `Average cycle time is ${Math.round(cycleTimeHours)}h.`,
      recommendation:
        "Reduce waiting states between fix-ready and QA execution with a single owner handoff rule.",
      expectedGain: `Target ${Math.max(8, Math.round(cycleTimeHours / 8))}% faster closure if idle transitions are removed.`,
    });
  }
  if (leadTimeHours > 0) {
    optimizationTips.push({
      area: "Lead Time",
      issue: `Average lead time is ${Math.round(leadTimeHours)}h.`,
      recommendation:
        "Tighten acceptance criteria and pre-QA validation for high-change items before they enter test flow.",
      expectedGain: `Expected delivery predictability gain ${Math.max(6, Math.round(leadTimeHours / 12))}%.`,
    });
  }
  optimizationTips.push({
    area: "Completion Rate",
    issue: `${resolvedIssues.length} resolved versus ${createdIssues.length} created in the selected window.`,
    recommendation:
      "Plan daily closure targets per owner instead of broad backlog ownership.",
    expectedGain: `Expected throughput gain ${Math.max(5, Math.round(Math.abs(backlogDelta) * 2 + 6))}% if closure targets are enforced.`,
  });
  optimizationTips.push({
    area: "Sprint Velocity",
    issue:
      sprintVelocity > 0
        ? `${sprintVelocity} story points resolved.`
        : `${resolvedIssues.length} resolved items with limited story point coverage.`,
    recommendation:
      sprintVelocity > 0
        ? "Protect QA capacity for story-point-heavy work that is already near closure."
        : "Capture story points consistently to improve sprint-level forecasting accuracy.",
    expectedGain:
      sprintVelocity > 0
        ? "Better forecasting confidence for the current sprint."
        : "More accurate future velocity analysis once estimation hygiene improves.",
  });

  const resourceOptimizationRecommendations: AIResourceOptimizationRecommendation[] =
    [];
  if (overutilizedResources[0]) {
    resourceOptimizationRecommendations.push({
      problem: `Owner overload on ${overutilizedResources[0].name}`,
      currentState: overutilizedResources[0].risk,
      recommendedAction: overutilizedResources[0].recommendation,
      expectedOutcome:
        "Reduces review latency and lowers the probability of closure slippage.",
    });
  }
  if (underutilizedResources[0]) {
    resourceOptimizationRecommendations.push({
      problem: `Unused capacity on ${underutilizedResources[0].name}`,
      currentState: underutilizedResources[0].opportunity,
      recommendedAction: underutilizedResources[0].recommendation,
      expectedOutcome:
        "Improves balance across the queue and accelerates regression coverage.",
    });
  }
  if (resourceOptimizationRecommendations.length === 0) {
    resourceOptimizationRecommendations.push({
      problem: "No significant resource imbalance detected.",
      currentState:
        "Active ownership is relatively even across the current open queue.",
      recommendedAction:
        "Keep ownership balanced and review the distribution again after the next sync.",
      expectedOutcome:
        "Maintains current throughput without creating a new bottleneck.",
    });
  }

  const prioritizedFixes: AIPrioritizedFix[] = immediateActions
    .slice(0, 3)
    .map((action, index) => ({
      priorityRank: index + 1,
      fix: action.action,
      reason: action.issue,
      expectedImpact: action.expectedImpact,
    }));

  while (prioritizedFixes.length < 3) {
    prioritizedFixes.push({
      priorityRank: prioritizedFixes.length + 1,
      fix: "Maintain current quality guardrails and continue targeted monitoring.",
      reason:
        "No additional high-impact action exceeded the escalation threshold in the current data window.",
      expectedImpact:
        "Prevents regression while preserving current delivery pace.",
    });
  }

  const primaryFix = prioritizedFixes[0];
  const confidence = getConfidence(
    allIssues.length,
    risksAndPredictions.filter((risk) => risk.probability === "High").length +
      immediateActions.filter((action) => action.severity === "High").length,
  );
  const healthState =
    score >= 80 ? "stable" : score >= 60 ? "watch" : "at risk";

  return {
    projectHealthScore: score,
    executiveSummary: `${projectName || projectKey} is ${healthState} for the selected ${getTimeRangeLabel(timeRange).toLowerCase()} window. ${createdIssues.length} issues were created, ${resolvedIssues.length} were resolved, and the strongest pressure point is ${primaryFix.reason.toLowerCase()}`,
    aiRecommendation: {
      headline: primaryFix.fix,
      impactPercentage: clamp(
        Math.max(
          6,
          Math.round(score < 60 ? 18 : 10 + Math.abs(backlogDelta) * 2),
        ),
        6,
        30,
      ),
      confidence,
    },
    kpiInsights: {
      storyWithMaxBugs: storyInsight,
    },
    aiInsightsPanel: {
      immediateActions,
      risksAndPredictions,
      resourceSuggestions: {
        overutilizedResources,
        underutilizedResources,
      },
      optimizationTips: optimizationTips.slice(0, 4),
    },
    resourceOptimizationRecommendations,
    prioritizedFixes,
    metricsSnapshot: {
      totalIssues: allIssues.length,
      openIssues: openIssues.length,
      createdInRange: createdIssues.length,
      resolvedInRange: resolvedIssues.length,
      completionRate: Number((completionRate * 100).toFixed(1)),
      sprintVelocity,
      cycleTimeHours: Number(cycleTimeHours.toFixed(1)),
      leadTimeHours: Number(leadTimeHours.toFixed(1)),
      reopenedIssues: reopenedIssues.length,
      overdueTasks: overdueTasks.length,
    },
    projectKey,
    projectName,
    sprintName,
    timeRangeLabel: getTimeRangeLabel(timeRange),
  };
};
