import React from "react";
import { Row, Col, Card, Tag, Statistic, Spin, Alert, List } from "antd";
import {
  LineChart,
  Line,
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
import GaugeChart from "../Charts/GaugeChart";
import ChartCard from "../Charts/ChartCard";
import { exportDashboardToPDF } from "../../utils/exportUtils";
import {
  FilePdfOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Button } from "antd";

const SEVERITY_COLORS: Record<string, string> = {
  Blocker: "#ff0033",
  Critical: "#ff4d4f",
  High: "#fa8c16",
  Medium: "#faad14",
  Low: "#52c41a",
};

const ProjectHealth: React.FC = () => {
  const { data: health, isLoading, error } = useProjectHealth();

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

  const isRed = health.status === "RED";
  const statusColor = isRed ? "#ff4d4f" : "#52c41a";

  return (
    <div>
      {/* Status Banner */}
      <div
        style={{
          background: isRed ? "rgba(255,77,79,0.12)" : "rgba(82,196,26,0.12)",
          border: `1px solid ${statusColor}`,
          borderRadius: 12,
          padding: "16px 24px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: statusColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: `0 0 20px ${statusColor}60`,
            }}
          >
            {isRed ? (
              <WarningOutlined style={{ color: "#fff" }} />
            ) : (
              <CheckCircleOutlined style={{ color: "#fff" }} />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: statusColor }}>
              {isRed ? "🔴 RED — Action Required" : "🟢 GREEN — Healthy"}
            </div>
            <div
              style={{
                color: "var(--qa-text-secondary)",
                fontSize: 13,
                maxWidth: 600,
              }}
            >
              {health.summary}
            </div>
          </div>
        </div>
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
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
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
          {
            label: "SLA Breaches",
            value: health.slaBreachCount,
            color: "#ff0033",
          },
          { label: "Reopened", value: health.reopenedCount, color: "#faad14" },
          {
            label: "Closure Rate",
            value: `${(health.closureRate * 100).toFixed(0)}%`,
            color: "#52c41a",
          },
        ].map((stat) => (
          <Col key={stat.label} xs={12} sm={8} md={4}>
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
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Gauge */}
        <Col xs={24} md={8}>
          <ChartCard title="Health Score" id="gauge-chart" height={200}>
            <GaugeChart value={health.score} label="Health Score" />
          </ChartCard>
        </Col>

        {/* Pie — Severity Distribution */}
        <Col xs={24} md={8}>
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
        <Col xs={24} md={8}>
          <ChartCard title="7-Day Defect Trend" id="trend-line" height={200}>
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

      {/* Key Drivers */}
      <Card
        title={
          <span style={{ color: "var(--qa-text-primary)" }}>Key Drivers</span>
        }
        style={{
          background: "var(--qa-bg-card)",
          border: "1px solid var(--qa-border)",
          borderRadius: 12,
        }}
        styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
      >
        <List
          dataSource={health.keyDrivers}
          renderItem={(item) => (
            <List.Item
              style={{ borderColor: "var(--qa-border)", padding: "8px 0" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{ color: isRed ? "#ff4d4f" : "#52c41a", fontSize: 16 }}
                >
                  {isRed ? "⚠️" : "✅"}
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
      </Card>
    </div>
  );
};

export default ProjectHealth;
