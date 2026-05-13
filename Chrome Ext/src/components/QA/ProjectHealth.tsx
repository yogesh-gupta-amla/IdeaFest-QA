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
  recommendations: string[];
  totalIssues: number;
  priorityMap: Record<string, number>;
  blockerCriticalCount: number;
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

  // Use ageing dataset (canonical lifetime Critical/Blocker query) when available
  // This syncs the count with the Ageing Analysis tab
  const blockerCriticalCount =
    normalizedAgeing.length > 0
      ? normalizedAgeing.length
      : (priorityMap["Blocker"] ?? 0) + (priorityMap["Critical"] ?? 0);
  const highSeverityRatio = total > 0 ? blockerCriticalCount / total : 0;
  const highSeveritySpike = total > 0 && highSeverityRatio > 0.4;

  // RED area distribution — use ageing issues (same as Ageing tab) when available
  const highSeveritySource =
    normalizedAgeing.length > 0
      ? normalizedAgeing
      : issuesInPeriod.filter(
          (i) => i.priority === "Blocker" || i.priority === "Critical",
        );
  const redAreaSource =
    highSeveritySource.length > 0 ? highSeveritySource : issuesInPeriod;

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
        `${(highSeverityRatio * 100).toFixed(0)}% Blocker/Critical — exceeds 40% threshold`,
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

  // Key risks
  const risks: string[] = [];
  if (highSeveritySpike)
    risks.push(
      `🔴 ${(highSeverityRatio * 100).toFixed(0)}% of new issues are Blocker/Critical — high severity spike`,
    );
  if (redAreas.length > 0 && highSeveritySpike)
    risks.push(
      `🔴 Top impacted modules: ${redAreas
        .slice(0, 3)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ")}`,
    );
  if (unitLevelHigh)
    risks.push(
      `🔴 ${unitLevelPct.toFixed(1)}% Unit Level defects — indicates poor unit testing or early leakage`,
    );
  if (qaVelocityLow)
    risks.push(
      `🟠 QA velocity is LOW — ${inTestingCount} items queued for testing, only ${qaVelocityCount} completed`,
    );
  if (productSideCount > 0)
    risks.push(
      `🟠 ${productSideCount} issues blocked on product side — pending owner resolution`,
    );
  if (total > 20 && !highSeveritySpike)
    risks.push(
      `🟠 ${total} new bugs/defects in this period — elevated defect creation rate`,
    );

  // Recommended actions
  const recommendations: string[] = [];
  if (highSeveritySpike) {
    const topComp = redAreas[0]?.[0];
    recommendations.push(
      `⚡ Conduct immediate triage on ${topComp ? `"${topComp}"` : "high-severity modules"}. Assign senior QA engineers to all Blocker/Critical items.`,
    );
  }
  if (unitLevelHigh)
    recommendations.push(
      `⚡ Enforce unit test reviews before code merge. ${unitLevelCount} unit-level defects indicate pre-integration quality gaps.`,
    );
  if (qaVelocityLow)
    recommendations.push(
      `⚡ Clear the "Ready For Testing" backlog (${inTestingCount} items). Consider parallel testing or additional QA resources.`,
    );
  if (productSideCount > 0)
    recommendations.push(
      `⚡ Escalate ${productSideCount} blocked product-side issues with defined owner ETAs and daily follow-ups.`,
    );
  if (recommendations.length < 3)
    recommendations.push(
      `✅ Maintain daily triage cadence to prevent severity accumulation across sprints.`,
    );
  if (recommendations.length < 4)
    recommendations.push(
      `✅ Review test coverage for components with recurring defects to reduce reopen rates.`,
    );
  if (recommendations.length < 5)
    recommendations.push(
      `✅ Set up automated alerts for Blocker/Critical spike detection to enable faster response.`,
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

  const analysis = useMemo(
    () =>
      analyzeHealthData(
        rawIssues,
        periodCreatedIssues,
        recentlyResolved,
        queryTimeRange,
        ageingIssues,
        activeIssues,
      ),
    [
      periodCreatedIssues,
      queryTimeRange,
      rawIssues,
      recentlyResolved,
      ageingIssues,
      activeIssues,
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

      {/* KPI Stats */}
      <Row gutter={[16, 16]}>
        {[
          {
            label: "Total Active Issues",
            value: health.totalIssues,
            color: "var(--qa-accent)",
          },
          {
            label: "Critical / Blocker",
            value: health.criticalBlockerCount,
            color: "#ff4d4f",
          },
          {
            label: "High Severity",
            value: health.highSeverityCount,
            color: "#fa8c16",
          },
          { label: "Reopened", value: health.reopenedCount, color: "#faad14" },
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
                  marginBottom: 10,
                  color: "var(--qa-text-primary)",
                }}
              >
                ✅ Recommended Actions
              </div>
              {analysis.recommendations.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 13,
                    color: "var(--qa-text-secondary)",
                    marginBottom: 8,
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      minWidth: 20,
                      color: "var(--qa-accent)",
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}.
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
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
