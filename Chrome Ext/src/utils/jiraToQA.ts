import type { JiraIssue } from "../types";
import type { QAIssue, Priority, IssueStatus, Environment } from "../types/qa";

const SLA_HOURS: Record<Priority, number> = {
  Blocker: 4,
  Critical: 24,
  High: 48,
  Medium: 72,
  Low: 168,
};

function normalizePriority(p: string): Priority {
  const low = (p || "").toLowerCase();
  if (low === "blocker" || low === "highest") return "Blocker";
  if (low === "critical") return "Critical";
  if (low === "high") return "High";
  if (low === "low" || low === "lowest" || low === "trivial" || low === "minor")
    return "Low";
  return "Medium";
}

function normalizeStatus(s: string): IssueStatus {
  const low = (s || "").toLowerCase();
  if (low.includes("done") || low.includes("closed") || low.includes("complet"))
    return "Closed";
  if (low.includes("resol")) return "Resolved";
  if (low.includes("reopen")) return "Reopened";
  if (low.includes("review")) return "In Review";
  if (
    low.includes("progress") ||
    low.includes("dev") ||
    low.includes("test") ||
    low.includes(" qa")
  )
    return "In Progress";
  return "Open";
}

function detectEnvironment(issue: JiraIssue): Environment {
  const text = [...(issue.labels || []), issue.summary || ""]
    .join(" ")
    .toLowerCase();
  if (text.match(/\bprod(uction)?\b/)) return "Production";
  if (text.match(/\bstag(ing)?\b/)) return "Staging";
  if (text.match(/\bnpr\b/)) return "NPR";
  if (text.match(/\b(np|non.?prod|nonprod)\b/)) return "Non-Prod";
  return "Non-Prod";
}

function extractModule(issue: JiraIssue): string {
  if (issue.components && issue.components.length > 0)
    return issue.components[0];
  const text = [...(issue.labels || []), issue.summary || ""]
    .join(" ")
    .toLowerCase();
  const mods = [
    "checkout",
    "payment",
    "login",
    "dashboard",
    "reporting",
    "cart",
    "orders",
    "search",
    "notifications",
    "profile",
  ];
  for (const mod of mods) {
    if (text.includes(mod)) return mod.charAt(0).toUpperCase() + mod.slice(1);
  }
  return "General";
}

export function mapJiraIssuesToQA(issues: JiraIssue[]): QAIssue[] {
  return issues.map((issue): QAIssue => {
    const priority = normalizePriority(issue.priority);
    const status = normalizeStatus(issue.status);
    return {
      id: issue.key,
      key: issue.key,
      summary: issue.summary || "",
      description: issue.description ?? "",
      priority,
      status,
      originalStatus: issue.status || "",
      assignee: issue.assignee || "Unassigned",
      reporter: issue.reporter || "",
      created: issue.created || "",
      updated: issue.updated || "",
      resolved: issue.resolved ?? undefined,
      module: extractModule(issue),
      environment: detectEnvironment(issue),
      storyKey: issue.epic ?? undefined,
      storyTitle: issue.epicName ?? issue.epic ?? undefined,
      labels: issue.labels || [],
      timeEstimate: issue.timeEstimate ?? 0,
      timeLogged: issue.timeSpent ?? 0,
      commentsCount: issue.commentsCount ?? 0,
      statusChanges: (issue.statusChanges ?? []).map((sc) => ({
        from: normalizeStatus(sc.from),
        to: normalizeStatus(sc.to),
        date: sc.date,
        by: sc.by,
      })),
      reopenCount: issue.reopenCount ?? (status === "Reopened" ? 1 : 0),
      assigneeChanges: issue.assigneeChanges ?? 0,
      slaHours: SLA_HOURS[priority],
    };
  });
}
