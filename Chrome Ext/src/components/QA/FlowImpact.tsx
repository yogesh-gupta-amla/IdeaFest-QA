import React from "react";
import { Card, Table, Tag, Spin, Alert, Row, Col, Statistic } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useFlowImpact } from "../../hooks/useQAData";
import { exportIssuesToExcel } from "../../utils/exportUtils";
import type { FlowImpactItem, RiskLevel } from "../../types/qa";
import type { ColumnsType } from "antd/es/table";

const RISK_COLORS: Record<RiskLevel, string> = {
  HIGH: "#ff4d4f",
  MEDIUM: "#faad14",
  LOW: "#52c41a",
  NONE: "#888",
};

const RISK_BG: Record<RiskLevel, string> = {
  HIGH: "rgba(255,77,79,0.1)",
  MEDIUM: "rgba(250,173,20,0.1)",
  LOW: "rgba(82,196,26,0.1)",
  NONE: "transparent",
};

const FlowImpact: React.FC = () => {
  const { data: items = [], isLoading, error } = useFlowImpact();

  if (isLoading)
    return (
      <Spin size="large" style={{ display: "block", margin: "80px auto" }} />
    );
  if (error)
    return <Alert type="error" message="Failed to load flow impact data" />;

  const countByRisk = (r: RiskLevel) =>
    items.filter((i) => i.overallRisk === r).length;

  const columns: ColumnsType<FlowImpactItem> = [
    {
      title: "Key",
      dataIndex: ["issue", "key"],
      width: 110,
      render: (k: string) => (
        <span style={{ fontWeight: 600, color: "var(--qa-accent)" }}>{k}</span>
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
      title: "Domain",
      dataIndex: "domain",
      width: 120,
      render: (d: string) => <Tag color="blue">{d}</Tag>,
    },
    {
      title: "Keywords",
      dataIndex: "keywords",
      width: 200,
      render: (kws: string[]) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {kws.slice(0, 4).map((k) => (
            <Tag
              key={k}
              style={{ fontSize: 10, padding: "0 5px", borderRadius: 4 }}
            >
              {k}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Sprint Risk",
      dataIndex: "sprintRisk",
      width: 110,
      filters: (["HIGH", "MEDIUM", "LOW"] as RiskLevel[]).map((r) => ({
        text: r,
        value: r,
      })),
      onFilter: (val, rec) => rec.sprintRisk === val,
      render: (r: RiskLevel) => (
        <Tag
          style={{
            background: RISK_BG[r],
            color: RISK_COLORS[r],
            border: `1px solid ${RISK_COLORS[r]}`,
            fontWeight: 600,
          }}
        >
          {r}
        </Tag>
      ),
    },
    {
      title: "Release Impact",
      dataIndex: "releaseImpact",
      width: 120,
      render: (r: RiskLevel) => (
        <Tag
          style={{
            background: RISK_BG[r],
            color: RISK_COLORS[r],
            border: `1px solid ${RISK_COLORS[r]}`,
            fontWeight: 600,
          }}
        >
          {r}
        </Tag>
      ),
    },
    {
      title: "Overall Risk",
      dataIndex: "overallRisk",
      width: 120,
      sorter: (a, b) => {
        const order = ["HIGH", "MEDIUM", "LOW", "NONE"];
        return order.indexOf(a.overallRisk) - order.indexOf(b.overallRisk);
      },
      render: (r: RiskLevel) => (
        <Tag
          style={{
            background: RISK_COLORS[r] + "22",
            color: RISK_COLORS[r],
            border: `1px solid ${RISK_COLORS[r]}`,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {r}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {(
          [
            {
              label: "Total Impacted Issues",
              value: items.length,
              color: "var(--qa-accent)",
            },
            {
              label: "HIGH Risk",
              value: countByRisk("HIGH"),
              color: "#ff4d4f",
            },
            {
              label: "MEDIUM Risk",
              value: countByRisk("MEDIUM"),
              color: "#faad14",
            },
            { label: "LOW Risk", value: countByRisk("LOW"), color: "#52c41a" },
          ] as const
        ).map((s) => (
          <Col key={s.label} xs={12} md={6}>
            <Card
              style={{
                background: "var(--qa-bg-card)",
                border: `1px solid ${String(s.color)}40`,
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
                valueStyle={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: s.color as string,
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {countByRisk("HIGH") > 0 && (
        <Alert
          type="error"
          showIcon
          message={`${countByRisk("HIGH")} HIGH-risk issue(s) detected — active sprint and release may be impacted`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title={
          <span style={{ color: "var(--qa-text-primary)" }}>
            Flow Impact Matrix
          </span>
        }
        extra={
          <Button
            icon={<FileExcelOutlined />}
            size="small"
            onClick={() =>
              exportIssuesToExcel(
                items.map((i) => i.issue),
                "Flow Impact",
                "flow-impact",
              )
            }
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
          scroll={{ x: 900 }}
          rowClassName={(record) =>
            record.overallRisk === "HIGH" ? "qa-high-risk-row" : ""
          }
        />
      </Card>
    </div>
  );
};

export default FlowImpact;
