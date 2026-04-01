import React from "react";
import {
  Card,
  Table,
  Tag,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
  Progress,
} from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useOverburntItems } from "../../hooks/useQAData";
import { exportOverburntToExcel } from "../../utils/exportUtils";
import type { OverburntItem } from "../../types/qa";
import type { ColumnsType } from "antd/es/table";

const OverburntItems: React.FC = () => {
  const { data: items = [], isLoading, error } = useOverburntItems();

  if (isLoading)
    return (
      <Spin size="large" style={{ display: "block", margin: "80px auto" }} />
    );
  if (error)
    return <Alert type="error" message="Failed to load overburnt data" />;

  const highRisk = items.filter((i) => i.riskLevel === "High").length;
  const mediumRisk = items.filter((i) => i.riskLevel === "Medium").length;

  const columns: ColumnsType<OverburntItem> = [
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
      title: "Risk",
      dataIndex: "riskLevel",
      width: 90,
      filters: [
        { text: "High", value: "High" },
        { text: "Medium", value: "Medium" },
      ],
      onFilter: (val, rec) => rec.riskLevel === val,
      render: (r: string) => (
        <Tag
          color={r === "High" ? "red" : "orange"}
          style={{ fontWeight: 600 }}
        >
          {r}
        </Tag>
      ),
    },
    {
      title: "Overburnt Score",
      dataIndex: "overburntScore",
      width: 150,
      sorter: (a, b) => b.overburntScore - a.overburntScore,
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          strokeColor={score >= 60 ? "#ff4d4f" : "#faad14"}
          trailColor="var(--qa-border)"
          format={(p) => (
            <span style={{ color: "var(--qa-text-secondary)", fontSize: 11 }}>
              {p}
            </span>
          )}
        />
      ),
    },
    {
      title: "Est. (h)",
      dataIndex: ["issue", "timeEstimate"],
      width: 70,
      render: (v: number) => (
        <span style={{ color: "var(--qa-text-secondary)" }}>{v}h</span>
      ),
    },
    {
      title: "Logged (h)",
      dataIndex: ["issue", "timeLogged"],
      width: 80,
      render: (v: number, row) => (
        <span
          style={{
            color: v > row.issue.timeEstimate ? "#ff4d4f" : "#52c41a",
            fontWeight: 600,
          }}
        >
          {v}h
        </span>
      ),
    },
    {
      title: "Status Changes",
      dataIndex: ["issue", "statusChanges"],
      width: 110,
      render: (changes: unknown[]) => (
        <Tag color={changes.length > 5 ? "red" : "default"}>
          {changes.length}
        </Tag>
      ),
    },
    {
      title: "Reopens",
      dataIndex: ["issue", "reopenCount"],
      width: 80,
      render: (r: number) => (
        <Tag color={r > 0 ? "orange" : "default"}>{r}</Tag>
      ),
    },
    {
      title: "Comments",
      dataIndex: ["issue", "commentsCount"],
      width: 90,
      render: (c: number) => <Tag color={c > 10 ? "red" : "default"}>{c}</Tag>,
    },
    {
      title: "Reasons",
      dataIndex: "overburntReasons",
      width: 240,
      render: (reasons: string[]) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {reasons.map((r, i) => (
            <span
              key={i}
              style={{ fontSize: 11, color: "var(--qa-text-muted)" }}
            >
              • {r}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: "Total Overburnt", value: items.length, color: "#fa8c16" },
          { label: "High Risk", value: highRisk, color: "#ff4d4f" },
          { label: "Medium Risk", value: mediumRisk, color: "#faad14" },
        ].map((s) => (
          <Col key={s.label} xs={24} md={8}>
            <Card
              style={{
                background: "var(--qa-bg-card)",
                border: `1px solid ${s.color}40`,
                borderRadius: 10,
                textAlign: "center",
              }}
              bodyStyle={{ padding: "20px 16px" }}
            >
              <Statistic
                title={
                  <span style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
                    {s.label}
                  </span>
                }
                value={s.value}
                valueStyle={{ fontSize: 28, fontWeight: 700, color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {highRisk > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${highRisk} High-risk overburnt item(s) — consider reassignment or scope reduction`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title={
          <span style={{ color: "var(--qa-text-primary)" }}>
            Overburnt Issues
          </span>
        }
        extra={
          <Button
            icon={<FileExcelOutlined />}
            size="small"
            onClick={() => exportOverburntToExcel(items)}
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
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

export default OverburntItems;
