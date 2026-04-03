import React, { useState } from "react";
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Spin,
  Alert,
  Statistic,
  Badge,
  Button,
  Tooltip as AntTooltip,
  message,
} from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAgeingAnalysis } from "../../hooks/useQAData";
import { useDashboardStore } from "../../store/useStore";
import ChartCard from "../Charts/ChartCard";
import { exportAgeingToExcel } from "../../utils/exportUtils";
import {
  FileExcelOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  BugOutlined,
  CodeOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import type { AgeingItem, AgeingStatus } from "../../types/qa";
import type { ColumnsType } from "antd/es/table";
import NeonCard from "../common/NeonCard";

const AGEING_COLORS: Record<AgeingStatus, string> = {
  FRESH: "#52c41a",
  AT_RISK: "#faad14",
  AGED: "#ff4d4f",
};

type AgeingTab = "over48" | "fresh";

const TAB_CONFIG: { key: AgeingTab; label: string; icon: React.ReactNode }[] = [
  { key: "over48", label: "Reported >48 Hrs", icon: <ClockCircleOutlined /> },
  { key: "fresh", label: "Fresh Bugs", icon: <BugOutlined /> },
];

const AgeingAnalysis: React.FC = () => {
  const { data: result, isLoading, error } = useAgeingAnalysis();
  const projectKey = useDashboardStore((s) => s.projectKey);
  const ageingIssues = useDashboardStore((s) => s.ageingIssues);
  const [activeTab, setActiveTab] = useState<AgeingTab>("over48");
  const [showJql, setShowJql] = useState(false);

  // The JQL queries used (no time range — fetches ALL via pagination)
  const AGEING_JQL = {
    main: `project = "${projectKey}" AND issuetype IN (Bug, Defect) AND priority IN (Blocker, Critical) AND status NOT IN (Done, "QA Done", Rejected, "Ready For Production", "Ready for QA", "Ready for Testing", "Ready For UAT") ORDER BY created DESC`,
    over48: `issuetype IN (Bug) AND status IN (Backlog, Open) AND priority IN (Blocker, Critical) AND project = ${projectKey} — filtered client-side: created > 48 hours ago`,
    fresh: `issuetype IN (Bug, Defect) AND status IN (Backlog, Open) AND priority IN (Blocker, Critical) AND project = ${projectKey} — filtered client-side: created > 8 hours ago`,
  };

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
  if (error) return <Alert type="error" message="Failed to load ageing data" />;
  if (!result) return null;

  const {
    totalCriticalBlockers,
    reportedOver48,
    freshBugs,
    riskInsights,
    recommendations,
  } = result;

  // Pick the visible list based on active tab
  const visibleItems = activeTab === "fresh" ? freshBugs : reportedOver48;

  const allItems = totalCriticalBlockers;
  const fresh = allItems.filter((i) => i.ageingStatus === "FRESH").length;
  const atRisk = allItems.filter((i) => i.ageingStatus === "AT_RISK").length;
  const aged = allItems.filter((i) => i.ageingStatus === "AGED").length;

  // Stacked bar data — by priority
  const barData = ["Blocker", "Critical"].map((priority) => {
    const subset = allItems.filter((i) => i.issue.priority === priority);
    return {
      priority,
      FRESH: subset.filter((i) => i.ageingStatus === "FRESH").length,
      AT_RISK: subset.filter((i) => i.ageingStatus === "AT_RISK").length,
      AGED: subset.filter((i) => i.ageingStatus === "AGED").length,
    };
  });

  const columns: ColumnsType<AgeingItem> = [
    {
      title: "Key",
      dataIndex: ["issue", "key"],
      width: 100,
      render: (key: string, row) => (
        <span style={{ fontWeight: 600, color: "var(--qa-accent)" }}>
          {key}
          {row.isEscalated && (
            <WarningOutlined style={{ color: "#faad14", marginLeft: 6 }} />
          )}
        </span>
      ),
    },
    {
      title: "Summary",
      dataIndex: ["issue", "summary"],
      ellipsis: true,
      render: (s: string) => (
        <span style={{ color: "var(--qa-text-primary)" }}>{s}</span>
      ),
    },
    {
      title: "Priority",
      dataIndex: ["issue", "priority"],
      width: 90,
      render: (p: string) => (
        <Tag color={p === "Blocker" ? "red" : "volcano"}>{p}</Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: ["issue", "originalStatus"],
      width: 120,
      render: (s: string) => (
        <Tag color={s.toLowerCase() === "blocked" ? "red" : "default"}>{s}</Tag>
      ),
    },
    {
      title: "Module",
      dataIndex: ["issue", "module"],
      width: 120,
      render: (m: string) => <Tag color="blue">{m}</Tag>,
    },
    {
      title: "Elapsed",
      dataIndex: "hoursElapsed",
      width: 120,
      sorter: (a: AgeingItem, b: AgeingItem) => b.hoursElapsed - a.hoursElapsed,
      render: (h: number) => {
        const label = h > 60 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`;
        return (
          <span
            style={{
              fontWeight: 600,
              color:
                h > 48
                  ? "#ff4d4f"
                  : h > 24
                    ? "#faad14"
                    : "var(--qa-text-primary)",
            }}
          >
            {label}
          </span>
        );
      },
    },
    {
      title: "Ageing",
      dataIndex: "ageingStatus",
      width: 100,
      render: (s: AgeingStatus) => (
        <Badge
          color={AGEING_COLORS[s]}
          text={
            <span style={{ color: AGEING_COLORS[s], fontWeight: 600 }}>
              {s}
            </span>
          }
        />
      ),
    },
    {
      title: "Risk Score",
      dataIndex: "riskScore",
      width: 100,
      sorter: (a: AgeingItem, b: AgeingItem) => b.riskScore - a.riskScore,
      render: (score: number) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 40,
              height: 8,
              borderRadius: 4,
              background: `linear-gradient(to right, #52c41a, #faad14, #ff4d4f)`,
              position: "relative",
            }}
          />
          <span
            style={{
              fontWeight: 600,
              color:
                score >= 70 ? "#ff4d4f" : score >= 40 ? "#faad14" : "#52c41a",
            }}
          >
            {score}
          </span>
        </div>
      ),
    },
  ];

  const handleCopyJql = (jql: string) => {
    navigator.clipboard.writeText(jql);
    message.success("JQL copied to clipboard");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* JQL Query Panel */}
      <div>
        <Button
          icon={<CodeOutlined />}
          size="small"
          onClick={() => setShowJql(!showJql)}
          style={{
            background: "var(--qa-bg-card)",
            border: "1px solid var(--qa-border)",
            color: "var(--qa-text-secondary)",
            borderRadius: 8,
          }}
        >
          {showJql ? "Hide" : "Show"} JQL Queries
        </Button>
        <span
          style={{
            marginLeft: 12,
            fontSize: 12,
            color: "var(--qa-text-muted)",
          }}
        >
          📊 Total issues fetched (all pages):{" "}
          <strong style={{ color: "var(--qa-accent)" }}>
            {ageingIssues.length}
          </strong>
        </span>
        {showJql && (
          <Card
            style={{
              marginTop: 10,
              background: "var(--qa-bg-card)",
              border: "1px solid var(--qa-border)",
              borderRadius: 10,
            }}
            styles={{ body: { padding: "12px 16px" } }}
          >
            {[
              {
                label: "🚨 Main Query (All Critical/Blockers)",
                jql: AGEING_JQL.main,
              },
              {
                label: "⏰ Reported >48 Hrs (client-filtered)",
                jql: AGEING_JQL.over48,
              },
              {
                label: "🐛 Fresh Bugs (client-filtered)",
                jql: AGEING_JQL.fresh,
              },
            ].map((q) => (
              <div key={q.label} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--qa-text-muted)",
                    marginBottom: 4,
                  }}
                >
                  {q.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--qa-bg-body)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    border: "1px solid var(--qa-border)",
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      fontSize: 11,
                      wordBreak: "break-all",
                      color: "var(--qa-text-secondary)",
                    }}
                  >
                    {q.jql}
                  </code>
                  <AntTooltip title="Copy JQL">
                    <Button
                      icon={<CopyOutlined />}
                      size="small"
                      type="text"
                      onClick={() => handleCopyJql(q.jql)}
                      style={{ color: "var(--qa-text-muted)" }}
                    />
                  </AntTooltip>
                </div>
              </div>
            ))}
            <div
              style={{
                fontSize: 11,
                color: "var(--qa-text-muted)",
                fontStyle: "italic",
              }}
            >
              ℹ️ No daily/weekly time filter applied. All matching issues are
              fetched via full pagination (isLast = false → keep fetching).
            </div>
          </Card>
        )}
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]}>
        {[
          {
            label: "Reported >48 Hrs",
            value: reportedOver48.length,
            color: "#ff0033",
            icon: "⏰",
          },
          {
            label: "Fresh Bugs (>8h unattended)",
            value: freshBugs.length,
            color: "#fa8c16",
            icon: "🐛",
          },
          { label: "FRESH", value: fresh, color: "#52c41a", icon: "🟢" },
          { label: "AT RISK", value: atRisk, color: "#faad14", icon: "🟡" },
          { label: "AGED", value: aged, color: "#ff4d4f", icon: "🔴" },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={8} md={4}>
            <NeonCard
              accent={s.color}
              rainbow={false}
              speed="slow"
              bodyStyle={{ padding: "16px 12px", textAlign: "center" }}
            >
              <Statistic
                title={
                  <span style={{ fontSize: 11, color: "var(--qa-text-muted)" }}>
                    {s.icon} {s.label}
                  </span>
                }
                value={s.value}
                valueStyle={{ fontSize: 24, fontWeight: 700, color: s.color }}
              />
            </NeonCard>
          </Col>
        ))}
      </Row>

      {/* Chart + Risk Insights */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} md={12}>
          <ChartCard
            title="Ageing Buckets by Priority"
            id="ageing-bar"
            height={220}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--qa-border)"
                />
                <XAxis
                  dataKey="priority"
                  tick={{ fontSize: 12, fill: "var(--qa-text-muted)" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--qa-text-muted)" }} />
                <RechartsTooltip
                  contentStyle={{
                    background: "var(--qa-bg-card)",
                    border: "1px solid var(--qa-border)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="FRESH" stackId="a" fill="#52c41a" />
                <Bar dataKey="AT_RISK" stackId="a" fill="#faad14" />
                <Bar
                  dataKey="AGED"
                  stackId="a"
                  fill="#ff4d4f"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>

        {/* Risk Insights from analysis */}
        <Col xs={24} md={12}>
          <NeonCard
            title="🚨 Risk Insights"
            speed="slow"
            style={{ height: "100%" }}
            bodyStyle={{ padding: 16 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {riskInsights.map((insight, idx) => (
                <Alert
                  key={idx}
                  type={insight.type}
                  message={insight.message}
                  showIcon
                />
              ))}

              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--qa-text-muted)",
                    marginBottom: 6,
                  }}
                >
                  ✅ Recommendations:
                </div>
                <ul
                  style={{
                    color: "var(--qa-text-secondary)",
                    fontSize: 13,
                    margin: 0,
                    paddingLeft: 20,
                  }}
                >
                  {recommendations.map((rec, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </NeonCard>
        </Col>
      </Row>

      {/* Tab Selector */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {TAB_CONFIG.map((tab) => {
          const count =
            tab.key === "over48" ? reportedOver48.length : freshBugs.length;
          return (
            <Button
              key={tab.key}
              type={activeTab === tab.key ? "primary" : "default"}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
              style={{
                borderRadius: 8,
                ...(activeTab !== tab.key
                  ? {
                      background: "var(--qa-bg-card)",
                      border: "1px solid var(--qa-border)",
                      color: "var(--qa-text-secondary)",
                    }
                  : {}),
              }}
            >
              {tab.label} ({count})
            </Button>
          );
        })}
      </div>

      {/* Table */}
      <NeonCard
        title={
          <span style={{ color: "var(--qa-text-primary)" }}>
            {activeTab === "fresh"
              ? "🐛 Fresh Bugs >8h Unattended (Backlog/Open)"
              : "⏰ Issues Reported >48 Hours (Backlog/Open)"}
          </span>
        }
        extra={
          <Button
            icon={<FileExcelOutlined />}
            size="small"
            onClick={() => exportAgeingToExcel(visibleItems)}
            style={{
              background: "var(--qa-bg-card)",
              border: "1px solid var(--qa-border)",
              color: "var(--qa-text-secondary)",
            }}
          >
            Export Excel
          </Button>
        }
        speed="slow"
      >
        <Table
          columns={columns}
          dataSource={visibleItems}
          rowKey={(r) => r.issue.id}
          size="small"
          pagination={{ pageSize: 10 }}
          rowClassName={(record) =>
            record.ageingStatus === "AGED" ? "qa-aged-row" : ""
          }
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <div style={{ padding: 24, color: "var(--qa-text-muted)" }}>
                {activeTab === "fresh"
                  ? "No fresh bugs unattended for >8 hours"
                  : "No Blocker/Critical bugs in Backlog/Open for >48 hours"}
              </div>
            ),
          }}
        />
      </NeonCard>
    </div>
  );
};

export default AgeingAnalysis;
