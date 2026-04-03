import React, { useMemo, useState } from "react";
import { Table, Tag, Statistic, Input, Select } from "antd";
import NeonCard from "../common/NeonCard";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  PercentageOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useEarlyCompletions } from "../../hooks/useQAData";
import { useDashboardStore } from "../../store/useStore";
import type { EarlyCompletionItem } from "../../types/qa";

const EarlyCompletions: React.FC = () => {
  const { data, isLoading } = useEarlyCompletions();
  const projectKey = useDashboardStore((s) => s.projectKey);
  const queryTimeRange = useDashboardStore((s) => s.queryTimeRange);

  const [searchText, setSearchText] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

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
        No completed issues with estimates found for the selected{" "}
        {queryTimeRange === "today" ? "day" : "week"}.
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
      hour: "2-digit",
      minute: "2-digit",
    });

  const columns = [
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
      render: (text: string) => <span style={{ fontSize: 12 }}>{text}</span>,
    },
    {
      title: "Assignee",
      dataIndex: ["issue", "assignee"],
      key: "assignee",
      width: 130,
      render: (a: string) => a || "Unassigned",
    },
    {
      title: "Created",
      key: "created",
      width: 150,
      render: (_: unknown, r: EarlyCompletionItem) => (
        <span style={{ fontSize: 11 }}>{formatDate(r.createdDate)}</span>
      ),
      sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
        new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime(),
    },
    {
      title: "Resolved",
      key: "resolved",
      width: 150,
      render: (_: unknown, r: EarlyCompletionItem) => (
        <span style={{ fontSize: 11 }}>{formatDate(r.resolutionDate)}</span>
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
      title: "Time Taken",
      key: "taken",
      width: 100,
      align: "right" as const,
      render: (_: unknown, r: EarlyCompletionItem) =>
        formatHours(r.timeTakenHours),
      sorter: (a: EarlyCompletionItem, b: EarlyCompletionItem) =>
        a.timeTakenHours - b.timeTakenHours,
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
      defaultSortOrder: "descend" as const,
    },
  ];

  const totalTimeSaved = data.items.reduce((s, i) => s + i.timeSavedHours, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
            🏆 Early Completions
          </h2>
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            Issues resolved before estimated time •{" "}
            {queryTimeRange === "today" ? "Today" : "Last 7 days"}
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
            title="Early Completions"
            value={data.totalEarlyItems}
            prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            valueStyle={{ fontSize: 24, fontWeight: 700 }}
          />
        </NeonCard>
        <NeonCard
          accent="#1890ff"
          rainbow={false}
          speed="slow"
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Statistic
            title="Total Done (w/ Estimate)"
            value={data.totalDoneItems}
            prefix={<ClockCircleOutlined style={{ color: "#1890ff" }} />}
            valueStyle={{ fontSize: 24, fontWeight: 700 }}
          />
        </NeonCard>
        <NeonCard
          accent="#722ed1"
          rainbow={false}
          speed="slow"
          bodyStyle={{ padding: "12px 16px" }}
        >
          <Statistic
            title="Avg Time Saved"
            value={formatHours(data.avgTimeSavedHours)}
            prefix={<TrophyOutlined style={{ color: "#722ed1" }} />}
            valueStyle={{ fontSize: 24, fontWeight: 700 }}
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
            valueStyle={{ fontSize: 24, fontWeight: 700 }}
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
            valueStyle={{ fontSize: 24, fontWeight: 700 }}
          />
        </NeonCard>
      </div>

      {/* Filters */}
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
          Showing {filtered.length} of {data.totalEarlyItems} early completions
        </span>
      </div>

      {/* Table */}
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey={(r) => r.issue.key}
        size="small"
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          pageSizeOptions: ["10", "15", "25", "50"],
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
        }}
        scroll={{ x: 950 }}
        style={{ fontSize: 12 }}
      />

      {/* Top savers by assignee */}
      {data.totalEarlyItems > 0 && (
        <NeonCard
          title="🏅 Top Savers by Assignee"
          speed="slow"
          style={{ marginTop: 4 }}
          bodyStyle={{ padding: 16 }}
        >
          <AssigneeSummary items={data.items} formatHours={formatHours} />
        </NeonCard>
      )}
    </div>
  );
};

const AssigneeSummary: React.FC<{
  items: EarlyCompletionItem[];
  formatHours: (h: number) => string;
}> = ({ items, formatHours }) => {
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; totalSaved: number }
    >();
    for (const item of items) {
      const name = item.issue.assignee || "Unassigned";
      const existing = map.get(name) || { name, count: 0, totalSaved: 0 };
      existing.count++;
      existing.totalSaved += item.timeSavedHours;
      map.set(name, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.totalSaved - a.totalSaved);
  }, [items]);

  const cols = [
    { title: "Assignee", dataIndex: "name", key: "name" },
    {
      title: "Early Completions",
      dataIndex: "count",
      key: "count",
      width: 150,
      sorter: (a: { count: number }, b: { count: number }) => a.count - b.count,
    },
    {
      title: "Total Time Saved",
      key: "totalSaved",
      width: 160,
      render: (_: unknown, r: { totalSaved: number }) => (
        <Tag color="green" style={{ fontWeight: 600 }}>
          {formatHours(r.totalSaved)}
        </Tag>
      ),
      sorter: (a: { totalSaved: number }, b: { totalSaved: number }) =>
        a.totalSaved - b.totalSaved,
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Avg Saved / Issue",
      key: "avg",
      width: 140,
      render: (_: unknown, r: { totalSaved: number; count: number }) =>
        formatHours(r.count > 0 ? r.totalSaved / r.count : 0),
    },
  ];

  return (
    <Table
      dataSource={rows}
      columns={cols}
      rowKey="name"
      size="small"
      pagination={false}
    />
  );
};

export default EarlyCompletions;
