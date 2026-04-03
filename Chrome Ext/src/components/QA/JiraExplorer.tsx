import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Button,
  Select,
  Table,
  Spin,
  Tag,
  InputNumber,
  Tooltip,
  Dropdown,
} from "antd";
import {
  PlayCircleOutlined,
  SearchOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
  CodeOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
} from "recharts";
import { useDashboardStore } from "../../store/useStore";
import { runJqlQuery, type RawJiraIssue } from "../../services/jiraService";
import NeonCard from "../common/NeonCard";
import {
  applyExplorerTimeRange,
  buildExplorerBaseJql,
  getTimeRangeLabel,
} from "../../utils/queryTimeRange";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb7185",
  "#4ade80",
  "#818cf8",
  "#e879f9",
  "#2dd4bf",
  "#fb923c",
  "#38bdf8",
  "#facc15",
  "#c084fc",
];

const PRIORITY_COLORS: Record<string, string> = {
  Highest: "#f43f5e",
  Critical: "#f43f5e",
  High: "#f97316",
  Medium: "#f59e0b",
  Low: "#22c55e",
  Lowest: "#6366f1",
  None: "#6b7280",
};

const STATUS_CAT_COLORS: Record<string, string> = {
  "To Do": "#6b7280",
  "In Progress": "#3b82f6",
  Done: "#22c55e",
  Unknown: "#6b7280",
};

const GROUP_BY_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "issueType", label: "Issue Type" },
  { value: "project", label: "Project" },
  { value: "resolution", label: "Resolution" },
  { value: "sprint", label: "Sprint" },
  { value: "component", label: "Component" },
  { value: "label", label: "Label" },
  { value: "fixVersion", label: "Fix Version" },
  { value: "epic", label: "Epic / Parent" },
  { value: "created_day", label: "Created (Day)" },
  { value: "created_week", label: "Created (Week)" },
  { value: "updated_day", label: "Updated (Day)" },
  { value: "reporter", label: "Reporter" },
  { value: "statusCategory", label: "Status Category" },
];

const METRIC_OPTIONS = [
  { value: "count", label: "Count of Issues" },
  { value: "storyPoints", label: "Story Points (Sum)" },
  { value: "timeSpent", label: "Time Spent (hours)" },
  { value: "timeEstimate", label: "Time Estimate (hours)" },
];

const CHART_TYPE_OPTIONS = [
  { value: "bar", label: "Bar Chart (Vertical)" },
  { value: "hbar", label: "Bar Chart (Horizontal)" },
  { value: "line", label: "Line Chart" },
  { value: "area", label: "Area Chart" },
  { value: "pie", label: "Pie Chart" },
  { value: "donut", label: "Donut Chart" },
  { value: "radar", label: "Radar Chart" },
  { value: "treemap", label: "Treemap" },
  { value: "stacked_bar", label: "Stacked Bar" },
];

const SECOND_DIM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "priority", label: "Priority" },
  { value: "issueType", label: "Issue Type" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "statusCategory", label: "Status Category" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGroupKeys(issue: RawJiraIssue, groupBy: string): string[] {
  switch (groupBy) {
    case "status":
      return [issue.status || "Unknown"];
    case "assignee":
      return [issue.assignee || "Unassigned"];
    case "priority":
      return [issue.priority || "None"];
    case "issueType":
      return [issue.issueType || "Unknown"];
    case "project":
      return [issue.project || "Unknown"];
    case "resolution":
      return [issue.resolution || "Unresolved"];
    case "sprint":
      return [issue.sprint || "No Sprint"];
    case "component":
      return issue.components.length > 0 ? issue.components : ["No Component"];
    case "label":
      return issue.labels.length > 0 ? issue.labels : ["No Label"];
    case "fixVersion":
      return issue.fixVersions.length > 0
        ? issue.fixVersions
        : ["No Fix Version"];
    case "epic":
      return [issue.epic || "No Epic"];
    case "reporter":
      return [issue.reporter || "Unknown"];
    case "statusCategory":
      return [issue.statusCategory || "Unknown"];
    case "created_day":
      return [issue.created ? issue.created.slice(0, 10) : "Unknown"];
    case "created_week": {
      if (!issue.created) return ["Unknown"];
      const d = new Date(issue.created);
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7,
      );
      return [`${d.getFullYear()}-W${String(week).padStart(2, "0")}`];
    }
    case "updated_day":
      return [issue.updated ? issue.updated.slice(0, 10) : "Unknown"];
    default:
      return ["Unknown"];
  }
}

function getMetricValue(issue: RawJiraIssue, metric: string): number {
  switch (metric) {
    case "count":
      return 1;
    case "storyPoints":
      return issue.storyPoints || 0;
    case "timeSpent":
      return issue.timeSpent
        ? Math.round((issue.timeSpent / 3600) * 10) / 10
        : 0;
    case "timeEstimate":
      return issue.timeEstimate
        ? Math.round((issue.timeEstimate / 3600) * 10) / 10
        : 0;
    default:
      return 1;
  }
}

function getMetricLabel(metric: string): string {
  switch (metric) {
    case "count":
      return "Issues";
    case "storyPoints":
      return "Story Points";
    case "timeSpent":
      return "Hours Spent";
    case "timeEstimate":
      return "Estimated Hours";
    default:
      return "Value";
  }
}

function buildChartData(
  issues: RawJiraIssue[],
  groupBy: string,
  metric: string,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const issue of issues) {
    for (const key of getGroupKeys(issue, groupBy)) {
      map.set(key, (map.get(key) || 0) + getMetricValue(issue, metric));
    }
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => b.value - a.value);
}

function buildStackedData(
  issues: RawJiraIssue[],
  groupBy: string,
  secondDim: string,
  metric: string,
): { name: string; [key: string]: number | string }[] {
  const rowKeys = new Set<string>();
  const colKeys = new Set<string>();

  for (const issue of issues) {
    for (const rk of getGroupKeys(issue, groupBy)) rowKeys.add(rk);
    for (const ck of getGroupKeys(issue, secondDim)) colKeys.add(ck);
  }

  const grid = new Map<string, Map<string, number>>();
  for (const rk of rowKeys) grid.set(rk, new Map());

  for (const issue of issues) {
    const mv = getMetricValue(issue, metric);
    for (const rk of getGroupKeys(issue, groupBy)) {
      for (const ck of getGroupKeys(issue, secondDim)) {
        const row = grid.get(rk)!;
        row.set(ck, (row.get(ck) || 0) + mv);
      }
    }
  }

  const result: { name: string; [key: string]: number | string }[] = [];
  for (const [rk, row] of grid.entries()) {
    const entry: { name: string; [key: string]: number | string } = {
      name: rk,
    };
    for (const ck of colKeys) {
      entry[ck] = Math.round((row.get(ck) || 0) * 10) / 10;
    }
    result.push(entry);
  }

  const colArray = Array.from(colKeys);
  return { data: result, cols: colArray } as unknown as {
    name: string;
    [key: string]: number | string;
  }[];
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({
  active,
  payload,
  label,
  metricLabel,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; fill?: string }[];
  label?: string;
  metricLabel: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--qa-bg-card)",
        border: "1px solid var(--qa-border)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        color: "var(--qa-text-primary)",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: 4,
          color: "var(--qa-text-primary)",
        }}
      >
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill || "#6366f1" }}>
          {p.name ? `${p.name}: ` : ""}
          {p.value} {p.name ? "" : metricLabel}
        </div>
      ))}
    </div>
  );
};

// ─── Pie Label ────────────────────────────────────────────────────────────────

const renderPieLabel = ({
  name,
  percent,
}: {
  name: string;
  percent: number;
}) => (percent > 0.04 ? `${name} (${(percent * 100).toFixed(1)}%)` : "");

// ─── Main Component ───────────────────────────────────────────────────────────

const JiraExplorer: React.FC = () => {
  const { jiraUrl, authToken, authMode, projectKey, queryTimeRange } =
    useDashboardStore();

  const [jql, setJql] = useState(() =>
    buildExplorerBaseJql(projectKey, queryTimeRange),
  );
  const [maxResults, setMaxResults] = useState(500);
  const [running, setRunning] = useState(false);
  const [issues, setIssues] = useState<RawJiraIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [rawJson, setRawJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "table" | "response">(
    "chart",
  );

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setJql(buildExplorerBaseJql(projectKey, queryTimeRange));
  }, [projectKey, queryTimeRange]);

  // Chart settings
  const [groupBy, setGroupBy] = useState("status");
  const [metric, setMetric] = useState("count");
  const [chartType, setChartType] = useState("bar");
  const [secondDim, setSecondDim] = useState("none");
  const [topN, setTopN] = useState(20);

  const handleRun = async () => {
    if (!jql.trim()) return;
    setRunning(true);
    setError(null);
    try {
      const token = authMode === "token" ? authToken : null;
      const result = await runJqlQuery(
        jiraUrl,
        applyExplorerTimeRange(jql.trim(), queryTimeRange),
        maxResults,
        token,
      );
      if (result.success && result.issues) {
        setIssues(result.issues);
        setTotal(result.total ?? result.issues.length);
        setRawJson(JSON.stringify(result.issues, null, 2));
        setHasRun(true);
      } else {
        setError(result.error || "Query failed. Check your JQL syntax.");
        setIssues([]);
        setRawJson("");
      }
    } finally {
      setRunning(false);
    }
  };

  const downloadChart = async (format: "png" | "pdf") => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: "#13151f",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const filename = `jira-chart-${groupBy}-${metric}`;
    if (format === "png") {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.png`;
      a.click();
    } else {
      const imgData = canvas.toDataURL("image/png");
      const w = canvas.width / 2;
      const h = canvas.height / 2;
      const pdf = new jsPDF({
        orientation: w > h ? "landscape" : "portrait",
        unit: "px",
        format: [w, h],
      });
      pdf.addImage(imgData, "PNG", 0, 0, w, h);
      pdf.save(`${filename}.pdf`);
    }
  };

  // Chart data
  const isStacked = chartType === "stacked_bar" && secondDim !== "none";
  const stackResult = useMemo(() => {
    if (!isStacked) return null;
    return buildStackedData(issues, groupBy, secondDim, metric) as unknown as {
      data: { name: string; [k: string]: number | string }[];
      cols: string[];
    };
  }, [issues, groupBy, secondDim, metric, isStacked]);

  const chartData = useMemo(() => {
    const raw = buildChartData(issues, groupBy, metric);
    return topN > 0 ? raw.slice(0, topN) : raw;
  }, [issues, groupBy, metric, topN]);

  const metricLabel = getMetricLabel(metric);

  // Table columns
  const tableColumns = [
    {
      title: "Key",
      dataIndex: "key",
      key: "key",
      width: 110,
      render: (v: string) => (
        <span style={{ color: "#6366f1", fontWeight: 600, fontSize: 12 }}>
          {v}
        </span>
      ),
    },
    {
      title: "Summary",
      dataIndex: "summary",
      key: "summary",
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ fontSize: 12 }}>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (v: string, row: RawJiraIssue) => (
        <Tag
          color={STATUS_CAT_COLORS[row.statusCategory] || "#6b7280"}
          style={{ fontSize: 11 }}
        >
          {v}
        </Tag>
      ),
    },
    {
      title: "Type",
      dataIndex: "issueType",
      key: "issueType",
      width: 90,
      render: (v: string) => <Tag style={{ fontSize: 11 }}>{v}</Tag>,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 90,
      render: (v: string) => (
        <span
          style={{
            color: PRIORITY_COLORS[v] || "#6b7280",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {v}
        </span>
      ),
    },
    {
      title: "Assignee",
      dataIndex: "assignee",
      key: "assignee",
      width: 130,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    {
      title: "Sprint",
      dataIndex: "sprint",
      key: "sprint",
      width: 130,
      ellipsis: true,
      render: (v: string) => (
        <span style={{ fontSize: 11, color: "var(--qa-text-muted)" }}>
          {v || "—"}
        </span>
      ),
    },
    {
      title: "SP",
      dataIndex: "storyPoints",
      key: "storyPoints",
      width: 55,
      render: (v: number | null) => (
        <span
          style={{
            fontSize: 12,
            color: v ? "#22d3ee" : "var(--qa-text-muted)",
          }}
        >
          {v ?? "—"}
        </span>
      ),
    },
    {
      title: "Created",
      dataIndex: "created",
      key: "created",
      width: 95,
      render: (v: string) => (
        <span style={{ fontSize: 11, color: "var(--qa-text-muted)" }}>
          {v ? v.slice(0, 10) : "—"}
        </span>
      ),
    },
  ];

  // ─── Render Chart ─────────────────────────────────────────────────────────

  const renderChart = () => {
    if (!hasRun) return null;
    if (running)
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 300,
          }}
        >
          <Spin size="large" />
        </div>
      );
    if (!issues.length)
      return (
        <div
          style={{
            textAlign: "center",
            color: "var(--qa-text-muted)",
            padding: 60,
          }}
        >
          No data to chart
        </div>
      );

    const data = chartData;
    if (!data.length)
      return (
        <div
          style={{
            textAlign: "center",
            color: "var(--qa-text-muted)",
            padding: 60,
          }}
        >
          No chart data for selected grouping
        </div>
      );

    const axisStyle = { fill: "var(--qa-text-muted)", fontSize: 11 };
    const gridStyle = { stroke: "var(--qa-border)", strokeDasharray: "3 3" };
    const tooltipContent = <CustomTooltip metricLabel={metricLabel} />;

    if (chartType === "pie" || chartType === "donut") {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={chartType === "donut" ? 140 : 150}
              innerRadius={chartType === "donut" ? 70 : 0}
              label={renderPieLabel}
              labelLine={true}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <RechartTooltip
              formatter={(v: number) => [`${v} ${metricLabel}`, ""]}
              contentStyle={{
                background: "var(--qa-bg-card)",
                border: "1px solid var(--qa-border)",
                borderRadius: 8,
              }}
              labelStyle={{ color: "var(--qa-text-primary)" }}
              itemStyle={{ color: "var(--qa-text-secondary)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "var(--qa-text-secondary)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "radar") {
      const radarData = data.map((d) => ({
        subject: d.name,
        value: d.value,
        fullMark: data[0]?.value || 1,
      }));
      return (
        <ResponsiveContainer width="100%" height={360}>
          <RadarChart data={radarData}>
            <PolarGrid gridType="polygon" stroke="var(--qa-border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "var(--qa-text-muted)", fontSize: 11 }}
            />
            <PolarRadiusAxis tick={axisStyle} />
            <Radar
              name={metricLabel}
              dataKey="value"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.35}
            />
            <RechartTooltip
              formatter={(v: number) => [`${v} ${metricLabel}`, metricLabel]}
              contentStyle={{
                background: "var(--qa-bg-card)",
                border: "1px solid var(--qa-border)",
                borderRadius: 8,
              }}
              labelStyle={{ color: "var(--qa-text-primary)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "var(--qa-text-secondary)" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "treemap") {
      const treemapData = data.map((d) => ({ name: d.name, size: d.value }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const TreemapContent = (props: any) => {
        const { x, y, width, height, name, value } = props;
        if (!width || !height || width < 20 || height < 16) return <g />;
        const idx = treemapData.findIndex((d) => d.name === name);
        return (
          <g>
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              style={{
                fill: COLORS[idx % COLORS.length],
                stroke: "var(--qa-bg-primary)",
                strokeWidth: 2,
              }}
              rx={4}
            />
            {width > 50 && height > 24 && (
              <text
                x={x + width / 2}
                y={y + height / 2 - 6}
                textAnchor="middle"
                fill="#fff"
                fontSize={11}
                fontWeight={600}
              >
                {(name || "").length > 16
                  ? (name || "").slice(0, 14) + "…"
                  : name}
              </text>
            )}
            {width > 50 && height > 40 && (
              <text
                x={x + width / 2}
                y={y + height / 2 + 10}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize={10}
              >
                {value}
              </text>
            )}
          </g>
        );
      };
      return (
        <ResponsiveContainer width="100%" height={360}>
          <Treemap
            data={treemapData}
            dataKey="size"
            aspectRatio={4 / 3}
            content={<TreemapContent />}
          />
        </ResponsiveContainer>
      );
    }

    if (chartType === "stacked_bar" && isStacked && stackResult) {
      const { data: sData, cols } = stackResult;
      return (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={sData}
            margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
          >
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="name"
              tick={axisStyle}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={axisStyle} />
            <RechartTooltip
              contentStyle={{
                background: "var(--qa-bg-card)",
                border: "1px solid var(--qa-border)",
                borderRadius: 8,
              }}
              labelStyle={{ color: "var(--qa-text-primary)", fontWeight: 600 }}
              itemStyle={{ fontSize: 12 }}
            />
            <Legend
              wrapperStyle={{
                fontSize: 12,
                color: "var(--qa-text-secondary)",
                paddingTop: 20,
              }}
            />
            {cols.map((col, i) => (
              <Bar
                key={col}
                dataKey={col}
                stackId="a"
                fill={COLORS[i % COLORS.length]}
                radius={i === cols.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "hbar") {
      return (
        <ResponsiveContainer
          width="100%"
          height={Math.max(320, data.length * 32 + 60)}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
          >
            <CartesianGrid {...gridStyle} horizontal={false} />
            <XAxis type="number" tick={axisStyle} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: "var(--qa-text-secondary)", fontSize: 12 }}
              width={115}
            />
            <RechartTooltip content={tooltipContent} />
            <Bar dataKey="value" name={metricLabel} radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
          >
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="name"
              tick={axisStyle}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={axisStyle} />
            <RechartTooltip content={tooltipContent} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "var(--qa-text-secondary)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={metricLabel}
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4, fill: "#6366f1" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridStyle} />
            <XAxis
              dataKey="name"
              tick={axisStyle}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={axisStyle} />
            <RechartTooltip content={tooltipContent} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "var(--qa-text-secondary)" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name={metricLabel}
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#areaGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar (vertical)
    return (
      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 80 }}
        >
          <CartesianGrid {...gridStyle} />
          <XAxis
            dataKey="name"
            tick={axisStyle}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={axisStyle} />
          <RechartTooltip content={tooltipContent} />
          <Bar dataKey="value" name={metricLabel} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const effectiveJql = useMemo(
    () => applyExplorerTimeRange(jql, queryTimeRange),
    [jql, queryTimeRange],
  );

  // ─── Panel style helpers ──────────────────────────────────────────────────

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <NeonCard speed="slow" bodyStyle={{ padding: "16px 20px", ...extra }}>
      {children}
    </NeonCard>
  );

  const tabBtn = (key: string, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(key as "chart" | "table" | "response")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 16px",
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        fontWeight: activeTab === key ? 600 : 400,
        fontSize: 13,
        background: activeTab === key ? "var(--qa-accent)" : "transparent",
        color: activeTab === key ? "#fff" : "var(--qa-text-muted)",
        transition: "all 0.15s",
      }}
    >
      {icon} {label}
    </button>
  );

  const selectStyle: React.CSSProperties = {
    background: "var(--qa-bg-secondary)",
    color: "var(--qa-text-primary)",
    border: "1px solid var(--qa-border)",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <SearchOutlined style={{ fontSize: 20, color: "var(--qa-accent)" }} />
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "var(--qa-text-primary)",
            }}
          >
            Jira Explorer
          </h2>
        </div>
        <p style={{ margin: 0, color: "var(--qa-text-muted)", fontSize: 13 }}>
          Run any JQL query and visualise results as charts, tables, or raw JSON
        </p>
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "var(--qa-text-secondary)",
          }}
        >
          Time window: <strong>{getTimeRangeLabel(queryTimeRange)}</strong>. If
          your JQL does not include an explicit date filter, the selected window
          is applied automatically.
        </div>
      </div>

      {/* Query Input */}
      {card(
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <textarea
                value={jql}
                onChange={(e) => setJql(e.target.value)}
                placeholder="Enter JQL — e.g. project = GSW AND status != Done ORDER BY priority ASC"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                    handleRun();
                }}
                style={{
                  width: "100%",
                  minHeight: 72,
                  resize: "vertical",
                  background: "var(--qa-bg-secondary)",
                  color: "var(--qa-text-primary)",
                  border: "1px solid var(--qa-border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontFamily: "monospace",
                  outline: "none",
                  lineHeight: 1.5,
                }}
              />
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--qa-text-muted)",
                  fontFamily: "monospace",
                  wordBreak: "break-word",
                }}
              >
                Effective query: {effectiveJql || "-"}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minWidth: 160,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--qa-text-muted)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Max results
                </span>
                <InputNumber
                  value={maxResults}
                  onChange={(v) => setMaxResults(v || 500)}
                  min={1}
                  max={1000}
                  step={100}
                  style={{ width: 80 }}
                  size="small"
                />
              </div>
              <Button
                type="primary"
                icon={running ? <Spin size="small" /> : <PlayCircleOutlined />}
                onClick={handleRun}
                disabled={running || !jql.trim()}
                style={{ borderRadius: 8, fontWeight: 600, height: 40 }}
              >
                {running ? "Running…" : "Run Query"}
              </Button>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--qa-text-muted)",
                  textAlign: "center",
                }}
              >
                Ctrl+Enter to run
              </div>
            </div>
          </div>
        </div>,
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 12,
            background: "rgba(244,63,94,0.1)",
            border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#f43f5e",
            fontSize: 13,
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <InfoCircleOutlined style={{ marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {hasRun && (
        <div style={{ marginTop: 16 }}>
          {/* Result summary + Tab switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 13, color: "var(--qa-text-muted)" }}>
              Showing{" "}
              <span
                style={{ color: "var(--qa-text-primary)", fontWeight: 600 }}
              >
                {issues.length}
              </span>
              {total > issues.length && (
                <>
                  {" "}
                  of{" "}
                  <span style={{ color: "var(--qa-accent)", fontWeight: 600 }}>
                    {total}
                  </span>{" "}
                  total
                </>
              )}{" "}
              issues
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--qa-bg-secondary)",
                borderRadius: 10,
                padding: 4,
              }}
            >
              {tabBtn("chart", <BarChartOutlined />, "Chart")}
              {tabBtn("table", <UnorderedListOutlined />, "Table")}
              {tabBtn("response", <CodeOutlined />, "Response")}
            </div>
          </div>

          {/* Chart Tab */}
          {activeTab === "chart" &&
            card(
              <div ref={chartRef}>
                {/* Controls row */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--qa-text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      GROUP BY
                    </div>
                    <select
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value)}
                      style={selectStyle}
                    >
                      {GROUP_BY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--qa-text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      METRIC
                    </div>
                    <select
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                      style={selectStyle}
                    >
                      {METRIC_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--qa-text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      CHART TYPE
                    </div>
                    <select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value)}
                      style={selectStyle}
                    >
                      {CHART_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {chartType === "stacked_bar" && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--qa-text-muted)",
                          marginBottom: 4,
                        }}
                      >
                        STACK BY
                      </div>
                      <select
                        value={secondDim}
                        onChange={(e) => setSecondDim(e.target.value)}
                        style={selectStyle}
                      >
                        {SECOND_DIM_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {chartType !== "treemap" &&
                    chartType !== "pie" &&
                    chartType !== "donut" &&
                    chartType !== "radar" && (
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--qa-text-muted)",
                            marginBottom: 4,
                          }}
                        >
                          TOP N
                        </div>
                        <select
                          value={topN}
                          onChange={(e) => setTopN(Number(e.target.value))}
                          style={selectStyle}
                        >
                          <option value={10}>Top 10</option>
                          <option value={15}>Top 15</option>
                          <option value={20}>Top 20</option>
                          <option value={30}>Top 30</option>
                          <option value={0}>All</option>
                        </select>
                      </div>
                    )}
                  <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: "png",
                            icon: <FileImageOutlined />,
                            label: "Download as PNG",
                            onClick: () => downloadChart("png"),
                          },
                          {
                            key: "pdf",
                            icon: <FilePdfOutlined />,
                            label: "Download as PDF",
                            onClick: () => downloadChart("pdf"),
                          },
                        ],
                      }}
                      placement="bottomRight"
                    >
                      <Button
                        icon={<DownloadOutlined />}
                        style={{ borderRadius: 8 }}
                      >
                        Export
                      </Button>
                    </Dropdown>
                  </div>
                </div>

                {/* Chart */}
                <div style={{ overflowX: "auto" }}>{renderChart()}</div>

                {/* Summary stats below chart */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 16,
                    flexWrap: "wrap",
                    borderTop: "1px solid var(--qa-border)",
                    paddingTop: 14,
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
                    <span
                      style={{
                        color: "var(--qa-text-primary)",
                        fontWeight: 600,
                      }}
                    >
                      {chartData.length}
                    </span>{" "}
                    categories
                  </div>
                  <div style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
                    Total {metricLabel}:{" "}
                    <span
                      style={{ color: "var(--qa-accent)", fontWeight: 600 }}
                    >
                      {chartData
                        .reduce((s, d) => s + d.value, 0)
                        .toFixed(1)
                        .replace(/\.0$/, "")}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
                    Max:{" "}
                    <span style={{ color: "#22d3ee", fontWeight: 600 }}>
                      {chartData[0]?.name} ({chartData[0]?.value})
                    </span>
                  </div>
                </div>
              </div>,
            )}

          {/* Table Tab */}
          {activeTab === "table" &&
            card(
              <Table
                dataSource={issues}
                columns={tableColumns}
                rowKey="key"
                size="small"
                scroll={{ x: 900 }}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showTotal: (t) => `${t} issues`,
                }}
                style={{ fontSize: 12 }}
              />,
            )}

          {/* Response Tab */}
          {activeTab === "response" &&
            card(
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--qa-text-muted)" }}>
                    Raw JSON — {issues.length} issues
                  </span>
                  <Button
                    size="small"
                    onClick={() => {
                      const blob = new Blob([rawJson], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "jira-query-result.json";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ fontSize: 12 }}
                  >
                    Download JSON
                  </Button>
                </div>
                <pre
                  style={{
                    background: "var(--qa-bg-secondary)",
                    border: "1px solid var(--qa-border)",
                    borderRadius: 8,
                    padding: 14,
                    maxHeight: 500,
                    overflow: "auto",
                    fontSize: 11,
                    color: "var(--qa-text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {rawJson}
                </pre>
              </div>,
            )}
        </div>
      )}

      {/* Empty state before first run */}
      {!hasRun && !running && (
        <div
          style={{
            marginTop: 40,
            textAlign: "center",
            color: "var(--qa-text-muted)",
            padding: "40px 20px",
          }}
        >
          <SearchOutlined
            style={{
              fontSize: 48,
              color: "var(--qa-border)",
              marginBottom: 16,
            }}
          />
          <div style={{ fontSize: 15, marginBottom: 8 }}>
            Enter a JQL query above and click Run
          </div>
          <div
            style={{
              fontSize: 12,
              maxWidth: 420,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Examples:{" "}
            <code
              style={{
                background: "var(--qa-bg-secondary)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              project = GSW AND status != Done
            </code>
            {" · "}
            <code
              style={{
                background: "var(--qa-bg-secondary)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              assignee = currentUser() ORDER BY priority
            </code>
          </div>
        </div>
      )}
    </div>
  );
};

export default JiraExplorer;
