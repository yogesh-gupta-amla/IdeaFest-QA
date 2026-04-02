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
} from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAgeingAnalysis } from "../../hooks/useQAData";
import ChartCard from "../Charts/ChartCard";
import { exportAgeingToExcel } from "../../utils/exportUtils";
import {
  FileExcelOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  BugOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
import type { AgeingItem, AgeingStatus } from "../../types/qa";
import type { ColumnsType } from "antd/es/table";

const AGEING_COLORS: Record<AgeingStatus, string> = {
  FRESH: "#52c41a",
  AT_RISK: "#faad14",
  AGED: "#ff4d4f",
};

type AgeingTab = "all" | "over48" | "fresh";

const TAB_CONFIG: { key: AgeingTab; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "Total Critical/Blockers", icon: <AlertOutlined /> },
  { key: "over48", label: "Reported >48 Hrs", icon: <ClockCircleOutlined /> },
  { key: "fresh", label: "Fresh Bugs", icon: <BugOutlined /> },
];

const AgeingAnalysis: React.FC = () => {
  const { data: result, isLoading, error } = useAgeingAnalysis();
  const [activeTab, setActiveTab] = useState<AgeingTab>("all");

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
  const visibleItems =
    activeTab === "over48"
      ? reportedOver48
      : activeTab === "fresh"
        ? freshBugs
        : totalCriticalBlockers;

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
      title: "Hours Elapsed",
      dataIndex: "hoursElapsed",
      width: 120,
      sorter: (a: AgeingItem, b: AgeingItem) => b.hoursElapsed - a.hoursElapsed,
      render: (h: number, row: AgeingItem) => (
        <span
          style={{
            color: row.slaBreach ? "#ff4d4f" : "var(--qa-text-primary)",
            fontWeight: 600,
          }}
        >
          {h}h{" "}
          {row.slaBreach && (
            <Tag color="red" style={{ marginLeft: 4 }}>
              SLA BREACH
            </Tag>
          )}
        </span>
      ),
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

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          {
            label: "Total Critical/Blockers",
            value: totalCriticalBlockers.length,
            color: "var(--qa-accent)",
            icon: "🚨",
          },
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
            <Card
              style={{
                background: "var(--qa-bg-card)",
                border: "1px solid var(--qa-border)",
                borderRadius: 10,
                textAlign: "center",
              }}
              styles={{ body: { padding: "16px 12px" } }}
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
            </Card>
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
                <Tooltip
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
          <Card
            title={
              <span style={{ color: "var(--qa-text-primary)" }}>
                🚨 Risk Insights
              </span>
            }
            style={{
              background: "var(--qa-bg-card)",
              border: "1px solid var(--qa-border)",
              borderRadius: 12,
              height: "100%",
            }}
            styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
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
          </Card>
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
            tab.key === "all"
              ? totalCriticalBlockers.length
              : tab.key === "over48"
                ? reportedOver48.length
                : freshBugs.length;
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
      <Card
        title={
          <span style={{ color: "var(--qa-text-primary)" }}>
            {activeTab === "over48"
              ? "⏰ Issues Reported >48 Hours (Backlog/Open)"
              : activeTab === "fresh"
                ? "🐛 Fresh Bugs >8h Unattended (Backlog/Open)"
                : "🚨 All Critical/Blocker Issues"}
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
        style={{
          background: "var(--qa-bg-card)",
          border: "1px solid var(--qa-border)",
          borderRadius: 12,
        }}
        styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
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
                {activeTab === "over48"
                  ? "No Blocker/Critical bugs in Backlog/Open for >48 hours"
                  : activeTab === "fresh"
                    ? "No fresh bugs unattended for >8 hours"
                    : "No Critical/Blocker issues found in the selected time range"}
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default AgeingAnalysis;
