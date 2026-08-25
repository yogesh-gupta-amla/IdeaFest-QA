import React, { useMemo, useState } from "react";
import { Row, Col, Tag, Statistic, Spin, Alert, List, Table } from "antd";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useProjectHealth } from "../../hooks/useQAData";
import { useDashboardStore } from "../../store/useStore";
import type { QueryTimeRange, DateRange } from "../../utils/queryTimeRange";
import ChartCard from "../Charts/ChartCard";
import NeonCard from "../common/NeonCard";
import { exportDashboardToPDF } from "../../utils/exportUtils";
import {
  FilePdfOutlined,
  CalendarOutlined,
  BugOutlined,
  StopOutlined,
  RocketOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
import type { JiraIssue } from "../../types";
import { getTimeRangeLabel } from "../../utils/queryTimeRange";

const SEVERITY_COLORS: Record<string, string> = {
  Blocker: "#ff0033",
  Critical: "#ff4d4f",
  High: "#fa8c16",
  Medium: "#faad14",
  Low: "#52c41a",
};

/** Tag colours for Recommended Actions — antd preset names. */
const LEVEL_COLORS = {
  Technical: "geekblue",
  Delivery: "cyan",
  Project: "purple",
} as const;

const PRIORITY_COLORS = {
  High: "red",
  Medium: "orange",
  Low: "default",
} as const;

// ─── AI Prompt Analysis Helpers ───────────────────────────────────────────────

const EXCLUDED_STATUSES = [
  "Done",
  "QA Done",
  "Rejected",
  "Ready For Production",
  "Ready for QA",
  "Ready for Testing",
  "Ready For UAT",
];

const NORMALIZED_EXCLUDED_STATUSES = new Set(
  EXCLUDED_STATUSES.map((status) => status.trim().toLowerCase()),
);

/** Normalize Jira priority names to canonical values.
 *  Jira instances may use "Highest" instead of "Blocker", etc. */
function normalizePriority(p: string): string {
  const low = (p || "").trim().toLowerCase();
  if (low === "blocker" || low === "highest") return "Blocker";
  if (low === "critical") return "Critical";
  if (low === "high") return "High";
  if (low === "low" || low === "lowest" || low === "trivial" || low === "minor")
    return "Low";
  return "Medium";
}

/** Pre-normalize priority on a set of JiraIssues so all downstream
 *  comparisons work regardless of the Jira instance's priority scheme. */
function withNormalizedPriority<T extends { priority: string }>(
  issues: T[],
): T[] {
  return issues.map((i) => ({ ...i, priority: normalizePriority(i.priority) }));
}

function filterActiveBugs(issues: JiraIssue[]) {
  return issues.filter(
    (i) =>
      !NORMALIZED_EXCLUDED_STATUSES.has(i.status.trim().toLowerCase()) &&
      (i.issueType === "Bug" || i.issueType === "Defect"),
  );
}

function isBlockedStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return (
    normalized.includes("block") ||
    normalized.includes("impediment") ||
    normalized.includes("waiting")
  );
}

function normalizeQaStatus(status: string): string | null {
  const normalized = status.trim().toLowerCase();

  if (normalized === "qa done") {
    return "QA Done";
  }

  if (
    normalized === "ready for testing" ||
    normalized === "ready for qa" ||
    normalized === "ready for test"
  ) {
    return "Ready For Testing";
  }

  if (
    normalized === "ready for production" ||
    normalized === "ready for prod"
  ) {
    return "Ready For Production";
  }

  return null;
}

function dedupeIssues(...groups: JiraIssue[][]): JiraIssue[] {
  const issueMap = new Map<string, JiraIssue>();

  groups.flat().forEach((issue) => {
    if (!issue?.key) return;
    issueMap.set(issue.key, issue);
  });

  return Array.from(issueMap.values());
}

function getDateRange(timeRange: QueryTimeRange): {
  start: Date;
  end: Date;
} {
  const end = new Date();
  const days = timeRange === "last6months" ? 180 : 30;
  const start = new Date(end);
  start.setDate(end.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/** Who the action is aimed at. */
type ActionPerspective = "QA" | "Manager";
/** Which layer the action operates on. */
type ActionLevel = "Technical" | "Delivery" | "Project";
type ActionPriority = "High" | "Medium" | "Low";

interface HealthRecommendation {
  perspective: ActionPerspective;
  level: ActionLevel;
  priority: ActionPriority;
  text: string;
}

/**
 * Severity / reopen counts, every one of them a SUBSET of `totalActive`
 * (the Total Active Issues KPI). Supplied by `calculateProjectHealth` so the
 * Risk Insights quote exactly the numbers shown on the KPI cards.
 */
interface ActiveIssueCounts {
  totalActive: number;
  critical: number;
  blocker: number;
  criticalBlocker: number;
  high: number;
  reopened: number;
  slaBreach: number;
  closureRate: number;
}

interface AIHealthAnalysis {
  healthStatus: "GREEN" | "ORANGE";
  healthReason: string;
  highSeveritySpike: boolean;
  unitLevelHigh: boolean;
  qaVelocityLow: boolean;
  risks: string[];
  redAreas: Array<[string, number]>;
  unitLevelPct: number;
  unitLevelCount: number;
  throughput: "High" | "Medium" | "Low";
  qaVelocityCount: number;
  inTestingCount: number;
  recommendations: HealthRecommendation[];
  totalIssues: number;
  priorityMap: Record<string, number>;
  blockerCriticalCount: number;
  activeCounts: ActiveIssueCounts;
  statusMap: Record<string, number>;
  productSideCount: number;
  launchSideCount: number;
  genericCount: number;
  periodsData: Array<{
    date: string;
    total: number;
    blocker: number;
    critical: number;
    high: number;
    issues: Array<{
      key: string;
      summary: string;
      assignee: string;
      priority: string;
      status: string;
    }>;
  }>;
}

function analyzeHealthData(
  rawIssues: JiraIssue[],
  periodCreatedIssues: JiraIssue[],
  recentlyResolvedIssues: JiraIssue[],
  timeRange: QueryTimeRange,
  ageingIssues?: JiraIssue[],
  activeIssues?: JiraIssue[],
  /** KPI counts from calculateProjectHealth — keeps Risk Insights in sync
   *  with the KPI cards. Recomputed locally from `activeBugs` if omitted. */
  kpiCounts?: ActiveIssueCounts,
): AIHealthAnalysis {
  const { start, end } = getDateRange(timeRange);
  // Normalize priorities upfront so "Highest" → "Blocker", etc.
  const normalizedRaw = withNormalizedPriority(rawIssues);
  const normalizedCreated = withNormalizedPriority(periodCreatedIssues);
  const normalizedResolved = withNormalizedPriority(recentlyResolvedIssues);
  const normalizedAgeing = ageingIssues
    ? withNormalizedPriority(ageingIssues)
    : [];
  // Use dedicated active-issues JQL dataset when available; fallback to client-side filter
  const activeBugs = activeIssues
    ? withNormalizedPriority(activeIssues)
    : filterActiveBugs(normalizedRaw);
  const velocitySource = dedupeIssues(
    normalizedRaw,
    normalizedCreated,
    normalizedResolved,
  );

  // ── Counts anchored to Total Active Issues ──────────────────────────────
  // Prefer the counts computed by calculateProjectHealth (same numbers the KPI
  // cards render); recompute from activeBugs when they weren't supplied.
  const activeCounts: ActiveIssueCounts = kpiCounts ?? {
    totalActive: activeBugs.length,
    critical: activeBugs.filter((i) => i.priority === "Critical").length,
    blocker: activeBugs.filter((i) => i.priority === "Blocker").length,
    criticalBlocker: activeBugs.filter(
      (i) => i.priority === "Critical" || i.priority === "Blocker",
    ).length,
    high: activeBugs.filter((i) => i.priority === "High").length,
    reopened: activeBugs.filter(
      (i) =>
        (i.reopenCount ?? 0) > 0 || i.status.trim().toLowerCase() === "reopened",
    ).length,
    slaBreach: 0,
    closureRate: 1,
  };

  const totalActive = activeCounts.totalActive;
  const shareOfActive = (n: number) => (totalActive > 0 ? n / totalActive : 0);
  const pctOfActive = (n: number) =>
    `${(shareOfActive(n) * 100).toFixed(1)}%`;
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

  const criticalBlockerShare = shareOfActive(activeCounts.criticalBlocker);
  const highShare = shareOfActive(activeCounts.high);
  const reopenedShare = shareOfActive(activeCounts.reopened);
  // Blocker + Critical + High together — the "must not ship" slice.
  const severeShare = shareOfActive(
    activeCounts.criticalBlocker + activeCounts.high,
  );

  // Three JQL categories (client-side)
  const genericCount = activeBugs.length;
  const productSideCount = activeBugs.filter((i) =>
    isBlockedStatus(i.status),
  ).length;
  const launchSideCount = activeBugs.filter(
    (i) => !isBlockedStatus(i.status),
  ).length;

  // Issues created within the selected period (any type = Bug/Defect)
  const issuesInPeriod = normalizedCreated.filter((i) => {
    const created = new Date(i.created);
    return (
      created >= start &&
      created <= end &&
      (i.issueType === "Bug" || i.issueType === "Defect")
    );
  });

  const total = issuesInPeriod.length;

  // Priority map (from period-created issues)
  const priorityMap: Record<string, number> = {};
  issuesInPeriod.forEach((i) => {
    priorityMap[i.priority] = (priorityMap[i.priority] || 0) + 1;
  });

  // Blocker/Critical count now comes from the SAME active-issues set that feeds
  // the Total Active Issues KPI, so the risk percentages below can never exceed
  // 100%. (It previously came from the ageing JQL, which is lifetime-scoped and
  // measured against a period-scoped denominator.)
  const blockerCriticalCount = activeCounts.criticalBlocker;
  const highSeveritySpike = totalActive > 0 && criticalBlockerShare > 0.15;

  // RED area distribution — driven by the high-severity slice of the ACTIVE
  // backlog. Falls back to the full active set, then to period-created issues.
  const activeHighSeverity = activeBugs.filter(
    (i) =>
      i.priority === "Blocker" ||
      i.priority === "Critical" ||
      i.priority === "High",
  );
  const redAreaSource =
    activeHighSeverity.length > 0
      ? activeHighSeverity
      : activeBugs.length > 0
        ? activeBugs
        : issuesInPeriod;

  // Component distribution
  const componentMap: Record<string, number> = {};
  redAreaSource.forEach((i) => {
    const comps =
      i.components && i.components.length > 0 ? i.components : ["No Component"];
    comps.forEach((c) => {
      componentMap[c] = (componentMap[c] ?? 0) + 1;
    });
  });

  // Unit Level: check label "unit-level", "unit_level", "unitlevel", "Unit Level"
  const unitLevelCount = issuesInPeriod.filter((i) =>
    (i.labels || []).some((l) =>
      l
        .toLowerCase()
        .replace(/[\s_-]/g, "")
        .includes("unitlevel"),
    ),
  ).length;
  const unitLevelPct = total > 0 ? (unitLevelCount / total) * 100 : 0;
  const unitLevelHigh = unitLevelPct > 10;

  // QA Velocity: status distribution across all issues
  const statusMap: Record<string, number> = {};
  velocitySource.forEach((i) => {
    const qaStatus = normalizeQaStatus(i.status);
    if (qaStatus) {
      statusMap[qaStatus] = (statusMap[qaStatus] ?? 0) + 1;
    }
  });

  const qaVelocityCount =
    (statusMap["QA Done"] ?? 0) + (statusMap["Ready For Production"] ?? 0);
  const inTestingCount = statusMap["Ready For Testing"] ?? 0;
  const qaVelocityLow =
    inTestingCount > 0 && qaVelocityCount < inTestingCount * 0.5;

  const throughput: "High" | "Medium" | "Low" =
    qaVelocityCount > 30 ? "High" : qaVelocityCount > 15 ? "Medium" : "Low";

  // RED areas: top components by issue count
  const redAreas = Object.entries(componentMap)
    .filter(([k]) => k !== "No Component")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as Array<[string, number]>;

  // Health decision (AI judgment per prompt)
  const isOrange = highSeveritySpike || unitLevelHigh || qaVelocityLow;
  const healthStatus: "GREEN" | "ORANGE" = isOrange ? "ORANGE" : "GREEN";

  const healthReasonParts: string[] = [];
  if (!isOrange) {
    healthReasonParts.push("Severity distribution is under control");
    healthReasonParts.push(`QA velocity is ${throughput.toLowerCase()}`);
    if (unitLevelPct <= 10)
      healthReasonParts.push("Unit test coverage is acceptable");
  } else {
    if (highSeveritySpike)
      healthReasonParts.push(
        `${pctOfActive(activeCounts.criticalBlocker)} of active issues are Blocker/Critical — exceeds 15% threshold`,
      );
    if (unitLevelHigh)
      healthReasonParts.push(
        `${unitLevelPct.toFixed(1)}% Unit Level defects — exceeds 10% threshold`,
      );
    if (qaVelocityLow)
      healthReasonParts.push(
        `QA velocity imbalance (${inTestingCount} in testing vs ${qaVelocityCount} done)`,
      );
  }
  const healthReason = healthReasonParts.join(" · ");

  // ── Key risks ───────────────────────────────────────────────────────────
  // Every severity/reopen risk below is measured against Total Active Issues
  // so the percentages are directly comparable to the KPI cards.
  const risks: string[] = [];

  if (activeCounts.blocker > 0)
    risks.push(
      `🔴 ${activeCounts.blocker} Blocker ${plural(activeCounts.blocker, "issue", "issues")} still open (${pctOfActive(activeCounts.blocker)} of ${totalActive} active) — release-blocking`,
    );
  if (highSeveritySpike)
    risks.push(
      `🔴 ${activeCounts.criticalBlocker} of ${totalActive} active issues are Blocker/Critical (${pctOfActive(activeCounts.criticalBlocker)}) — exceeds the 15% threshold`,
    );
  else if (activeCounts.criticalBlocker > 0)
    risks.push(
      `🟠 ${activeCounts.criticalBlocker} Blocker/Critical ${plural(activeCounts.criticalBlocker, "issue", "issues")} in the active backlog (${pctOfActive(activeCounts.criticalBlocker)} of ${totalActive})`,
    );
  if (highShare > 0.3)
    risks.push(
      `🔴 ${activeCounts.high} High-severity ${plural(activeCounts.high, "issue", "issues")} (${pctOfActive(activeCounts.high)} of active) — High severity dominates the backlog`,
    );
  else if (activeCounts.high > 0)
    risks.push(
      `🟠 ${activeCounts.high} High-severity ${plural(activeCounts.high, "issue", "issues")} open (${pctOfActive(activeCounts.high)} of ${totalActive} active)`,
    );
  if (reopenedShare > 0.15)
    risks.push(
      `🔴 ${activeCounts.reopened} reopened ${plural(activeCounts.reopened, "issue", "issues")} (${pctOfActive(activeCounts.reopened)} of active) — exceeds the 15% threshold, points to weak fix verification`,
    );
  else if (activeCounts.reopened > 0)
    risks.push(
      `🟠 ${activeCounts.reopened} reopened ${plural(activeCounts.reopened, "issue", "issues")} in the active backlog (${pctOfActive(activeCounts.reopened)}) — re-verify the ${plural(activeCounts.reopened, "fix", "fixes")} before closure`,
    );
  if (severeShare > 0.5 && totalActive > 0)
    risks.push(
      `🔴 ${activeCounts.criticalBlocker + activeCounts.high} of ${totalActive} active issues are Blocker/Critical/High (${(severeShare * 100).toFixed(1)}%) — over half the backlog is must-fix`,
    );
  if (activeCounts.slaBreach > 0)
    risks.push(
      `🔴 ${activeCounts.slaBreach} active ${plural(activeCounts.slaBreach, "issue has", "issues have")} breached ${plural(activeCounts.slaBreach, "its", "their")} priority SLA (${pctOfActive(activeCounts.slaBreach)} of active)`,
    );
  if (redAreas.length > 0 && (highSeveritySpike || highShare > 0.3))
    risks.push(
      `🔴 Top impacted modules (active Blocker/Critical/High): ${redAreas
        .slice(0, 3)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ")}`,
    );
  if (normalizedAgeing.length > activeCounts.criticalBlocker)
    risks.push(
      `🟠 ${normalizedAgeing.length - activeCounts.criticalBlocker} Critical/Blocker issues are ageing outside the selected window — carried-over debt not counted in the ${totalActive} active total`,
    );
  if (unitLevelHigh)
    risks.push(
      `🔴 ${unitLevelPct.toFixed(1)}% Unit Level defects among the ${total} bugs created this period — indicates poor unit testing or early leakage`,
    );
  if (qaVelocityLow)
    risks.push(
      `🟠 QA velocity is LOW — ${inTestingCount} items queued for testing, only ${qaVelocityCount} completed`,
    );
  if (productSideCount > 0)
    risks.push(
      `🟠 ${productSideCount} active ${plural(productSideCount, "issue", "issues")} blocked on product side (${pctOfActive(productSideCount)}) — pending owner resolution`,
    );
  if (activeCounts.closureRate < 0.8)
    risks.push(
      `🟠 Closure rate is ${(activeCounts.closureRate * 100).toFixed(0)}% — issues are being created faster than they are resolved, so the ${totalActive} active count will keep growing`,
    );
  if (total > 20 && !highSeveritySpike)
    risks.push(
      `🟠 ${total} new bugs/defects created in this period — elevated defect creation rate`,
    );

  // ── Recommended actions ─────────────────────────────────────────────
  // Two audiences, three levels:
  //   QA      → what the test team executes (Technical / Delivery / Project)
  //   Manager → what the delivery owner decides (Technical / Delivery / Project)
  // Conditional actions fire off the active-issue counts; the closing block
  // tops each perspective up with standing practice so neither column is empty.
  const recommendations: HealthRecommendation[] = [];
  const addAction = (
    perspective: ActionPerspective,
    level: ActionLevel,
    priority: ActionPriority,
    text: string,
  ) => recommendations.push({ perspective, level, priority, text });

  const topComp = redAreas[0]?.[0];
  const topCompLabel = topComp ? `"${topComp}"` : "the highest-defect modules";
  const topCompCount = redAreas[0]?.[1] ?? 0;
  const secondComp = redAreas[1]?.[0];

  // ── QA · Technical ──
  if (activeCounts.blocker > 0)
    addAction(
      "QA",
      "Technical",
      "High",
      `Re-test and sign off the ${activeCounts.blocker} open ${plural(activeCounts.blocker, "Blocker", "Blockers")} first — ${plural(activeCounts.blocker, "pair it with its", "pair each one with its")} developer, reproduce on the latest build, and attach evidence before moving it out of Blocker.`,
    );
  if (activeCounts.criticalBlocker > 0)
    addAction(
      "QA",
      "Technical",
      criticalBlockerShare > 0.15 ? "High" : "Medium",
      `Run a focused regression suite over ${topCompLabel}${topCompCount ? ` (${topCompCount} active high-severity issues)` : ""}${secondComp ? ` and ${secondComp}` : ""} — that is where the ${activeCounts.criticalBlocker} Blocker/Critical issues (${pctOfActive(activeCounts.criticalBlocker)} of active) are concentrated.`,
    );
  if (activeCounts.reopened > 0)
    addAction(
      "QA",
      "Technical",
      reopenedShare > 0.15 ? "High" : "Medium",
      `Add a regression test for ${plural(activeCounts.reopened, "the", "each of the")} ${activeCounts.reopened} reopened ${plural(activeCounts.reopened, "issue", "issues")} (${pctOfActive(activeCounts.reopened)} of active) and tighten the closure checklist — a reopen means the original fix was verified too narrowly.`,
    );
  if (unitLevelHigh)
    addAction(
      "QA",
      "Technical",
      "High",
      `${unitLevelCount} unit-level defects (${unitLevelPct.toFixed(1)}% of bugs created this period) are leaking past development — require unit-test evidence in the PR before accepting a build into QA.`,
    );

  // ── QA · Delivery ──
  if (qaVelocityLow)
    addAction(
      "QA",
      "Delivery",
      "High",
      `Drain the "Ready For Testing" queue — ${inTestingCount} items waiting against ${qaVelocityCount} completed. Split the queue by severity, run high-severity lanes in parallel, and publish a daily burn-down.`,
    );
  if (activeCounts.high > 0)
    addAction(
      "QA",
      "Delivery",
      highShare > 0.3 ? "High" : "Medium",
      `Time-box verification of the ${activeCounts.high} High-severity ${plural(activeCounts.high, "issue", "issues")} (${pctOfActive(activeCounts.high)} of active) into this sprint so ${plural(activeCounts.high, "it does", "they do")} not roll into the Blocker/Critical bucket next cycle.`,
    );
  addAction(
    "QA",
    "Delivery",
    "Medium",
    `Hold a daily triage on the ${totalActive} active issues — confirm severity, owner and target build for each, so the Blocker (${activeCounts.blocker}) / Critical (${activeCounts.critical}) / High (${activeCounts.high}) / Reopened (${activeCounts.reopened}) split stays accurate.`,
  );

  // ── QA · Project ──
  addAction(
    "QA",
    "Project",
    severeShare > 0.5 ? "High" : "Medium",
    `Report release readiness against a hard exit gate: zero open Blockers and Critical/Blocker under 15% of active. Current position: ${activeCounts.blocker} ${plural(activeCounts.blocker, "Blocker", "Blockers")}, ${pctOfActive(activeCounts.criticalBlocker)} Critical/Blocker, ${(severeShare * 100).toFixed(1)}% of the backlog must-fix.`,
  );
  if (redAreas.length > 1)
    addAction(
      "QA",
      "Project",
      "Low",
      `Build a component risk heat-map from the RED areas (${redAreas
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}) and use it to steer test-automation investment next quarter.`,
    );

  // ── Manager · Technical ──
  if (highSeveritySpike || activeCounts.blocker > 0)
    addAction(
      "Manager",
      "Technical",
      "High",
      `Assign a senior engineer to own ${topCompLabel} end-to-end until the Blocker/Critical count is ${
        Math.floor(totalActive * 0.15) === 0
          ? "cleared to zero"
          : `down to at most ${Math.floor(totalActive * 0.15)}`
      } (the 15% ceiling on ${totalActive} active issues) — today it is ${activeCounts.criticalBlocker}.`,
    );
  if (unitLevelHigh || reopenedShare > 0.15)
    addAction(
      "Manager",
      "Technical",
      "High",
      `Tighten the Definition of Done: mandatory unit tests and a peer code review before a story leaves development. ${[
        unitLevelHigh
          ? `${unitLevelCount} unit-level ${plural(unitLevelCount, "defect", "defects")}`
          : null,
        activeCounts.reopened > 0
          ? `${activeCounts.reopened} ${plural(activeCounts.reopened, "reopen", "reopens")}`
          : null,
      ]
        .filter(Boolean)
        .join(" and ")} ${plural(
        (unitLevelHigh ? 1 : 0) + (activeCounts.reopened > 0 ? 1 : 0),
        "is",
        "are",
      )} the cost of the current gate.`,
    );

  // ── Manager · Delivery ──
  if (productSideCount > 0)
    addAction(
      "Manager",
      "Delivery",
      "High",
      `Escalate the ${productSideCount} product-side blocked ${plural(productSideCount, "issue", "issues")} (${pctOfActive(productSideCount)} of active) — name an owner and a dated ETA${plural(productSideCount, "", " for each")}, and review ${plural(productSideCount, "it", "them")} in the daily stand-up until cleared.`,
    );
  if (activeCounts.closureRate < 0.8)
    addAction(
      "Manager",
      "Delivery",
      "High",
      `Closure rate is ${(activeCounts.closureRate * 100).toFixed(0)}% — the backlog is growing. Either re-scope the sprint or add QA/dev capacity; at this rate the ${totalActive} active issues will not clear within the release window.`,
    );
  if (severeShare > 0.5 || activeCounts.blocker > 0)
    addAction(
      "Manager",
      "Delivery",
      "High",
      `Re-plan the sprint around the must-fix slice: ${activeCounts.criticalBlocker + activeCounts.high} of ${totalActive} active issues (${(severeShare * 100).toFixed(1)}%) are Blocker/Critical/High. Defer new feature scope until that share is under 30%.`,
    );
  if (qaVelocityLow)
    addAction(
      "Manager",
      "Delivery",
      "Medium",
      `Fund the QA bottleneck — ${inTestingCount} items are queued for testing against ${qaVelocityCount} completed. Either add a tester to the rotation or stagger dev hand-offs so the queue stays under ${Math.max(5, qaVelocityCount)} items.`,
    );

  // ── Manager · Project ──
  addAction(
    "Manager",
    "Project",
    activeCounts.blocker > 0 || severeShare > 0.5 ? "High" : "Medium",
    `Take the go/no-go call on evidence, not sentiment: ${totalActive} active issues — ${activeCounts.blocker} Blocker, ${activeCounts.critical} Critical, ${activeCounts.high} High, ${activeCounts.reopened} Reopened. Record the accepted residual risk in the risk register with a named owner.`,
  );
  if (normalizedAgeing.length > activeCounts.criticalBlocker)
    addAction(
      "Manager",
      "Project",
      "Medium",
      `${normalizedAgeing.length - activeCounts.criticalBlocker} Critical/Blocker issues predate this window and sit outside the ${totalActive} active count. Schedule a dedicated debt-burn slot or formally accept and close them — carrying them silently distorts every forecast.`,
    );
  addAction(
    "Manager",
    "Project",
    "Low",
    `Share the severity mix and closure trend with stakeholders weekly, and set an alert when Blocker/Critical crosses 15% of active issues so the escalation is automatic rather than discovered late.`,
  );

  // Standing practice — guarantees both perspectives are represented.
  const qaActionCount = recommendations.filter(
    (r) => r.perspective === "QA",
  ).length;
  const mgrActionCount = recommendations.filter(
    (r) => r.perspective === "Manager",
  ).length;
  if (qaActionCount < 3)
    addAction(
      "QA",
      "Technical",
      "Low",
      `Keep the regression pack aligned to the top-defect components and re-baseline it each sprint so the ${totalActive} active issues stay covered.`,
    );
  if (mgrActionCount < 3)
    addAction(
      "Manager",
      "Delivery",
      "Low",
      `Keep a weekly quality checkpoint on the calendar — severity mix, closure rate and reopen rate — so a rising Critical/Blocker share is caught in the same week it appears.`,
    );

  // Highest-impact actions first within each perspective.
  const priorityRank: Record<ActionPriority, number> = {
    High: 0,
    Medium: 1,
    Low: 2,
  };
  const levelRank: Record<ActionLevel, number> = {
    Technical: 0,
    Delivery: 1,
    Project: 2,
  };
  recommendations.sort(
    (a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      levelRank[a.level] - levelRank[b.level],
  );

  // Per-period breakdown — sourced from the SAME issuesInPeriod set the KPI
  // counts so the table header sum equals the "Bugs in Period" KPI.
  // Bucket size adapts: Last Month → daily, Last 6 Months → weekly.
  const periodsData: Array<{
    date: string;
    total: number;
    blocker: number;
    critical: number;
    high: number;
    issues: Array<{
      key: string;
      summary: string;
      assignee: string;
      priority: string;
      status: string;
    }>;
  }> = [];

  {
    const isWeekly = timeRange === "last6months";
    const bucketDays = isWeekly ? 7 : 1;
    const bucketMs = bucketDays * 86400000;
    const endDay = new Date(end);
    endDay.setHours(23, 59, 59, 999);
    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const totalBuckets = Math.ceil(
      (endDay.getTime() - startDay.getTime()) / bucketMs,
    );
    for (let b = 0; b < totalBuckets; b++) {
      const bucketEnd = endDay.getTime() - (totalBuckets - 1 - b) * bucketMs;
      const bucketStart = bucketEnd - bucketMs + 1;
      const label = new Date(bucketEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const bucketIssues = issuesInPeriod.filter((iss) => {
        const t = new Date(iss.created).getTime();
        return t >= bucketStart && t <= bucketEnd;
      });
      periodsData.push({
        date: label,
        total: bucketIssues.length,
        blocker: bucketIssues.filter((i) => i.priority === "Blocker").length,
        critical: bucketIssues.filter((i) => i.priority === "Critical").length,
        high: bucketIssues.filter((i) => i.priority === "High").length,
        issues: bucketIssues.map((i) => ({
          key: i.key,
          summary: i.summary,
          assignee: i.assignee || "Unassigned",
          priority: i.priority,
          status: i.status,
        })),
      });
    }
  }

  return {
    healthStatus,
    healthReason,
    highSeveritySpike,
    unitLevelHigh,
    qaVelocityLow,
    risks,
    redAreas,
    unitLevelPct,
    unitLevelCount,
    throughput,
    qaVelocityCount,
    inTestingCount,
    recommendations,
    totalIssues: total,
    priorityMap,
    blockerCriticalCount,
    activeCounts,
    statusMap,
    productSideCount,
    launchSideCount,
    genericCount,
    periodsData,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ProjectHealth: React.FC = () => {
  const { data: health, isLoading, error } = useProjectHealth();
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const recentlyResolved = useDashboardStore((s) => s.recentlyResolved);
  const ageingIssues = useDashboardStore((s) => s.ageingIssues);
  const activeIssues = useDashboardStore((s) => s.activeIssues);
  const queryTimeRange = useDashboardStore((s) => s.queryTimeRange);
  const dateRange = useDashboardStore((s) => s.dateRange);
  const projectMetrics = useDashboardStore((s) => s.projectMetrics);
  const periodCreatedIssues = projectMetrics?.todayCreated ?? [];
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  // The KPI cards and the Risk Insights must quote identical numbers, so the
  // counts calculateProjectHealth derived from the Total Active Issues set are
  // handed straight to the analysis instead of being recomputed independently.
  const kpiCounts: ActiveIssueCounts | undefined = useMemo(
    () =>
      health
        ? {
            totalActive: health.totalIssues,
            critical: health.criticalCount,
            blocker: health.blockerCount,
            criticalBlocker: health.criticalBlockerCount,
            high: health.highSeverityCount,
            reopened: health.reopenedCount,
            slaBreach: health.slaBreachCount,
            closureRate: health.closureRate,
          }
        : undefined,
    [health],
  );

  const analysis = useMemo(
    () =>
      analyzeHealthData(
        rawIssues,
        periodCreatedIssues,
        recentlyResolved,
        queryTimeRange,
        ageingIssues,
        activeIssues,
        kpiCounts,
      ),
    [
      periodCreatedIssues,
      queryTimeRange,
      rawIssues,
      recentlyResolved,
      ageingIssues,
      activeIssues,
      kpiCounts,
    ],
  );

  if (isLoading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "200px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  if (error || !health)
    return <Alert type="error" message="Failed to load health data" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Export action (no project-health status banner) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button
          icon={<FilePdfOutlined />}
          onClick={() =>
            exportDashboardToPDF(
              "qa-dashboard-content",
              "Project_Health_Report",
            )
          }
          style={{
            background: "var(--qa-bg-card)",
            border: "1px solid var(--qa-border)",
            color: "var(--qa-text-primary)",
          }}
        >
          Export PDF
        </Button>
      </div>

      {/* KPI Stats — Critical, Blocker, High Severity and Reopened are all
          subsets of Total Active Issues, so each shows its share of the total. */}
      <Row gutter={[16, 16]}>
        {[
          {
            label: "Total Active Issues",
            value: health.totalIssues,
            color: "var(--qa-accent)",
            share: null as number | null,
          },
          {
            label: "Critical",
            value: health.criticalCount,
            color: "#ff4d4f",
            share: health.criticalCount,
          },
          {
            label: "Blocker",
            value: health.blockerCount,
            color: "#ff0033",
            share: health.blockerCount,
          },
          {
            label: "High Severity",
            value: health.highSeverityCount,
            color: "#fa8c16",
            share: health.highSeverityCount,
          },
          {
            label: "Reopened",
            value: health.reopenedCount,
            color: "#faad14",
            share: health.reopenedCount,
          },
        ].map((stat) => (
          <Col key={stat.label} xs={12} sm={8} md={4}>
            <NeonCard
              accent={stat.color}
              rainbow={false}
              speed="slow"
              bodyStyle={{ padding: "16px 12px", textAlign: "center" }}
            >
              <Statistic
                title={
                  <span style={{ fontSize: 11, color: "var(--qa-text-muted)" }}>
                    {stat.label}
                  </span>
                }
                value={stat.value}
                valueStyle={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: stat.color,
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  color: "var(--qa-text-muted)",
                  marginTop: 2,
                  minHeight: 14,
                }}
              >
                {stat.share === null
                  ? "Bug/Defect · not Done"
                  : health.totalIssues > 0
                    ? `${((stat.share / health.totalIssues) * 100).toFixed(1)}% of active`
                    : "—"}
              </div>
            </NeonCard>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]}>
        {/* Pie — Severity Distribution */}
        <Col xs={24} md={12}>
          <ChartCard
            title="Severity Distribution"
            id="severity-pie"
            height={200}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={health.severityDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: "var(--qa-text-muted)" }}
                >
                  {health.severityDistribution.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={SEVERITY_COLORS[entry.name] ?? "#888"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        {/* Line — Defect Trend */}
        <Col xs={24} md={12}>
          <ChartCard
            title={
              queryTimeRange === "last6months"
                ? "Weekly Defect Trend (26w)"
                : "Daily Defect Trend (30d)"
            }
            id="trend-line"
            height={200}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={health.defectTrend}
                margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--qa-border)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--qa-text-muted)" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--qa-text-muted)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--qa-bg-card)",
                    border: "1px solid var(--qa-border)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="created"
                  stroke="#ff4d4f"
                  name="Created"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  stroke="#52c41a"
                  name="Resolved"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="open"
                  stroke="#faad14"
                  name="Open"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* ── AI Health Analysis ────────────────────────────────────────── */}
      <NeonCard
        title={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span style={{ color: "var(--qa-text-primary)", fontWeight: 700 }}>
              🤖 AI Health Analysis
            </span>
            <Tag color="blue">{getTimeRangeLabel(queryTimeRange)}</Tag>
          </div>
        }
        bodyStyle={{ padding: 16 }}
        speed="slow"
      >
        {/* Issue Category Counts */}
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          {[
            {
              icon: <BugOutlined />,
              label: "Generic Active Bugs",
              value: analysis.genericCount,
              color: "#fa8c16",
            },
            {
              icon: <StopOutlined />,
              label: "Blocked (Product Side)",
              value: analysis.productSideCount,
              color: "#ff4d4f",
            },
            {
              icon: <RocketOutlined />,
              label: "In Progress (Launch Side)",
              value: analysis.launchSideCount,
              color: "#1677ff",
            },
            {
              icon: <CalendarOutlined />,
              label: `Bugs in Period`,
              value: analysis.totalIssues,
              color: "#722ed1",
            },
          ].map((item) => (
            <Col key={item.label} xs={12} sm={6}>
              <div
                style={{
                  background: `${item.color}12`,
                  border: `1px solid ${item.color}40`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22, color: item.color }}>
                  {item.icon}
                </div>
                <div
                  style={{ fontSize: 24, fontWeight: 700, color: item.color }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--qa-text-muted)",
                    marginTop: 2,
                  }}
                >
                  {item.label}
                </div>
              </div>
            </Col>
          ))}
        </Row>

        {/* Period trend chart */}
        {analysis.periodsData.length > 0 && (
          <>
            <ChartCard
              title={
                queryTimeRange === "last6months"
                  ? "Weekly Bug Creation — Last 6 Months"
                  : "Daily Bug Creation — Last Month"
              }
              id="ai-period-chart"
              height={220}
              style={{ marginBottom: 0 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analysis.periodsData}
                  margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
                  onClick={(e: any) => {
                    if (e?.activeLabel) {
                      setSelectedPeriod((prev) =>
                        prev === e.activeLabel ? null : e.activeLabel,
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--qa-border)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--qa-text-muted)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--qa-text-muted)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--qa-bg-card)",
                      border: "1px solid var(--qa-border)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="blocker"
                    name="Blocker"
                    stackId="a"
                    fill="#ff0033"
                  />
                  <Bar
                    dataKey="critical"
                    name="Critical"
                    stackId="a"
                    fill="#ff4d4f"
                  />
                  <Bar dataKey="high" name="High" stackId="a" fill="#fa8c16" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Bug detail table */}
            {(() => {
              const displayIssues = selectedPeriod
                ? (analysis.periodsData.find((p) => p.date === selectedPeriod)
                    ?.issues ?? [])
                : analysis.periodsData.flatMap((p) => p.issues);
              return displayIssues.length > 0 ? (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      background: "var(--qa-bg-elevated)",
                      border: "1px solid var(--qa-border)",
                      borderTop: 0,
                      borderRadius: "0 0 10px 10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--qa-text-primary)",
                      }}
                    >
                      {selectedPeriod
                        ? `🐛 Bugs on ${selectedPeriod}`
                        : "🐛 All Bugs in Period"}{" "}
                      — {displayIssues.length} issue
                      {displayIssues.length !== 1 ? "s" : ""}
                    </span>
                    {selectedPeriod && (
                      <Tag
                        color="blue"
                        style={{ cursor: "pointer", margin: 0 }}
                        onClick={() => setSelectedPeriod(null)}
                      >
                        ✕ Clear filter
                      </Tag>
                    )}
                  </div>
                  <Table
                    dataSource={displayIssues}
                    rowKey="key"
                    size="small"
                    pagination={
                      displayIssues.length > 10
                        ? { pageSize: 10, size: "small" }
                        : false
                    }
                    style={{
                      background: "var(--qa-bg-card)",
                      border: "1px solid var(--qa-border)",
                      borderTop: 0,
                      borderRadius: "0 0 10px 10px",
                    }}
                    columns={[
                      {
                        title: "Jira ID",
                        dataIndex: "key",
                        key: "key",
                        width: 120,
                        render: (key: string) => (
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--qa-accent)",
                              fontFamily: "monospace",
                            }}
                          >
                            {key}
                          </span>
                        ),
                      },
                      {
                        title: "Summary",
                        dataIndex: "summary",
                        key: "summary",
                        ellipsis: true,
                        render: (text: string) => (
                          <span
                            style={{
                              color: "var(--qa-text-secondary)",
                              fontSize: 12,
                            }}
                          >
                            {text}
                          </span>
                        ),
                      },
                      {
                        title: "Assignee",
                        dataIndex: "assignee",
                        key: "assignee",
                        width: 150,
                        render: (name: string) => (
                          <span
                            style={{
                              fontSize: 12,
                              color:
                                name === "Unassigned"
                                  ? "var(--qa-text-muted)"
                                  : "var(--qa-text-primary)",
                            }}
                          >
                            {name}
                          </span>
                        ),
                      },
                      {
                        title: "Priority",
                        dataIndex: "priority",
                        key: "priority",
                        width: 110,
                        render: (p: string) => (
                          <Tag
                            color={
                              p === "Blocker"
                                ? "red"
                                : p === "Critical"
                                  ? "volcano"
                                  : p === "High"
                                    ? "orange"
                                    : p === "Medium"
                                      ? "gold"
                                      : "green"
                            }
                            style={{ fontWeight: 600, margin: 0 }}
                          >
                            {p}
                          </Tag>
                        ),
                        filters: [
                          { text: "Blocker", value: "Blocker" },
                          { text: "Critical", value: "Critical" },
                          { text: "High", value: "High" },
                          { text: "Medium", value: "Medium" },
                          { text: "Low", value: "Low" },
                        ],
                        onFilter: (value: any, record: any) =>
                          record.priority === value,
                      },
                      {
                        title: "Status",
                        dataIndex: "status",
                        key: "status",
                        width: 140,
                        render: (s: string) => (
                          <Tag style={{ margin: 0, fontSize: 11 }}>{s}</Tag>
                        ),
                      },
                    ]}
                  />
                </div>
              ) : !selectedPeriod ? null : (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--qa-bg-elevated)",
                    border: "1px solid var(--qa-border)",
                    borderTop: 0,
                    borderRadius: "0 0 10px 10px",
                    marginBottom: 20,
                    color: "var(--qa-text-muted)",
                    fontSize: 13,
                  }}
                >
                  No bugs found for {selectedPeriod}
                </div>
              );
            })()}
          </>
        )}

        <Row gutter={[16, 16]}>
          {/* Key Risk Insights */}
          <Col xs={24} md={12}>
            <div
              style={{
                background: "var(--qa-bg-elevated)",
                border: "1px solid var(--qa-border)",
                borderRadius: 10,
                padding: 16,
                height: "100%",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 10,
                  color: "var(--qa-text-primary)",
                }}
              >
                🚨 Key Risk Insights
              </div>
              {analysis.risks.length === 0 ? (
                <div style={{ color: "#52c41a", fontSize: 13 }}>
                  ✅ No major risks detected
                </div>
              ) : (
                analysis.risks.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "var(--qa-text-secondary)",
                      marginBottom: 6,
                      paddingLeft: 4,
                    }}
                  >
                    {r}
                  </div>
                ))
              )}
            </div>
          </Col>

          {/* RED Areas + Priority breakdown */}
          <Col xs={24} md={12}>
            <div
              style={{
                background: "var(--qa-bg-elevated)",
                border: "1px solid var(--qa-border)",
                borderRadius: 10,
                padding: 16,
                height: "100%",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 10,
                  color: "var(--qa-text-primary)",
                }}
              >
                🔥 RED Areas
              </div>
              {analysis.redAreas.length === 0 ? (
                <div style={{ color: "var(--qa-text-muted)", fontSize: 13 }}>
                  No component data available
                </div>
              ) : (
                analysis.redAreas.map(([comp, count]) => (
                  <div
                    key={comp}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--qa-text-secondary)",
                      }}
                    >
                      {comp}
                    </span>
                    <Tag
                      color={
                        count >= 5 ? "red" : count >= 3 ? "orange" : "gold"
                      }
                      style={{ marginRight: 0, fontWeight: 600 }}
                    >
                      {count} issues
                    </Tag>
                  </div>
                ))
              )}
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid var(--qa-border)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {Object.entries(analysis.priorityMap).map(([p, c]) => (
                  <Tag
                    key={p}
                    style={{
                      background: `${SEVERITY_COLORS[p] ?? "#888"}22`,
                      border: `1px solid ${SEVERITY_COLORS[p] ?? "#888"}`,
                      color: SEVERITY_COLORS[p] ?? "#888",
                      fontWeight: 600,
                    }}
                  >
                    {p}: {c}
                  </Tag>
                ))}
              </div>
            </div>
          </Col>

          {/* Quality Concerns */}
          <Col xs={24} md={12}>
            <div
              style={{
                background: "var(--qa-bg-elevated)",
                border: "1px solid var(--qa-border)",
                borderRadius: 10,
                padding: 16,
                height: "100%",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 10,
                  color: "var(--qa-text-primary)",
                }}
              >
                📉 Quality Concerns
              </div>
              <div style={{ fontSize: 13 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: "var(--qa-text-secondary)" }}>
                    Unit Level Defects
                  </span>
                  <Tag
                    color={
                      analysis.unitLevelHigh
                        ? "red"
                        : analysis.unitLevelPct > 5
                          ? "orange"
                          : "green"
                    }
                    style={{ fontWeight: 700, marginRight: 0 }}
                  >
                    {analysis.unitLevelCount} (
                    {analysis.unitLevelPct.toFixed(1)}%)
                  </Tag>
                </div>
                <div
                  style={{
                    color: analysis.unitLevelHigh ? "#ff4d4f" : "#52c41a",
                    fontSize: 12,
                    marginTop: 6,
                  }}
                >
                  {analysis.unitLevelHigh
                    ? `⚠️ HIGH RISK — ${analysis.unitLevelPct.toFixed(1)}% unit-level defects indicate poor pre-integration quality. Threshold: 10%.`
                    : `✅ Unit-level defect rate is within acceptable range (≤10%).`}
                </div>
              </div>
            </div>
          </Col>

          {/* QA Velocity */}
          <Col xs={24} md={12}>
            <div
              style={{
                background: "var(--qa-bg-elevated)",
                border: "1px solid var(--qa-border)",
                borderRadius: 10,
                padding: 16,
                height: "100%",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 10,
                  color: "var(--qa-text-primary)",
                }}
              >
                ⚡ QA Velocity Insight
              </div>
              <div style={{ fontSize: 13 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  {[
                    {
                      label: "QA Done / Ready For Production",
                      value: analysis.qaVelocityCount,
                      color: "#52c41a",
                    },
                    {
                      label: "Ready For Testing",
                      value: analysis.inTestingCount,
                      color: "#faad14",
                    },
                    {
                      label: "Ready For Testing",
                      value: analysis.statusMap["Ready For Testing"] ?? 0,
                      color: "#faad14",
                    },
                  ]
                    .filter((_, i) => i < 2)
                    .map((s) => (
                      <div
                        key={s.label}
                        style={{
                          flex: 1,
                          minWidth: 100,
                          background: `${s.color}12`,
                          border: `1px solid ${s.color}40`,
                          borderRadius: 8,
                          padding: "8px 12px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: s.color,
                          }}
                        >
                          {s.value}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--qa-text-muted)",
                          }}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                </div>
                <Tag
                  color={
                    analysis.throughput === "High"
                      ? "green"
                      : analysis.throughput === "Medium"
                        ? "gold"
                        : "red"
                  }
                  style={{ fontWeight: 700 }}
                >
                  Throughput: {analysis.throughput}
                </Tag>
                {analysis.qaVelocityLow && (
                  <div
                    style={{
                      color: "#ff4d4f",
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
                    ⚠️ Velocity imbalance — too many items queued for testing vs
                    completed. Consider parallel test execution.
                  </div>
                )}
              </div>
            </div>
          </Col>

          {/* Recommended Actions */}
          <Col xs={24}>
            <div
              style={{
                background: "var(--qa-bg-elevated)",
                border: "1px solid var(--qa-border)",
                borderRadius: 10,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 4,
                  color: "var(--qa-text-primary)",
                }}
              >
                ✅ Recommended Actions
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--qa-text-muted)",
                  marginBottom: 12,
                }}
              >
                QA and Manager views of the same data — each action tagged
                Technical, Delivery or Project level.
              </div>
              <Row gutter={[16, 16]}>
                {(
                  [
                    {
                      perspective: "QA" as ActionPerspective,
                      heading: "🧪 QA Perspective",
                      accent: "#13c2c2",
                    },
                    {
                      perspective: "Manager" as ActionPerspective,
                      heading: "📋 Manager Perspective",
                      accent: "#722ed1",
                    },
                  ] as const
                ).map((group) => {
                  const items = analysis.recommendations.filter(
                    (r) => r.perspective === group.perspective,
                  );
                  return (
                    <Col key={group.perspective} xs={24} lg={12}>
                      <div
                        style={{
                          background: `${group.accent}0d`,
                          border: `1px solid ${group.accent}40`,
                          borderRadius: 10,
                          padding: 14,
                          height: "100%",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: group.accent,
                            marginBottom: 10,
                          }}
                        >
                          {group.heading}{" "}
                          <span
                            style={{
                              fontWeight: 500,
                              color: "var(--qa-text-muted)",
                            }}
                          >
                            ({items.length})
                          </span>
                        </div>
                        {items.length === 0 ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--qa-text-muted)",
                            }}
                          >
                            No actions required.
                          </div>
                        ) : (
                          items.map((rec, i) => (
                            <div
                              key={`${group.perspective}-${i}`}
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                                marginBottom: 10,
                              }}
                            >
                              <span
                                style={{
                                  minWidth: 18,
                                  color: group.accent,
                                  fontWeight: 700,
                                  fontSize: 12,
                                  lineHeight: "20px",
                                }}
                              >
                                {i + 1}.
                              </span>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 4,
                                    flexWrap: "wrap",
                                    marginBottom: 3,
                                  }}
                                >
                                  <Tag
                                    style={{
                                      margin: 0,
                                      fontSize: 10,
                                      lineHeight: "16px",
                                    }}
                                    color={LEVEL_COLORS[rec.level]}
                                  >
                                    {rec.level}
                                  </Tag>
                                  <Tag
                                    style={{
                                      margin: 0,
                                      fontSize: 10,
                                      lineHeight: "16px",
                                    }}
                                    color={PRIORITY_COLORS[rec.priority]}
                                  >
                                    {rec.priority}
                                  </Tag>
                                </div>
                                <div
                                  style={{
                                    fontSize: 12.5,
                                    color: "var(--qa-text-secondary)",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {rec.text}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </Col>
        </Row>
      </NeonCard>

      {/* Key Drivers */}
      <NeonCard title="Key Drivers" speed="slow" bodyStyle={{ padding: 16 }}>
        <List
          dataSource={health.keyDrivers}
          renderItem={(item) => (
            <List.Item
              style={{ borderColor: "var(--qa-border)", padding: "8px 0" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--qa-text-muted)", fontSize: 16 }}>
                  •
                </span>
                <span
                  style={{ color: "var(--qa-text-secondary)", fontSize: 13 }}
                >
                  {item}
                </span>
              </div>
            </List.Item>
          )}
        />
      </NeonCard>
    </div>
  );
};

export default ProjectHealth;
