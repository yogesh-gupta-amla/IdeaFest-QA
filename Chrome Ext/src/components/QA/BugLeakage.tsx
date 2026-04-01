import React from "react";
import { Card, Table, Tag, Spin, Alert, Row, Col, Statistic } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useBugLeakage } from "../../hooks/useQAData";
import { exportLeakageToExcel } from "../../utils/exportUtils";
import type { BugLeakageItem } from "../../types/qa";
import type { ColumnsType } from "antd/es/table";

const ENV_COLORS: Record<string, string> = {
  Production: "#ff4d4f",
  Staging: "#fa8c16",
  NPR: "#faad14",
  "Non-Prod": "#1677ff",
};

const PRIORITY_COLORS: Record<string, string> = {
  Blocker: "#ff0033",
  Critical: "#ff4d4f",
  High: "#fa8c16",
  Medium: "#faad14",
  Low: "#52c41a",
};

const BugLeakage: React.FC = () => {
  const { data: items = [], isLoading, error } = useBugLeakage();

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
  if (error)
    return <Alert type="error" message="Failed to load leakage data" />;

  const byEnv = (env: string) =>
    items.filter((i) => i.detectedIn === env).length;

  const columns: ColumnsType<BugLeakageItem> = [
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
      title: "Priority",
      dataIndex: ["issue", "priority"],
      width: 90,
      render: (p: string) => (
        <Tag
          style={{
            background: PRIORITY_COLORS[p] + "22",
            color: PRIORITY_COLORS[p],
            border: `1px solid ${PRIORITY_COLORS[p]}`,
          }}
        >
          {p}
        </Tag>
      ),
    },
    {
      title: "Environment",
      dataIndex: "detectedIn",
      width: 120,
      filters: ["Production", "Staging", "NPR", "Non-Prod"].map((e) => ({
        text: e,
        value: e,
      })),
      onFilter: (value, record) => record.detectedIn === value,
      render: (env: string) => (
        <Tag
          style={{
            background: ENV_COLORS[env] + "22",
            color: ENV_COLORS[env],
            border: `1px solid ${ENV_COLORS[env]}`,
            fontWeight: 600,
          }}
        >
          {env}
        </Tag>
      ),
    },
    {
      title: "Leakage Type",
      dataIndex: "leakageType",
      width: 160,
      render: (t: string) => <Tag color="red">{t}</Tag>,
    },
    {
      title: "Module",
      dataIndex: ["issue", "module"],
      width: 120,
      render: (m: string) => <Tag color="blue">{m}</Tag>,
    },
    {
      title: "Assignee",
      dataIndex: ["issue", "assignee"],
      width: 140,
      render: (a: string) => (
        <span style={{ color: "var(--qa-text-secondary)" }}>{a}</span>
      ),
    },
    {
      title: "Labels",
      dataIndex: ["issue", "labels"],
      width: 180,
      render: (labels: string[]) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {labels.map((l) => (
            <Tag key={l} style={{ fontSize: 10, padding: "0 6px" }}>
              {l}
            </Tag>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: "Total Leakages", value: items.length, color: "#ff4d4f" },
          { label: "Production", value: byEnv("Production"), color: "#ff0033" },
          { label: "Staging", value: byEnv("Staging"), color: "#fa8c16" },
          { label: "NPR", value: byEnv("NPR"), color: "#faad14" },
          { label: "Non-Prod", value: byEnv("Non-Prod"), color: "#1677ff" },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={8} md={24 / 5}>
            <Card
              style={{
                background: "var(--qa-bg-card)",
                border: `1px solid ${s.color}40`,
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

      {/* Leakage alert */}
      {byEnv("Production") > 0 && (
        <Alert
          type="error"
          showIcon
          message={`🚨 ${byEnv("Production")} bug(s) detected in Production — immediate action required`}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Table */}
      <Card
        title={
          <span style={{ color: "var(--qa-text-primary)" }}>
            Bug Leakage Issues
          </span>
        }
        extra={
          <Button
            icon={<FileExcelOutlined />}
            size="small"
            onClick={() => exportLeakageToExcel(items)}
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
        />
      </Card>
    </div>
  );
};

export default BugLeakage;
