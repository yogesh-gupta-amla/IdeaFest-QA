import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import type { Metrics } from "../../types";

interface ChartsSectionProps {
  metrics: Metrics;
}

function useThemeColors() {
  const cs = getComputedStyle(document.documentElement);
  const get = (v: string) => cs.getPropertyValue(v).trim();
  return useMemo(
    () => ({
      done: get("--chart-done") || "#10b981",
      progress: get("--chart-progress") || "#f59e0b",
      todo: get("--chart-todo") || "#6366f1",
      line: get("--chart-line") || "#8b5cf6",
      text: get("--text-muted") || "#94a3b8",
      grid: get("--border") || "rgba(255,255,255,0.08)",
      danger: get("--danger") || "#ef4444",
      warning: get("--warning") || "#f59e0b",
      info: get("--info") || "#3b82f6",
      accent: get("--accent") || "#8b5cf6",
      success: get("--success") || "#10b981",
      pHighest: get("--priority-highest") || "#ef4444",
      pHigh: get("--priority-high") || "#f97316",
      pMedium: get("--priority-medium") || "#f59e0b",
      pLow: get("--priority-low") || "#3b82f6",
      pLowest: get("--priority-lowest") || "#6b7280",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: "var(--qa-bg-card)",
        border: "1px solid var(--qa-border)",
        borderRadius: 10,
        padding: "8px 14px",
        color: "var(--qa-text-primary)",
        fontSize: 13,
        boxShadow: "var(--qa-shadow)",
      }}
    >
      <span style={{ color: item.payload.fill, fontWeight: 700 }}>● </span>
      {item.name}: <strong>{item.value}</strong>
    </div>
  );
}

// Custom center label for doughnut charts
function CenterLabel({
  cx,
  cy,
  total,
  label,
}: {
  cx?: number;
  cy?: number;
  total: number;
  label: string;
}) {
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ pointerEvents: "none" }}
    >
      <tspan
        x={cx}
        dy="-8"
        fontSize="22"
        fontWeight="700"
        fill="var(--text-heading)"
      >
        {total}
      </tspan>
      <tspan x={cx} dy="20" fontSize="11" fill="var(--text-muted)">
        {label}
      </tspan>
    </text>
  );
}

function DonutCard({
  title,
  data,
  total,
  centerLabel,
}: {
  title: string;
  data: { name: string; value: number; fill: string }[];
  total: number;
  centerLabel: string;
}) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={data.length > 1 ? 3 : 0}
            dataKey="value"
            animationBegin={0}
            animationDuration={900}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} stroke="transparent" />
            ))}
            <CenterLabel
              cx={undefined}
              cy={undefined}
              total={total}
              label={centerLabel}
            />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={9}
            formatter={(value) => (
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function PriorityBarCard({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number; fill: string }[];
}) {
  return (
    <div className="chart-card">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={900}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              style={{ fill: "var(--text-muted)", fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ChartsSection({ metrics }: ChartsSectionProps) {
  const c = useThemeColors();

  const statusColorMap: Record<string, string> = {
    Done: c.done,
    "In Progress": c.progress,
    Open: c.info,
    Blocked: c.danger,
    Backlog: c.pLowest,
    Reopened: c.warning,
  };

  const prioColorMap: Record<string, string> = {
    Highest: c.pHighest,
    High: c.pHigh,
    Medium: c.pMedium,
    Low: c.pLow,
    Lowest: c.pLowest,
  };

  const prioOrder = ["Highest", "High", "Medium", "Low", "Lowest"];

  // Open by status — donut
  const statusData = Object.entries(metrics.statusMap).map(([name, value]) => ({
    name,
    value,
    fill: statusColorMap[name] || c.accent,
  }));

  // Open by priority — bar chart (more readable than donut for priority)
  const priorityData = prioOrder
    .filter((p) => metrics.priorityMap[p])
    .map((name) => ({
      name,
      value: metrics.priorityMap[name],
      fill: prioColorMap[name],
    }));

  // Today's by priority — bar
  const todayPriorityData = prioOrder
    .filter((p) => metrics.todayPriorityMap[p])
    .map((name) => ({
      name,
      value: metrics.todayPriorityMap[name],
      fill: prioColorMap[name],
    }));

  if (todayPriorityData.length === 0)
    todayPriorityData.push({ name: "None today", value: 1, fill: c.pLowest });

  // Must fix by status — donut
  const mustFixData = Object.entries(metrics.mustFixStatusMap).map(
    ([name, value]) => ({
      name,
      value,
      fill: statusColorMap[name] || c.accent,
    }),
  );
  if (mustFixData.length === 0)
    mustFixData.push({ name: "None", value: 1, fill: c.done });

  return (
    <section className="card fade-in">
      <h2 className="card-title">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        Analytics &amp; Charts
      </h2>
      <div className="charts-grid">
        <DonutCard
          title="Open Issues by Status"
          data={statusData}
          total={metrics.totalOpen}
          centerLabel="Total Open"
        />
        <PriorityBarCard title="Open Issues by Priority" data={priorityData} />
        <PriorityBarCard
          title="Today's Reported by Priority"
          data={todayPriorityData}
        />
        <DonutCard
          title="Must-Fix by Status"
          data={mustFixData}
          total={metrics.mustFix}
          centerLabel="Must Fix"
        />
      </div>
    </section>
  );
}
