import React from "react";
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
  Cell,
} from "recharts";
import { useAgeingAnalysis } from "../../hooks/useQAData";
import ChartCard from "../Charts/ChartCard";
import { exportAgeingToExcel } from "../../utils/exportUtils";
import { FileExcelOutlined, WarningOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { AgeingItem, AgeingStatus } from "../../types/qa";
import type { ColumnsType } from "antd/es/table";

const AGEING_COLORS: Record<AgeingStatus, string> = {
  FRESH: "#52c41a",
  AT_RISK: "#faad14",
  AGED: "#ff4d4f",
};

const AgeingAnalysis: React.FC = () => {
  const { data: items = [], isLoading, error } = useAgeingAnalysis();

  if (isLoading)
    return (
      <Spin size="large" style={{ display: "block", margin: "80px auto" }} />
    );
  if (error) return <Alert type="error" message="Failed to load ageing data" />;

  const fresh = items.filter((i) => i.ageingStatus === "FRESH").length;
  const atRisk = items.filter((i) => i.ageingStatus === "AT_RISK").length;
  const aged = items.filter((i) => i.ageingStatus === "AGED").length;
  const escalated = items.filter((i) => i.isEscalated).length;

  // Stacked bar data — by priority
  const barData = ["Blocker", "Critical"].map((priority) => {
    const subset = items.filter((i) => i.issue.priority === priority);
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
      title: "Module",
      dataIndex: ["issue", "module"],
      width: 120,
      render: (m: string) => <Tag color="blue">{m}</Tag>,
    },
    {
      title: "Hours Elapsed",
      dataIndex: "hoursElapsed",
      width: 120,
      sorter: (a, b) => b.hoursElapsed - a.hoursElapsed,
      render: (h: number, row) => (
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
      title: "Status",
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
      sorter: (a, b) => b.riskScore - a.riskScore,
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
            label: "Total Critical/Blocker",
            value: items.length,
            color: "var(--qa-accent)",
          },
          { label: "FRESH", value: fresh, color: "#52c41a" },
          { label: "AT RISK", value: atRisk, color: "#faad14" },
          { label: "AGED", value: aged, color: "#ff4d4f" },
          { label: "Escalated (>48h)", value: escalated, color: "#ff0033" },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={8} md={24 / 5}>
            <Card
              style={{
                background: "var(--qa-bg-card)",
                border: "1px solid var(--qa-border)",
                borderRadius: 10,
                textAlign: "center",
              }}
              bodyStyle={{ padding: "16px 12px" }}
            >
              <Statistic
                title={
                  <span style={{ fontSize: 11, color: "var(--qa-text-muted)" }}>
                    {s.label}
                  </span>
                }
                value={s.value}
                valueStyle={{ fontSize: 24, fontWeight: 700, color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Stacked Bar Chart */}
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

        {/* Risk Insights */}
        <Col xs={24} md={12}>
          <Card
            title={
              <span style={{ color: "var(--qa-text-primary)" }}>
                Risk Insights
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
              {aged > 0 && (
                <Alert
                  type="error"
                  message={`${aged} AGED issue(s) have breached SLA — escalate immediately`}
                  showIcon
                />
              )}
              {atRisk > 0 && (
                <Alert
                  type="warning"
                  message={`${atRisk} AT_RISK issue(s) approaching SLA deadline`}
                  showIcon
                />
              )}
              {escalated > 0 && (
                <Alert
                  type="error"
                  message={`${escalated} issue(s) open >48h and require 48-hour escalation override`}
                  showIcon
                />
              )}
              {aged === 0 && atRisk === 0 && (
                <Alert
                  type="success"
                  message="No critical ageing risks detected"
                  showIcon
                />
              )}
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--qa-text-muted)",
                    marginBottom: 6,
                  }}
                >
                  Recommendations:
                </div>
                <ul
                  style={{
                    color: "var(--qa-text-secondary)",
                    fontSize: 13,
                    margin: 0,
                    paddingLeft: 20,
                  }}
                >
                  <li>Prioritize AGED issues in today's standup</li>
                  <li>Apply 48-hour escalation for Production blockers</li>
                  <li>
                    Review Checkout &amp; Payment modules first (higher risk
                    penalty)
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card
        title={
          <span style={{ color: "var(--qa-text-primary)" }}>
            Critical / Blocker Issue Ageing
          </span>
        }
        extra={
          <Button
            icon={<FileExcelOutlined />}
            size="small"
            onClick={() => exportAgeingToExcel(items)}
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
          dataSource={items}
          rowKey={(r) => r.issue.id}
          size="small"
          pagination={{ pageSize: 10 }}
          rowClassName={(record) =>
            record.ageingStatus === "AGED" ? "qa-aged-row" : ""
          }
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default AgeingAnalysis;
