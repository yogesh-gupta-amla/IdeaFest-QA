import React, { useMemo, useState } from "react";
import { Table, Tag, Card, Statistic, Input, Select, Collapse } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  PercentageOutlined,
  SearchOutlined,
  CrownOutlined,
  WarningOutlined,
  BulbOutlined,
  RiseOutlined,
  FundOutlined,
  TeamOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useEarlyCompletions } from "../../hooks/useQAData";
import { useDashboardStore } from "../../store/useStore";
import type { EarlyCompletionItem } from "../../types/qa";
import NeonCard from "../common/NeonCard";

const CHART_COLORS = [
  "#52c41a",
  "#1890ff",
  "#722ed1",
  "#faad14",
  "#13c2c2",
  "#eb2f96",
  "#fa8c16",
  "#2f54eb",
  "#a0d911",
  "#ff4d4f",
];

interface ContributorRow {
  rank: number;
  name: string;
  count: number;
  totalSavedHours: number;
  avgPercentSaved: number;
  isTopPerformer: boolean;
  isConsistent: boolean;
}

const EarlyCompletions: React.FC = () => {
  const { data, isLoading } = useEarlyCompletions();
  const projectKey = useDashboardStore((s) => s.projectKey);
  const queryTimeRange = useDashboardStore((s) => s.queryTimeRange);

  const [searchText, setSearchText] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "leaderboard" | "table" | "charts" | "insights"
  >("leaderboard");

  const assignees = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.items.map((i) => i.issue.assignee));
    return Array.from(set).filter(Boolean).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.items;
    if (searchText) {
      const lower = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.issue.key.toLowerCase().includes(lower) ||
          i.issue.summary.toLowerCase().includes(lower),
      );
    }
    if (assigneeFilter) {
      items = items.filter((i) => i.issue.assignee === assigneeFilter);
    }
    return items;
  }, [data, searchText, assigneeFilter]);

  // ── Contributor leaderboard ──
  const contributors: ContributorRow[] = useMemo(() => {
    if (!data) return [];
    const map = new Map<
      string,
      { name: string; count: number; totalSaved: number; totalPercent: number }
    >();
    for (const item of data.items) {
      const name = item.issue.assignee || "Unassigned";
      const e = map.get(name) || {
        name,
        count: 0,
        totalSaved: 0,
        totalPercent: 0,
      };
      e.count++;
      e.totalSaved += item.timeSavedHours;
      e.totalPercent += item.differencePercent;
      map.set(name, e);
    }
    const sorted = Array.from(map.values()).sort(
      (a, b) => b.totalSaved - a.totalSaved,
    );
    return sorted.map((c, i) => ({
      rank: i + 1,
      name: c.name,
      count: c.count,
      totalSavedHours: c.totalSaved,
      avgPercentSaved: Math.round((c.totalPercent / c.count) * 100) / 100,
      isTopPerformer: i === 0,
      isConsistent: c.count >= 3,
    }));
  }, [data]);

  const barChartCountData = useMemo(
    () =>
      contributors.slice(0, 10).map((c) => ({ name: c.name, count: c.count })),
    [contributors],
  );

  const barChartPercentData = useMemo(
    () =>
      [...contributors]
        .sort((a, b) => b.avgPercentSaved - a.avgPercentSaved)
        .slice(0, 10)
        .map((c) => ({ name: c.name, avgPercent: c.avgPercentSaved })),
    [contributors],
  );

  const pieData = useMemo(() => {
    if (!data) return [];
    const normalCount = data.totalDoneItems - data.totalEarlyItems;
    return [
      { name: "Early Completed", value: data.totalEarlyItems },
      { name: "Normal Completed", value: normalCount > 0 ? normalCount : 0 },
    ];
  }, [data]);

  const savingsDistribution = useMemo(() => {
    if (!data) return [];
    const buckets = [
      { range: "> 1 day saved", min: 24, count: 0 },
      { range: "8h – 24h saved", min: 8, count: 0 },
      { range: "2h – 8h saved", min: 2, count: 0 },
      { range: "< 2h saved", min: 0, count: 0 },
    ];
    for (const item of data.items) {
      if (item.timeSavedHours >= 24) buckets[0].count++;
      else if (item.timeSavedHours >= 8) buckets[1].count++;
      else if (item.timeSavedHours >= 2) buckets[2].count++;
      else buckets[3].count++;
    }
    return buckets.filter((b) => b.count > 0);
  }, [data]);

  const trendData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const item of data.items) {
      const d = new Date(item.resolutionDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });
      map.set(d, (map.get(d) || 0) + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [data]);

  // ── Insights ──
  const insights = useMemo(() => {
    if (!data || !contributors.length) return null;
    const topPerformers = contributors.filter((c) => c.isTopPerformer);
    const consistentPerformers = contributors.filter(
      (c) => c.isConsistent && !c.isTopPerformer,
    );
    const anomalies = data.items.filter((i) => i.differencePercent > 90);
    const highSavers = data.items.filter((i) => i.differencePercent > 80);
    const underestimated = data.items.filter((i) => i.differencePercent > 70);

    const moduleMap = new Map<string, number>();
    for (const item of data.items) {
      const mod = item.issue.module || "General";
      moduleMap.set(mod, (moduleMap.get(mod) || 0) + 1);
    }
    const topModules = Array.from(moduleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topContrib = contributors[0];
    const isDominant =
      topContrib &&
      data.totalEarlyItems > 0 &&
      topContrib.count / data.totalEarlyItems > 0.4;

    return {
      topPerformers,
      consistentPerformers,
      anomalies,
      highSavers,
      underestimated,
      topModules,
      isDominant,
      topContrib,
    };
  }, [data, contributors]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 300,
        }}
      >
        <div className="ant-spin ant-spin-spinning">
          <span className="ant-spin-dot ant-spin-dot-spin" />
        </div>
      </div>
    );
  }

  if (!projectKey) {
    return (
      <div style={{ textAlign: "center", padding: 60, opacity: 0.5 }}>
        Select a project to view early completions.
      </div>
    );
  }

  if (!data || data.totalDoneItems === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60, opacity: 0.5 }}>
        No completed issues with time tracking found for the selected range.
      </div>
    );
  }

  const formatHours = (h: number) => {
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 24) return `${h.toFixed(1)}h`;
    const days = Math.floor(h / 24);
    const rem = h % 24;
    return `${days}d ${rem.toFixed(0)}h`;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const totalTimeSaved = data.items.reduce((s, i) => s + i.timeSavedHours, 0);
  const topContributor = contributors.length > 0 ? contributors[0] : null;
  const rangeLabel =
    queryTimeRange === "last6months" ? "Last 6 Months" : "Last Month";

  const tabs = [
    { key: "leaderboard" as const, label: "🚀 Leaderboard" },
    { key: "table" as const, label: "📋 Issue Details" },
    { key: "charts" as const, label: "📊 Charts & Trends" },
    { key: "insights" as const, label: "🧠 Insights & Actions" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            🏆 Early Completion Contributors
          </h2>
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            Status = Done | Time Spent &gt; 0 | Difference % ≥ 20% •{" "}
            {rangeLabel}
          </span>
        </div>
      </div>

      {/* ── 📈 KPI Summary Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
        }}
      >
        <NeonCard
          accent="#52c41a"
          rainbow={false}
          speed="slow"
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Statistic
            title="Total Issues Analyzed"
            value={data.totalIssuesAnalyzed}
            prefix={<FundOutlined style={{ color: "#1890ff" }} />}
            valueStyle={{ fontSize: 22, fontWeight: 700 }}
          />
        </NeonCard>
        <NeonCard
          accent="#52c41a"
          rainbow={false}
          speed="slow"
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Statistic
            title="Early Completed"
            value={data.totalEarlyItems}
            prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            valueStyle={{ fontSize: 22, fontWeight: 700 }}
          />
        </NeonCard>
        <NeonCard
          accent="#faad14"
          rainbow={false}
          speed="slow"
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Statistic
            title="Early Completion %"
            value={data.earlyCompletionPercentage}
            suffix="%"
            prefix={<PercentageOutlined style={{ color: "#faad14" }} />}
            valueStyle={{ fontSize: 22, fontWeight: 700 }}
          />
        </NeonCard>
        <NeonCard
          accent="#faad14"
          rainbow={false}
          speed="slow"
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Statistic
            title="Avg % Time Saved"
            value={data.avgPercentSaved}
            suffix="%"
            prefix={<RiseOutlined style={{ color: "#722ed1" }} />}
            valueStyle={{ fontSize: 22, fontWeight: 700 }}
          />
        </NeonCard>
        <NeonCard
          accent="#13c2c2"
          rainbow={false}
          speed="slow"
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Statistic
            title="Total Time Saved"
            value={formatHours(totalTimeSaved)}
            prefix={<ClockCircleOutlined style={{ color: "#13c2c2" }} />}
            valueStyle={{ fontSize: 22, fontWeight: 700 }}
          />
        </NeonCard>
      </div>

      {/* ── 🥇 Top Performer Banner ── */}
      {topContributor && (
        <NeonCard
          style={{
            borderLeft: "4px solid #faad14",
            background:
              "linear-gradient(90deg, rgba(250,173,20,0.08) 0%, transparent 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <CrownOutlined style={{ fontSize: 28, color: "#faad14" }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                🥇 Top Performer:{" "}
                <span style={{ color: "#faad14" }}>{topContributor.name}</span>
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {topContributor.count} early completions • Avg{" "}
                {topContributor.avgPercentSaved}% time saved • Total saved:{" "}
                <strong>{formatHours(topContributor.totalSavedHours)}</strong>
              </div>
            </div>
          </div>
        </NeonCard>
      )}

      {/* ── Tab Switcher ── */}
      <div
        style={{
          display: "flex",
          gap: 4,
          background: "var(--card-bg, #141414)",
          borderRadius: 8,
          padding: 4,
          width: "fit-content",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              background:
                activeTab === t.key ? "var(--primary, #7c3aed)" : "transparent",
              color:
                activeTab === t.key ? "#fff" : "var(--text-secondary, #999)",
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════ LEADERBOARD ════════════ */}
      {activeTab === "leaderboard" && (
        <Table
          dataSource={contributors}
          rowKey="name"
          size="small"
          pagination={contributors.length > 15 ? { pageSize: 15 } : false}
          columns={[
            {
              title: "Rank",
              dataIndex: "rank",
              key: "rank",
              width: 70,
              render: (rank: number) => {
                const medals: Record<number, string> = {
                  1: "🥇",
                  2: "🥈",
                  3: "🥉",
                };
                return (
                  <span style={{ fontWeight: 700, fontSize: 16 }}>
                    {medals[rank] || `#${rank}`}
                  </span>
                );
              },
            },
            {
              title: "Contributor",
              dataIndex: "name",
              key: "name",
              render: (name: string, row: ContributorRow) => (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontWeight: row.isTopPerformer ? 700 : 500,
                      color: row.isTopPerformer ? "#faad14" : undefined,
                    }}
                  >
                    {name}
                  </span>
                  {row.isTopPerformer && (
                    <Tag color="gold" style={{ fontSize: 10 }}>
                      🥇 TOP PERFORMER
                    </Tag>
                  )}
                  {row.isConsistent && !row.isTopPerformer && (
                    <Tag color="green" style={{ fontSize: 10 }}>
                      🟢 CONSISTENT
                    </Tag>
                  )}
                </div>
              ),
            },
            {
              title: "Early Completed",
              dataIndex: "count",
              key: "count",
              width: 140,
              align: "center" as const,
              sorter: (a: ContributorRow, b: ContributorRow) =>
                a.count - b.count,
              render: (c: number) => (
                <Tag color="blue" style={{ fontWeight: 600 }}>
                  {c}
                </Tag>
              ),
            },
            {
              title: "Avg % Time Saved",
              dataIndex: "avgPercentSaved",
              key: "avgPercent",
              width: 150,
              align: "center" as const,
              sorter: (a: ContributorRow, b: ContributorRow) =>
                a.avgPercentSaved - b.avgPercentSaved,
              render: (v: number) => (
                <Tag
                  color={v > 50 ? "green" : v > 30 ? "cyan" : "default"}
                  style={{ fontWeight: 600 }}
                >
                  {v.toFixed(1)}%
                </Tag>
              ),
            },
            {
              title: "Total Time Saved",
              dataIndex: "totalSavedHours",
              key: "totalSaved",
              width: 150,
              align: "right" as const,
              sorter: (a: ContributorRow, b: ContributorRow) =>
                a.totalSavedHours - b.totalSavedHours,
              defaultSortOrder: "descend" as const,
              render: (h: number) => <strong>{formatHours(h)}</strong>,
            },
          ]}
        />
      )}

      {/* ════════════ ISSUE DETAILS ════════════ */}
      {activeTab === "table" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Input
              placeholder="Search by key or summary…"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />
            <Select
              placeholder="Filter by assignee"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              allowClear
              style={{ width: 200 }}
              options={assignees.map((a) => ({ value: a, label: a }))}
            />
            <span
              style={{
                fontSize: 12,
                opacity: 0.5,
                alignSelf: "center",
                marginLeft: "auto",
              }}
            >
              Showing {filtered.length} of {data.totalEarlyItems} early
              completions
            </span>
          </div>

          <Table
            dataSource={filtered}
            columns={[
              {
                title: "Issue Key",
                dataIndex: ["issue", "key"],
                key: "key",
                width: 120,
                render: (key: string) => (
                  <Tag color="blue" style={{ fontWeight: 600 }}>
                    {key}
                  </Tag>
                ),
                sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
                  a.issue.key.localeCompare(b.issue.key),
              },
              {
                title: "Summary",
                dataIndex: ["issue", "summary"],
                key: "summary",
                ellipsis: true,
                render: (text: string) => (
                  <span style={{ fontSize: 12 }}>{text}</span>
                ),
              },
              {
                title: "Assignee",
                dataIndex: ["issue", "assignee"],
                key: "assignee",
                width: 130,
                render: (a: string) => {
                  const name = a || "Unassigned";
                  const isTop = topContributor && name === topContributor.name;
                  return (
                    <span
                      style={{
                        fontWeight: isTop ? 700 : 400,
                        color: isTop ? "#faad14" : undefined,
                      }}
                    >
                      {isTop && "🏆 "}
                      {name}
                    </span>
                  );
                },
              },
              {
                title: "Created",
                key: "created",
                width: 110,
                render: (_: unknown, r: EarlyCompletionItem) => (
                  <span style={{ fontSize: 11 }}>
                    {formatDate(r.createdDate)}
                  </span>
                ),
                sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
                  new Date(a.createdDate).getTime() -
                  new Date(b.createdDate).getTime(),
              },
              {
                title: "Resolved",
                key: "resolved",
                width: 110,
                render: (_: unknown, r: EarlyCompletionItem) => (
                  <span style={{ fontSize: 11 }}>
                    {formatDate(r.resolutionDate)}
                  </span>
                ),
                sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
                  new Date(a.resolutionDate).getTime() -
                  new Date(b.resolutionDate).getTime(),
              },
              {
                title: "Estimate",
                key: "estimate",
                width: 90,
                align: "right" as const,
                render: (_: unknown, r: EarlyCompletionItem) =>
                  formatHours(r.originalEstimateHours),
                sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
                  a.originalEstimateHours - b.originalEstimateHours,
              },
              {
                title: "Time Spent",
                key: "spent",
                width: 100,
                align: "right" as const,
                render: (_: unknown, r: EarlyCompletionItem) =>
                  formatHours(r.timeTakenHours),
                sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
                  a.timeTakenHours - b.timeTakenHours,
              },
              {
                title: "% Saved",
                key: "percent",
                width: 100,
                align: "center" as const,
                render: (_: unknown, r: EarlyCompletionItem) => (
                  <Tag
                    color={
                      r.differencePercent > 50
                        ? "green"
                        : r.differencePercent > 30
                          ? "cyan"
                          : "blue"
                    }
                    style={{ fontWeight: 600 }}
                  >
                    {r.differencePercent.toFixed(1)}%
                  </Tag>
                ),
                sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
                  a.differencePercent - b.differencePercent,
                defaultSortOrder: "descend" as const,
              },
              {
                title: "Time Saved",
                key: "saved",
                width: 110,
                align: "right" as const,
                render: (_: unknown, r: EarlyCompletionItem) => (
                  <Tag
                    color={
                      r.timeSavedHours > 8
                        ? "green"
                        : r.timeSavedHours > 2
                          ? "cyan"
                          : "default"
                    }
                    style={{ fontWeight: 600 }}
                  >
                    ⏱ {formatHours(r.timeSavedHours)}
                  </Tag>
                ),
                sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
                  a.timeSavedHours - b.timeSavedHours,
              },
            ]}
            rowKey={(r) => r.issue.key}
            size="small"
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: ["10", "15", "25", "50"],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total}`,
            }}
            scroll={{ x: 1050 }}
            style={{ fontSize: 12 }}
          />
        </div>
      )}

      {/* ════════════ CHARTS & TRENDS ════════════ */}
      {activeTab === "charts" && data.totalEarlyItems > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {/* Bar: count per contributor */}
            <Card
              size="small"
              title={
                <span>
                  <TeamOutlined /> Contributors × Early Completed Count
                </span>
              }
              style={{ minHeight: 320 }}
            >
              <ResponsiveContainer width="100%" height={270}>
                <BarChart
                  data={barChartCountData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{
                      background: "var(--card-bg, #1f1f1f)",
                      border: "1px solid var(--border, #333)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Early Completions"
                    radius={[4, 4, 0, 0]}
                  >
                    {barChartCountData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          topContributor && entry.name === topContributor.name
                            ? "#faad14"
                            : CHART_COLORS[i % CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Horizontal bar: avg % saved */}
            <Card
              size="small"
              title={
                <span>
                  <RiseOutlined /> Contributors Ranked by Avg % Saved
                </span>
              }
              style={{ minHeight: 320 }}
            >
              <ResponsiveContainer width="100%" height={270}>
                <BarChart
                  data={barChartPercentData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={100}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "var(--card-bg, #1f1f1f)",
                      border: "1px solid var(--border, #333)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [
                      `${v.toFixed(1)}%`,
                      "Avg % Saved",
                    ]}
                  />
                  <Bar
                    dataKey="avgPercent"
                    name="Avg % Saved"
                    radius={[0, 4, 4, 0]}
                  >
                    {barChartPercentData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            {/* Donut: early vs normal */}
            <Card
              size="small"
              title={
                <span>
                  <PercentageOutlined /> Early vs Normal Completed
                </span>
              }
              style={{ minHeight: 320 }}
            >
              <ResponsiveContainer width="100%" height={270}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: "var(--text-secondary, #999)" }}
                  >
                    <Cell fill="#52c41a" />
                    <Cell fill="#8c8c8c" />
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: "var(--card-bg, #1f1f1f)",
                      border: "1px solid var(--border, #333)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Savings distribution */}
            <Card
              size="small"
              title={
                <span>
                  <FundOutlined /> Savings Distribution
                </span>
              }
              style={{ minHeight: 320 }}
            >
              <ResponsiveContainer width="100%" height={270}>
                <PieChart>
                  <Pie
                    data={savingsDistribution}
                    dataKey="count"
                    nameKey="range"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ range, count }) => `${range}: ${count}`}
                    labelLine={{ stroke: "var(--text-secondary, #999)" }}
                  >
                    {savingsDistribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: "var(--card-bg, #1f1f1f)",
                      border: "1px solid var(--border, #333)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Trend over time */}
          {trendData.length > 1 && (
            <Card
              size="small"
              title={
                <span>
                  <RiseOutlined /> Early Completion Trend Over Time
                </span>
              }
              style={{ minHeight: 280 }}
            >
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={trendData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{
                      background: "var(--card-bg, #1f1f1f)",
                      border: "1px solid var(--border, #333)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Early Completions"
                    fill="#52c41a"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* ════════════ INSIGHTS & ACTIONS ════════════ */}
      {activeTab === "insights" && insights && (
        <Collapse
          defaultActiveKey={["insights", "observations", "recommendations"]}
          ghost
        >
          {/* 🧠 Insights */}
          <Collapse.Panel
            key="insights"
            header={
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                <BulbOutlined /> 🧠 Insights & Patterns
              </span>
            }
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "8px 0",
              }}
            >
              {insights.topPerformers.map((tp) => (
                <div
                  key={tp.name}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(250,173,20,0.06)",
                    borderLeft: "3px solid #faad14",
                  }}
                >
                  <strong>🥇 Top Performer:</strong>{" "}
                  <span style={{ color: "#faad14" }}>{tp.name}</span> —{" "}
                  {tp.count} early completions with avg {tp.avgPercentSaved}%
                  time saved.
                </div>
              ))}
              {insights.consistentPerformers.length > 0 && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(82,196,26,0.06)",
                    borderLeft: "3px solid #52c41a",
                  }}
                >
                  <strong>
                    🟢 Consistent Performers (≥3 early completions):
                  </strong>{" "}
                  {insights.consistentPerformers.map((c) => c.name).join(", ")}
                </div>
              )}
              {insights.topModules.length > 0 && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(24,144,255,0.06)",
                    borderLeft: "3px solid #1890ff",
                  }}
                >
                  <strong>
                    📦 Top Modules/Components with Early Completions:
                  </strong>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                    {insights.topModules.map(([mod, count]) => (
                      <li key={mod}>
                        {mod}: {count} issues
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {insights.highSavers.length > 0 && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(114,46,209,0.06)",
                    borderLeft: "3px solid #722ed1",
                  }}
                >
                  <strong>⚡ High Savers ({">"}80% time saved):</strong>{" "}
                  {insights.highSavers.length} issues — may indicate strong
                  estimation accuracy or highly skilled assignees.
                </div>
              )}
            </div>
          </Collapse.Panel>

          {/* ⚠️ Observations */}
          <Collapse.Panel
            key="observations"
            header={
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                <WarningOutlined /> ⚠️ Observations & Risks
              </span>
            }
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "8px 0",
              }}
            >
              {insights.anomalies.length > 0 && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(255,77,79,0.06)",
                    borderLeft: "3px solid #ff4d4f",
                  }}
                >
                  <strong>🔴 Possible Estimation Issues:</strong>{" "}
                  {insights.anomalies.length} issues have &gt;90% time saved —
                  may indicate systematic overestimation.
                  <ul
                    style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 12 }}
                  >
                    {insights.anomalies.slice(0, 5).map((i) => (
                      <li key={i.issue.key}>
                        {i.issue.key}: {i.differencePercent.toFixed(0)}% saved —
                        Est: {formatHours(i.originalEstimateHours)}, Spent:{" "}
                        {formatHours(i.timeTakenHours)}
                      </li>
                    ))}
                    {insights.anomalies.length > 5 && (
                      <li>… and {insights.anomalies.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
              {insights.underestimated.length > 0 &&
                insights.underestimated.length !==
                  insights.anomalies.length && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(250,173,20,0.06)",
                      borderLeft: "3px solid #faad14",
                    }}
                  >
                    <strong>⚠️ Underestimation Pattern:</strong>{" "}
                    {insights.underestimated.length} issues had &gt;70% time
                    saved — estimates may be consistently higher than actual
                    effort.
                  </div>
                )}
              {insights.isDominant && insights.topContrib && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(250,140,22,0.06)",
                    borderLeft: "3px solid #fa8c16",
                  }}
                >
                  <strong>📊 Skewed Distribution:</strong>{" "}
                  {insights.topContrib.name} accounts for &gt;40% of all early
                  completions ({insights.topContrib.count}/
                  {data.totalEarlyItems}). This could indicate unbalanced
                  workload.
                </div>
              )}
              {!insights.isDominant && insights.anomalies.length === 0 && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(82,196,26,0.06)",
                    borderLeft: "3px solid #52c41a",
                  }}
                >
                  <strong>✅ No Major Risks Detected.</strong> Distribution
                  appears healthy and estimation accuracy is reasonable.
                </div>
              )}
            </div>
          </Collapse.Panel>

          {/* ✅ Recommendations */}
          <Collapse.Panel
            key="recommendations"
            header={
              <span style={{ fontWeight: 700, fontSize: 14 }}>
                <ExperimentOutlined /> ✅ Recommendations
              </span>
            }
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "8px 0",
              }}
            >
              {[
                insights.anomalies.length > 3 && {
                  icon: "📏",
                  text: `Refine estimation for ${insights.anomalies.length} issues with >90% savings. Consider using historical velocity data for more accurate estimates.`,
                  priority: "High",
                },
                insights.topPerformers.length > 0 && {
                  icon: "🏆",
                  text: `Recognize ${insights.topPerformers[0].name} as top performer. Their estimation and execution patterns can be used as a benchmark for the team.`,
                  priority: "Medium",
                },
                insights.consistentPerformers.length > 0 && {
                  icon: "👥",
                  text: `Leverage consistent performers (${insights.consistentPerformers.map((c) => c.name).join(", ")}) for mentoring. Their execution patterns show reliable delivery.`,
                  priority: "Medium",
                },
                insights.isDominant &&
                  insights.topContrib && {
                    icon: "⚖️",
                    text: `Rebalance workload — ${insights.topContrib.name} dominates early completions. Distribute similar tasks across team for even development.`,
                    priority: "High",
                  },
                data.earlyCompletionPercentage > 60 && {
                  icon: "📊",
                  text: `${data.earlyCompletionPercentage.toFixed(0)}% early completion rate is very high. Review if estimates are systematically padded — tighter estimates improve planning accuracy.`,
                  priority: "Medium",
                },
                data.earlyCompletionPercentage < 15 &&
                  data.totalEarlyItems > 0 && {
                    icon: "🎯",
                    text: `Only ${data.earlyCompletionPercentage.toFixed(0)}% early completion rate. Consider breaking down complex tasks to enable faster delivery cycles.`,
                    priority: "Low",
                  },
                {
                  icon: "📈",
                  text: "Track early completion trends weekly. Consistently high rates may indicate estimation bloat; declining rates may signal complexity increase.",
                  priority: "Low",
                },
              ]
                .filter(Boolean)
                .slice(0, 5)
                .map(
                  (rec, i) =>
                    rec && (
                      <div
                        key={i}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "var(--card-bg, rgba(255,255,255,0.02))",
                          border: "1px solid var(--border, #333)",
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{rec.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}>{rec.text}</div>
                          <Tag
                            color={
                              rec.priority === "High"
                                ? "red"
                                : rec.priority === "Medium"
                                  ? "orange"
                                  : "default"
                            }
                            style={{ fontSize: 10, marginTop: 4 }}
                          >
                            {rec.priority} Priority
                          </Tag>
                        </div>
                      </div>
                    ),
                )}
            </div>
          </Collapse.Panel>
        </Collapse>
      )}
    </div>
  );
};

export default EarlyCompletions;
