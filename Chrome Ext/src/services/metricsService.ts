import type { JiraIssue, Metrics, HealthResult, HealthReason } from "../types";

export function classifyStatus(issue: JiraIssue): string {
  const cat = (issue.statusCategory || "").toLowerCase();
  if (cat === "done" || cat === "complete") return "Done";
  if (cat === "in progress") return "In Progress";
  const s = (issue.status || "").toLowerCase();
  if (["done", "closed", "resolved", "complete"].some((k) => s.includes(k)))
    return "Done";
  if (
    ["in progress", "in review", "in development", "dev", "review"].some((k) =>
      s.includes(k),
    )
  )
    return "In Progress";
  if (["block", "impediment", "waiting"].some((k) => s.includes(k)))
    return "Blocked";
  if (s.includes("backlog")) return "Backlog";
  if (s.includes("reopen")) return "Reopened";
  return "Open";
}

export function normalizePriority(p: string): string {
  const low = (p || "").toLowerCase();
  if (low === "highest" || low === "critical" || low === "blocker")
    return "Highest";
  if (low === "high") return "High";
  if (low === "medium" || low === "normal") return "Medium";
  if (low === "low") return "Low";
  if (low === "lowest" || low === "trivial") return "Lowest";
  return "Medium";
}

export function computeMetrics(
  openIssues: JiraIssue[],
  todayCreated: JiraIssue[],
  todayResolved: JiraIssue[],
): Metrics {
  const statusMap: Record<string, number> = {};
  const priorityMap: Record<string, number> = {};
  const typeMap: Record<string, number> = {};
  let blockedCount = 0;
  let reopenedCount = 0;
  const mustFixIssues: JiraIssue[] = [];

  openIssues.forEach((issue) => {
    const statusCat = classifyStatus(issue);
    statusMap[statusCat] = (statusMap[statusCat] || 0) + 1;

    const prio = normalizePriority(issue.priority);
    priorityMap[prio] = (priorityMap[prio] || 0) + 1;

    const type = issue.issueType || "Other";
    typeMap[type] = (typeMap[type] || 0) + 1;

    const sLow = (issue.status || "").toLowerCase();
    if (
      sLow.includes("block") ||
      sLow.includes("impediment") ||
      sLow.includes("waiting")
    )
      blockedCount++;
    if (sLow.includes("reopen")) reopenedCount++;

    const pLow = (issue.priority || "").toLowerCase();
    const labels = (issue.labels || []).map((l) => l.toLowerCase());
    if (
      pLow === "highest" ||
      pLow === "critical" ||
      pLow === "blocker" ||
      labels.includes("must-fix") ||
      labels.includes("must_fix") ||
      labels.includes("mustfix")
    ) {
      mustFixIssues.push(issue);
    }
  });

  const todayPriorityMap: Record<string, number> = {};
  todayCreated.forEach((issue) => {
    const prio = normalizePriority(issue.priority);
    todayPriorityMap[prio] = (todayPriorityMap[prio] || 0) + 1;
  });

  const mustFixStatusMap: Record<string, number> = {};
  mustFixIssues.forEach((issue) => {
    const statusCat = classifyStatus(issue);
    mustFixStatusMap[statusCat] = (mustFixStatusMap[statusCat] || 0) + 1;
  });

  const bugCount = openIssues.filter((i) => {
    const t = (i.issueType || "").toLowerCase();
    return t === "bug" || t === "defect";
  }).length;

  const componentOpenMap: Record<string, number> = {};
  const componentBlockedMap: Record<string, number> = {};
  openIssues.forEach((issue) => {
    const comps =
      issue.components && issue.components.length > 0 ? issue.components : null;
    if (!comps) return;
    comps.forEach((comp) => {
      componentOpenMap[comp] = (componentOpenMap[comp] || 0) + 1;
      const sLow = (issue.status || "").toLowerCase();
      if (
        sLow.includes("block") ||
        sLow.includes("impediment") ||
        sLow.includes("waiting")
      ) {
        componentBlockedMap[comp] = (componentBlockedMap[comp] || 0) + 1;
      }
    });
  });

  return {
    totalOpen: openIssues.length,
    todayNew: todayCreated.length,
    todayResolved: todayResolved.length,
    reopened: reopenedCount,
    mustFix: mustFixIssues.length,
    blocked: blockedCount,
    statusMap,
    priorityMap,
    typeMap,
    todayPriorityMap,
    mustFixStatusMap,
    mustFixIssues,
    bugCount,
    todayCreated,
    todayResolvedIssues: todayResolved,
    openIssues,
    componentOpenMap,
    componentBlockedMap,
  };
}

export function calculateHealth(metrics: Metrics): HealthResult {
  let score = 0;
  const reasons: HealthReason[] = [];

  const critCount = metrics.priorityMap["Highest"] || 0;
  if (critCount > 5) {
    score += 4;
    reasons.push({
      text: `${critCount} critical/blocker issues open`,
      type: "danger",
    });
  } else if (critCount > 0) {
    score += 2;
    reasons.push({
      text: `${critCount} critical/blocker issues open`,
      type: "warning",
    });
  }

  if (metrics.mustFix > 15) {
    score += 3;
    reasons.push({
      text: `${metrics.mustFix} must-fix issues pending`,
      type: "danger",
    });
  } else if (metrics.mustFix > 5) {
    score += 1;
    reasons.push({
      text: `${metrics.mustFix} must-fix issues pending`,
      type: "warning",
    });
  }

  if (metrics.blocked > 10) {
    score += 3;
    reasons.push({ text: `${metrics.blocked} issues blocked`, type: "danger" });
  } else if (metrics.blocked > 3) {
    score += 1;
    reasons.push({
      text: `${metrics.blocked} issues blocked`,
      type: "warning",
    });
  }

  if (metrics.totalOpen > 200) {
    score += 2;
    reasons.push({
      text: `${metrics.totalOpen} total open issues (high backlog)`,
      type: "warning",
    });
  } else if (metrics.totalOpen > 100) {
    score += 1;
    reasons.push({
      text: `${metrics.totalOpen} total open issues`,
      type: "warning",
    });
  }

  if (metrics.todayNew > 0 && metrics.todayNew > metrics.todayResolved * 2) {
    score += 1;
    reasons.push({
      text: `New issues (${metrics.todayNew}) outpacing resolved (${metrics.todayResolved})`,
      type: "warning",
    });
  }

  if (critCount === 0)
    reasons.push({ text: "No critical/blocker issues", type: "success" });
  if (metrics.blocked === 0)
    reasons.push({ text: "No blocked issues", type: "success" });
  if (metrics.todayResolved > metrics.todayNew && metrics.todayResolved > 0) {
    reasons.push({
      text: `Resolving faster than incoming (${metrics.todayResolved} resolved today)`,
      type: "success",
    });
  }

  const health: "green" | "yellow" | "red" =
    score >= 6 ? "red" : score >= 3 ? "yellow" : "green";
  return { health, reasons, score };
}
