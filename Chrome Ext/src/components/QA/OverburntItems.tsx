import React, { useState } from "react";
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
  Collapse,
  Tooltip,
} from "antd";
import {
  FileExcelOutlined,
  WarningOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
import { useOverburntItems } from "../../hooks/useQAData";
import { exportOverburntToExcel } from "../../utils/exportUtils";
import type { OverburntItemDetail, OverburntSeverity } from "../../types/qa";
import type { ColumnsType } from "antd/es/table";

const SEVERITY_COLORS: Record<OverburntSeverity, string> = {
  Moderate: "#faad14",
  High: "#fa8c16",
  Critical: "#ff4d4f",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  High: "#52c41a",
  Medium: "#faad14",
  Low: "#ff4d4f",
};

type TabKey = "details" | "contributors" | "insights" | "resources";

const OverburntItems: React.FC = () => {
  const {
    data: legacyItems = [],
    analysis,
    isLoading,
    error,
  } = useOverburntItems();
  const [activeTab, setActiveTab] = useState<TabKey>("details");

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
    return <Alert type="error" message="Failed to load overburnt data" />;

  const hasAnalysis = analysis && analysis.items.length > 0;

  if (!hasAnalysis) {
    return (
      <Card
        style={{
          background: "var(--qa-bg-card)",
          border: "1px solid var(--qa-border)",
          borderRadius: 12,
          textAlign: "center",
          padding: 40,
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--qa-text-primary)",
            marginBottom: 8,
          }}
        >
          No Overburnt Issues
        </div>
        <div style={{ color: "var(--qa-text-muted)", fontSize: 13 }}>
          No issues with workratio {">"} 100% found in the selected time range.
          Team is tracking well on estimates.
        </div>
      </Card>
    );
  }

  const a = analysis!;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "details", label: "Overburnt Details", icon: <WarningOutlined /> },
    {
      key: "contributors",
      label: "Contributor Analysis",
      icon: <TeamOutlined />,
    },
    { key: "insights", label: "Additional Insights", icon: <BulbOutlined /> },
    {
      key: "resources",
      label: "Resource Optimization",
      icon: <UserSwitchOutlined />,
    },
  ];

  const detailColumns: ColumnsType<OverburntItemDetail> = [
    {
      title: "Key",
      dataIndex: ["issue", "key"],
      width: 100,
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
      title: "Type",
      dataIndex: ["issue", "issueType"],
      width: 80,
      render: (t: string) => <Tag style={{ fontSize: 11 }}>{t || "—"}</Tag>,
    },
    {
      title: "Priority",
      dataIndex: ["issue", "priority"],
      width: 90,
      filters: ["Blocker", "Critical", "High", "Medium", "Low"].map((p) => ({
        text: p,
        value: p,
      })),
      onFilter: (val, rec) => rec.issue.priority === val,
      render: (p: string) => {
        const c =
          p === "Blocker" || p === "Critical"
            ? "#ff4d4f"
            : p === "High"
              ? "#fa8c16"
              : "#8c8c8c";
        return (
          <Tag color={c} style={{ fontWeight: 600 }}>
            {p}
          </Tag>
        );
      },
    },
    {
      title: "Assignee",
      dataIndex: ["issue", "assignee"],
      width: 120,
      ellipsis: true,
    },
    {
      title: "Severity",
      dataIndex: "severity",
      width: 90,
      filters: (["Moderate", "High", "Critical"] as OverburntSeverity[]).map(
        (s) => ({ text: s, value: s }),
      ),
      onFilter: (val, rec) => rec.severity === val,
      render: (s: OverburntSeverity) => (
        <Tag color={SEVERITY_COLORS[s]} style={{ fontWeight: 700 }}>
          {s}
        </Tag>
      ),
    },
    {
      title: "Est (h)",
      dataIndex: "originalEstimate",
      width: 65,
      sorter: (a, b) => a.originalEstimate - b.originalEstimate,
      render: (v: number) => (
        <span style={{ color: "var(--qa-text-secondary)" }}>{v}h</span>
      ),
    },
    {
      title: "Spent (h)",
      dataIndex: "timeSpent",
      width: 70,
      sorter: (a, b) => a.timeSpent - b.timeSpent,
      render: (v: number, row) => (
        <span
          style={{
            color: v > row.originalEstimate ? "#ff4d4f" : "#52c41a",
            fontWeight: 600,
          }}
        >
          {v}h
        </span>
      ),
    },
    {
      title: "Overburn %",
      dataIndex: "overburnPercentage",
      width: 110,
      sorter: (a, b) => a.overburnPercentage - b.overburnPercentage,
      defaultSortOrder: "descend",
      render: (pct: number) => (
        <Progress
          percent={Math.min(pct, 200)}
          size="small"
          strokeColor={
            pct > 160 ? "#ff4d4f" : pct > 130 ? "#fa8c16" : "#faad14"
          }
          trailColor="var(--qa-border)"
          format={() => (
            <span style={{ color: "var(--qa-text-secondary)", fontSize: 11 }}>
              {pct}%
            </span>
          )}
        />
      ),
    },
    {
      title: "Top Contributor",
      dataIndex: "topOverburnContributor",
      width: 140,
      render: (c: OverburntItemDetail["topOverburnContributor"]) => {
        if (!c) return "—";
        return (
          <Tooltip
            title={`${c.contributionPercentage}% of effort${!c.isAssignee ? " (NOT assignee)" : ""}`}
          >
            <span
              style={{
                color: !c.isAssignee ? "#ff4d4f" : "var(--qa-text-primary)",
                fontWeight: !c.isAssignee ? 600 : 400,
              }}
            >
              {c.name}{" "}
              {!c.isAssignee && (
                <UserSwitchOutlined style={{ fontSize: 11, marginLeft: 2 }} />
              )}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Root Cause",
      dataIndex: "overburnReason",
      width: 200,
      ellipsis: true,
      render: (r: string) => (
        <span style={{ fontSize: 11, color: "var(--qa-text-muted)" }}>{r}</span>
      ),
    },
  ];

  return (
    <div>
      {/* AI Recommendation Banner */}
      <Card
        style={{
          background:
            "linear-gradient(135deg, var(--qa-bg-card) 0%, rgba(99,102,241,0.08) 100%)",
          border: "1px solid var(--qa-accent)",
          borderRadius: 12,
          marginBottom: 16,
        }}
        bodyStyle={{ padding: "16px 20px" }}
      >
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <ThunderboltOutlined
                style={{ color: "var(--qa-accent)", fontSize: 18 }}
              />
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--qa-text-primary)",
                }}
              >
                AI Recommendation
              </span>
              <Tag
                color={CONFIDENCE_COLORS[a.aiRecommendation.confidence]}
                style={{ fontWeight: 600, fontSize: 11 }}
              >
                {a.aiRecommendation.confidence} Confidence
              </Tag>
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--qa-text-primary)",
                marginBottom: 4,
              }}
            >
              {a.aiRecommendation.headline}
            </div>
            <div style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
              Key Driver: {a.aiRecommendation.keyDriver} · Expected Impact:{" "}
              {a.aiRecommendation.expectedImpact}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Executive Summary */}
      <Alert
        type="info"
        showIcon
        message={<span style={{ fontWeight: 600 }}>Executive Summary</span>}
        description={a.executiveSummary}
        style={{
          marginBottom: 16,
          background: "var(--qa-bg-card)",
          border: "1px solid var(--qa-border)",
        }}
      />

      {/* Overburn Insights Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          {
            label: "Total Overburnt",
            value: a.overburnInsights.totalItems,
            color: "#6366f1",
          },
          {
            label: "Critical (>160%)",
            value: a.overburnInsights.criticalOverburn,
            color: "#ff4d4f",
          },
          {
            label: "High (130-160%)",
            value: a.overburnInsights.highOverburn,
            color: "#fa8c16",
          },
          {
            label: "Moderate (100-130%)",
            value: a.overburnInsights.moderateOverburn,
            color: "#faad14",
          },
          {
            label: "Assignee Mismatches",
            value: a.crossIssueAnalysis.assigneeVsActualMismatch.length,
            color: "#eb2f96",
          },
        ].map((s) => (
          <Col key={s.label} xs={12} md={4} lg={4}>
            <Card
              style={{
                background: "var(--qa-bg-card)",
                border: `1px solid ${s.color}40`,
                borderRadius: 10,
                textAlign: "center",
              }}
              bodyStyle={{ padding: "14px 10px" }}
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

      {/* Tab Navigation */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}
      >
        {tabs.map((t) => (
          <Button
            key={t.key}
            type={activeTab === t.key ? "primary" : "default"}
            icon={t.icon}
            onClick={() => setActiveTab(t.key)}
            style={{
              borderRadius: 8,
              fontWeight: activeTab === t.key ? 700 : 400,
              background:
                activeTab === t.key ? "var(--qa-accent)" : "var(--qa-bg-card)",
              borderColor:
                activeTab === t.key ? "var(--qa-accent)" : "var(--qa-border)",
              color: activeTab === t.key ? "#fff" : "var(--qa-text-secondary)",
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === "details" && (
        <Card
          title={
            <span style={{ color: "var(--qa-text-primary)" }}>
              Overburnt Issues (workratio {">"} 100%)
            </span>
          }
          extra={
            <Button
              icon={<FileExcelOutlined />}
              size="small"
              onClick={() => exportOverburntToExcel(legacyItems)}
              style={{
                background: "var(--qa-bg-card)",
                border: "1px solid var(--qa-border)",
                color: "var(--qa-text-secondary)",
              }}
            >
              Export
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
            columns={detailColumns}
            dataSource={a.items}
            rowKey={(r) => r.issue.id}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1400 }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: "8px 0" }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--qa-text-primary)",
                          marginBottom: 4,
                        }}
                      >
                        All Contributors
                      </div>
                      {record.allContributors.map((c) => (
                        <div
                          key={c.name}
                          style={{
                            fontSize: 11,
                            color: "var(--qa-text-muted)",
                            marginBottom: 2,
                          }}
                        >
                          {c.name}: {c.timeLogged}h
                          {c.name === record.issue.assignee && (
                            <Tag
                              color="blue"
                              style={{ fontSize: 10, marginLeft: 4 }}
                            >
                              Assignee
                            </Tag>
                          )}
                        </div>
                      ))}
                    </Col>
                    <Col span={8}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--qa-text-primary)",
                          marginBottom: 4,
                        }}
                      >
                        Actionable Fix
                      </div>
                      <div
                        style={{ fontSize: 11, color: "var(--qa-text-muted)" }}
                      >
                        {record.actionableFix}
                      </div>
                    </Col>
                    <Col span={8}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--qa-text-primary)",
                          marginBottom: 4,
                        }}
                      >
                        Expected Improvement
                      </div>
                      <div
                        style={{ fontSize: 11, color: "var(--qa-text-muted)" }}
                      >
                        {record.expectedImprovement}
                      </div>
                    </Col>
                  </Row>
                </div>
              ),
            }}
          />
        </Card>
      )}

      {/* Contributors Tab */}
      {activeTab === "contributors" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title={
              <span style={{ color: "var(--qa-text-primary)" }}>
                <TeamOutlined style={{ marginRight: 8 }} />
                Top Overburn Contributors
              </span>
            }
            style={{
              background: "var(--qa-bg-card)",
              border: "1px solid var(--qa-border)",
              borderRadius: 12,
            }}
            styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
          >
            {a.crossIssueAnalysis.topOverburnContributors.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--qa-text-muted)",
                  padding: 20,
                }}
              >
                No cross-issue contributors found
              </div>
            ) : (
              <Table
                dataSource={a.crossIssueAnalysis.topOverburnContributors}
                rowKey="name"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: "Name",
                    dataIndex: "name",
                    render: (n: string) => (
                      <span style={{ fontWeight: 600 }}>{n}</span>
                    ),
                  },
                  {
                    title: "Excess Hours",
                    dataIndex: "totalExtraTimeLogged",
                    width: 110,
                    sorter: (a, b) =>
                      a.totalExtraTimeLogged - b.totalExtraTimeLogged,
                    render: (v: number) => (
                      <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
                        {v}h
                      </span>
                    ),
                  },
                  { title: "Issues", dataIndex: "issuesInvolved", width: 70 },
                  {
                    title: "Risk",
                    dataIndex: "risk",
                    ellipsis: true,
                    render: (r: string) => (
                      <span
                        style={{ fontSize: 11, color: "var(--qa-text-muted)" }}
                      >
                        {r}
                      </span>
                    ),
                  },
                  {
                    title: "Recommendation",
                    dataIndex: "recommendation",
                    ellipsis: true,
                    render: (r: string) => (
                      <span
                        style={{ fontSize: 11, color: "var(--qa-text-muted)" }}
                      >
                        {r}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </Card>

          <Card
            title={
              <span style={{ color: "var(--qa-text-primary)" }}>
                <UserSwitchOutlined style={{ marginRight: 8 }} />
                Assignee vs. Actual Contributor Mismatch
              </span>
            }
            style={{
              background: "var(--qa-bg-card)",
              border: "1px solid var(--qa-border)",
              borderRadius: 12,
            }}
            styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
          >
            {a.crossIssueAnalysis.assigneeVsActualMismatch.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--qa-text-muted)",
                  padding: 20,
                }}
              >
                No mismatches detected — assignees match top contributors
              </div>
            ) : (
              <Table
                dataSource={a.crossIssueAnalysis.assigneeVsActualMismatch}
                rowKey="issueId"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: "Issue",
                    dataIndex: "issueId",
                    width: 100,
                    render: (k: string) => (
                      <span
                        style={{ fontWeight: 600, color: "var(--qa-accent)" }}
                      >
                        {k}
                      </span>
                    ),
                  },
                  { title: "Assignee", dataIndex: "assignee", width: 120 },
                  {
                    title: "Actual Top Contributor",
                    dataIndex: "actualTopContributor",
                    width: 150,
                    render: (n: string) => (
                      <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
                        {n}
                      </span>
                    ),
                  },
                  {
                    title: "Insight",
                    dataIndex: "insight",
                    ellipsis: true,
                    render: (i: string) => (
                      <span
                        style={{ fontSize: 11, color: "var(--qa-text-muted)" }}
                      >
                        {i}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === "insights" && (
        <Collapse
          defaultActiveKey={["types", "priority", "cycle"]}
          style={{
            background: "var(--qa-bg-card)",
            border: "1px solid var(--qa-border)",
            borderRadius: 12,
          }}
          items={[
            {
              key: "types",
              label: (
                <span
                  style={{ fontWeight: 600, color: "var(--qa-text-primary)" }}
                >
                  🔥 High-Risk Issue Types
                </span>
              ),
              children:
                a.additionalInsights.highRiskIssueTypes.length === 0 ? (
                  <div style={{ color: "var(--qa-text-muted)" }}>
                    No high-risk patterns by issue type
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {a.additionalInsights.highRiskIssueTypes.map((t, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Tag color="red">{t.issuetype}</Tag>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--qa-text-muted)",
                          }}
                        >
                          {t.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
            },
            {
              key: "priority",
              label: (
                <span
                  style={{ fontWeight: 600, color: "var(--qa-text-primary)" }}
                >
                  📊 Priority-Based Overburn
                </span>
              ),
              children:
                a.additionalInsights.priorityBasedOverburn.length === 0 ? (
                  <div style={{ color: "var(--qa-text-muted)" }}>
                    No priority-based patterns
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {a.additionalInsights.priorityBasedOverburn.map((p, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Tag
                          color={
                            p.priority === "Blocker" ||
                            p.priority === "Critical"
                              ? "red"
                              : p.priority === "High"
                                ? "orange"
                                : "default"
                          }
                        >
                          {p.priority}
                        </Tag>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--qa-text-muted)",
                          }}
                        >
                          {p.observation}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
            },
            {
              key: "cycle",
              label: (
                <span
                  style={{ fontWeight: 600, color: "var(--qa-text-primary)" }}
                >
                  ⏱️ Cycle Time Flags
                </span>
              ),
              children:
                a.additionalInsights.cycleTimeFlags.length === 0 ? (
                  <div style={{ color: "var(--qa-text-muted)" }}>
                    No cycle time anomalies
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {a.additionalInsights.cycleTimeFlags.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Tag color="volcano">{f.issueId}</Tag>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--qa-text-muted)",
                          }}
                        >
                          {f.delayReason}
                        </span>
                      </div>
                    ))}
                  </div>
                ),
            },
          ]}
        />
      )}

      {/* Resources Tab */}
      {activeTab === "resources" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card
            title={
              <span style={{ color: "var(--qa-text-primary)" }}>
                🔴 Overutilized Resources
              </span>
            }
            style={{
              background: "var(--qa-bg-card)",
              border: "1px solid var(--qa-border)",
              borderRadius: 12,
            }}
            styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
          >
            {a.resourceOptimization.overutilized.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--qa-text-muted)",
                  padding: 20,
                }}
              >
                No overutilized resources detected
              </div>
            ) : (
              <Table
                dataSource={a.resourceOptimization.overutilized}
                rowKey="name"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: "Name",
                    dataIndex: "name",
                    render: (n: string) => (
                      <span style={{ fontWeight: 600 }}>{n}</span>
                    ),
                  },
                  {
                    title: "Total Logged",
                    dataIndex: "totalLoggedTime",
                    width: 100,
                    render: (v: number) => (
                      <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
                        {v}h
                      </span>
                    ),
                  },
                  {
                    title: "Risk",
                    dataIndex: "risk",
                    ellipsis: true,
                    render: (r: string) => (
                      <span style={{ fontSize: 11, color: "#ff4d4f" }}>
                        {r}
                      </span>
                    ),
                  },
                  {
                    title: "Recommendation",
                    dataIndex: "recommendation",
                    ellipsis: true,
                    render: (r: string) => (
                      <span
                        style={{ fontSize: 11, color: "var(--qa-text-muted)" }}
                      >
                        {r}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </Card>

          <Card
            title={
              <span style={{ color: "var(--qa-text-primary)" }}>
                🟢 Underutilized Resources
              </span>
            }
            style={{
              background: "var(--qa-bg-card)",
              border: "1px solid var(--qa-border)",
              borderRadius: 12,
            }}
            styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
          >
            {a.resourceOptimization.underutilized.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--qa-text-muted)",
                  padding: 20,
                }}
              >
                No underutilized resources detected
              </div>
            ) : (
              <Table
                dataSource={a.resourceOptimization.underutilized}
                rowKey="name"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: "Name",
                    dataIndex: "name",
                    render: (n: string) => (
                      <span style={{ fontWeight: 600 }}>{n}</span>
                    ),
                  },
                  {
                    title: "Utilization Gap",
                    dataIndex: "utilizationGap",
                    width: 150,
                    render: (g: string) => <Tag color="green">{g}</Tag>,
                  },
                  {
                    title: "Recommendation",
                    dataIndex: "recommendation",
                    ellipsis: true,
                    render: (r: string) => (
                      <span
                        style={{ fontSize: 11, color: "var(--qa-text-muted)" }}
                      >
                        {r}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default OverburntItems;
