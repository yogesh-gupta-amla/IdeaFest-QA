import React, { useState } from "react";
import { Card, Table, Tag, Empty, Collapse, Tooltip } from "antd";
import {
  CodeOutlined,
  BranchesOutlined,
  TeamOutlined,
  AlertOutlined,
  BulbOutlined,
  LinkOutlined,
  GithubOutlined,
  PullRequestOutlined,
} from "@ant-design/icons";
import { useCodeIntelligence } from "../../hooks/useQAData";
import type {
  ReusableComponent,
  RecentImplementation,
  DuplicateDetection,
  DeveloperInsight,
  CodeIntelRecommendation,
} from "../../types/qa";

const { Panel } = Collapse;

const SCORE_COLORS: Record<string, string> = {
  High: "#22c55e",
  Medium: "#f59e0b",
  Low: "#6b7280",
};

const CodeIntelligence: React.FC = () => {
  const { data, isLoading } = useCodeIntelligence();
  const [activeTab, setActiveTab] = useState<
    "reusable" | "recent" | "duplicates" | "developers" | "recommendations"
  >("reusable");

  if (isLoading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 60,
          color: "var(--qa-text-muted)",
        }}
      >
        Loading Code Intelligence…
      </div>
    );
  }
  if (!data) {
    return (
      <Empty
        description="No data — select a project"
        style={{ marginTop: 60, color: "var(--qa-text-muted)" }}
      />
    );
  }

  const tabs = [
    {
      key: "reusable" as const,
      label: "🔁 Reusable Components",
      count: data.reusableComponents.length,
    },
    {
      key: "recent" as const,
      label: "🚀 Recent Implementations",
      count: data.recentImplementations.length,
    },
    {
      key: "duplicates" as const,
      label: "⚠️ Overlap Detection",
      count: data.duplicateDetection.length,
    },
    {
      key: "developers" as const,
      label: "👨‍💻 Developer Insights",
      count: data.developerInsights.length,
    },
    {
      key: "recommendations" as const,
      label: "💡 AI Recommendations",
      count: data.aiRecommendations.length,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        <SummaryCard
          icon={<CodeOutlined />}
          label="Issues Analyzed"
          value={data.totalIssuesAnalyzed}
          color="#6366f1"
        />
        <SummaryCard
          icon={<GithubOutlined />}
          label="Linked Commits"
          value={data.totalCommits}
          color="#22c55e"
        />
        <SummaryCard
          icon={<PullRequestOutlined />}
          label="Pull Requests"
          value={data.totalPRs}
          color="#3b82f6"
        />
        <SummaryCard
          icon={<BranchesOutlined />}
          label="Reusable Modules"
          value={data.reusableComponents.length}
          color="#f59e0b"
        />
        <SummaryCard
          icon={<AlertOutlined />}
          label="Overlap Clusters"
          value={data.duplicateDetection.length}
          color="#f43f5e"
        />
        <SummaryCard
          icon={<TeamOutlined />}
          label="Contributors"
          value={data.developerInsights.length}
          color="#8b5cf6"
        />
      </div>

      {/* Executive Summary */}
      <Card
        size="small"
        style={{
          background: "var(--qa-bg-card)",
          border: "1px solid var(--qa-border)",
          borderRadius: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <BulbOutlined
            style={{ color: "#f59e0b", fontSize: 18, marginTop: 2 }}
          />
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "var(--qa-text-primary)",
                marginBottom: 4,
              }}
            >
              Executive Summary
            </div>
            <div
              style={{
                color: "var(--qa-text-secondary)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {data.executiveSummary}
            </div>
          </div>
        </div>
        {!data.hasDevInfo && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              background: "rgba(245,158,11,0.1)",
              borderRadius: 6,
              fontSize: 12,
              color: "#f59e0b",
            }}
          >
            ℹ️ GitHub commit data is not available. Connect GitHub to your Jira
            project for file-level analysis. Analysis is based on Jira metadata
            (labels, components, descriptions).
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border:
                activeTab === t.key
                  ? "1px solid var(--qa-accent)"
                  : "1px solid var(--qa-border)",
              background:
                activeTab === t.key ? "var(--qa-accent)" : "var(--qa-bg-card)",
              color: activeTab === t.key ? "#fff" : "var(--qa-text-secondary)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            {t.label}{" "}
            <span
              style={{
                background:
                  activeTab === t.key
                    ? "rgba(255,255,255,0.2)"
                    : "var(--qa-bg-primary)",
                padding: "1px 6px",
                borderRadius: 10,
                fontSize: 11,
                marginLeft: 4,
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "reusable" && (
        <ReusableComponentsTab items={data.reusableComponents} />
      )}
      {activeTab === "recent" && (
        <RecentImplementationsTab items={data.recentImplementations} />
      )}
      {activeTab === "duplicates" && (
        <DuplicateDetectionTab items={data.duplicateDetection} />
      )}
      {activeTab === "developers" && (
        <DeveloperInsightsTab items={data.developerInsights} />
      )}
      {activeTab === "recommendations" && (
        <RecommendationsTab items={data.aiRecommendations} />
      )}
    </div>
  );
};

// ── Summary Card ────────────────────────────────────────────────────────────
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <Card
    size="small"
    style={{
      background: "var(--qa-bg-card)",
      border: "1px solid var(--qa-border)",
      borderRadius: 10,
      textAlign: "center",
    }}
    bodyStyle={{ padding: "14px 10px" }}
  >
    <div style={{ fontSize: 22, color, marginBottom: 4 }}>{icon}</div>
    <div
      style={{ fontSize: 24, fontWeight: 700, color: "var(--qa-text-primary)" }}
    >
      {value}
    </div>
    <div style={{ fontSize: 11, color: "var(--qa-text-muted)", marginTop: 2 }}>
      {label}
    </div>
  </Card>
);

// ── Reusable Components Tab ──────────────────────────────────────────────────
const ReusableComponentsTab: React.FC<{ items: ReusableComponent[] }> = ({
  items,
}) => {
  if (items.length === 0)
    return (
      <Empty
        description="No reusable components detected"
        style={{ marginTop: 40 }}
      />
    );

  return (
    <Collapse
      accordion
      ghost
      style={{
        background: "var(--qa-bg-card)",
        borderRadius: 10,
        border: "1px solid var(--qa-border)",
      }}
    >
      {items.map((item, idx) => (
        <Panel
          key={idx}
          header={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tag color={SCORE_COLORS[item.reusabilityScore]}>
                {item.reusabilityScore}
              </Tag>
              <span
                style={{ fontWeight: 600, color: "var(--qa-text-primary)" }}
              >
                {item.componentName}
              </span>
              <span style={{ color: "var(--qa-text-muted)", fontSize: 12 }}>
                ({item.relatedIssues.length} issues)
              </span>
            </div>
          }
        >
          <div
            style={{
              fontSize: 13,
              color: "var(--qa-text-secondary)",
              marginBottom: 10,
            }}
          >
            {item.description}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: "var(--qa-text-primary)", fontSize: 12 }}>
              Related Issues:
            </strong>{" "}
            {item.relatedIssues.map((k) => (
              <Tag key={k} style={{ marginBottom: 4 }}>
                {k}
              </Tag>
            ))}
          </div>
          {item.relevantCommits.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: "var(--qa-text-primary)", fontSize: 12 }}>
                Commits:
              </strong>
              {item.relevantCommits.map((c, ci) => (
                <div
                  key={ci}
                  style={{
                    fontSize: 12,
                    color: "var(--qa-text-secondary)",
                    marginLeft: 8,
                    marginTop: 2,
                  }}
                >
                  <code style={{ color: "#6366f1" }}>{c.commitId}</code>{" "}
                  {c.summary}
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: 6 }}
                    >
                      <LinkOutlined />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(34,197,94,0.08)",
              borderRadius: 6,
              fontSize: 12,
              color: "#22c55e",
            }}
          >
            💡 {item.recommendedUsage}
          </div>
        </Panel>
      ))}
    </Collapse>
  );
};

// ── Recent Implementations Tab ───────────────────────────────────────────────
const RecentImplementationsTab: React.FC<{ items: RecentImplementation[] }> = ({
  items,
}) => {
  if (items.length === 0)
    return (
      <Empty
        description="No recent implementations found"
        style={{ marginTop: 40 }}
      />
    );

  const columns = [
    {
      title: "Issue",
      dataIndex: "issueId",
      key: "issueId",
      width: 120,
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: "var(--qa-accent)" }}>{v}</span>
      ),
    },
    {
      title: "Feature Area",
      dataIndex: "featureArea",
      key: "featureArea",
      width: 130,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Commit",
      dataIndex: "commitId",
      key: "commitId",
      width: 120,
      render: (v: string, row: RecentImplementation) =>
        v ? (
          <Tooltip title={v}>
            <a
              href={row.url}
              target="_blank"
              rel="noreferrer"
              style={{ fontFamily: "monospace", fontSize: 12 }}
            >
              {v.substring(0, 8)}… <LinkOutlined />
            </a>
          </Tooltip>
        ) : (
          <span style={{ color: "var(--qa-text-muted)", fontSize: 12 }}>
            No commit
          </span>
        ),
    },
    {
      title: "Files",
      dataIndex: "filesImpacted",
      key: "files",
      width: 80,
      render: (v: string[]) => (
        <Tooltip title={v.length > 0 ? v.join("\n") : "—"}>
          <span>{v.length}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      dataSource={items}
      columns={columns}
      rowKey="issueId"
      size="small"
      pagination={{ pageSize: 10 }}
      style={{
        background: "var(--qa-bg-card)",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--qa-border)",
      }}
    />
  );
};

// ── Duplicate / Overlap Detection Tab ────────────────────────────────────────
const DuplicateDetectionTab: React.FC<{ items: DuplicateDetection[] }> = ({
  items,
}) => {
  if (items.length === 0)
    return (
      <Empty
        description="No duplicates or overlaps detected"
        style={{ marginTop: 40 }}
      />
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, idx) => (
        <Card
          key={idx}
          size="small"
          style={{
            background: "var(--qa-bg-card)",
            border: "1px solid var(--qa-border)",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <AlertOutlined
              style={{ color: "#f43f5e", fontSize: 18, marginTop: 2 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 6 }}>
                {item.issueIds.map((k) => (
                  <Tag key={k} color="orange" style={{ marginBottom: 4 }}>
                    {k}
                  </Tag>
                ))}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--qa-text-secondary)",
                  marginBottom: 4,
                }}
              >
                {item.similarityReason}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                <span>
                  <strong style={{ color: "var(--qa-text-primary)" }}>
                    Risk:
                  </strong>{" "}
                  <span style={{ color: "#f43f5e" }}>{item.risk}</span>
                </span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  background: "rgba(99,102,241,0.08)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#6366f1",
                }}
              >
                ✅ {item.recommendation}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// ── Developer Insights Tab ───────────────────────────────────────────────────
const DeveloperInsightsTab: React.FC<{ items: DeveloperInsight[] }> = ({
  items,
}) => {
  if (items.length === 0)
    return (
      <Empty description="No developer insights" style={{ marginTop: 40 }} />
    );

  const columns = [
    {
      title: "Developer",
      dataIndex: "developer",
      key: "developer",
      width: 160,
      render: (v: string) => (
        <span style={{ fontWeight: 600, color: "var(--qa-text-primary)" }}>
          {v}
        </span>
      ),
    },
    {
      title: "Expertise Area",
      dataIndex: "expertiseArea",
      key: "expertiseArea",
      width: 200,
      render: (v: string) => (
        <span style={{ fontSize: 12 }}>
          {v.split(", ").map((a) => (
            <Tag key={a} style={{ marginBottom: 2 }}>
              {a}
            </Tag>
          ))}
        </span>
      ),
    },
    {
      title: "Commits",
      dataIndex: "notableCommits",
      key: "commits",
      width: 80,
      render: (v: string[]) => v.length,
    },
    {
      title: "Recommendation",
      dataIndex: "recommendation",
      key: "recommendation",
      ellipsis: true,
      render: (v: string) => (
        <span style={{ fontSize: 12, color: "var(--qa-text-secondary)" }}>
          {v}
        </span>
      ),
    },
  ];

  return (
    <Table
      dataSource={items}
      columns={columns}
      rowKey="developer"
      size="small"
      pagination={{ pageSize: 10 }}
      style={{
        background: "var(--qa-bg-card)",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--qa-border)",
      }}
    />
  );
};

// ── Recommendations Tab ──────────────────────────────────────────────────────
const RecommendationsTab: React.FC<{ items: CodeIntelRecommendation[] }> = ({
  items,
}) => {
  if (items.length === 0)
    return <Empty description="No recommendations" style={{ marginTop: 40 }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, idx) => (
        <Card
          key={idx}
          size="small"
          style={{
            background: "var(--qa-bg-card)",
            border: "1px solid var(--qa-border)",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <BulbOutlined
              style={{ color: "#f59e0b", fontSize: 20, marginTop: 2 }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--qa-text-primary)",
                  marginBottom: 4,
                }}
              >
                {item.headline}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                <span>
                  <strong>Component:</strong>{" "}
                  <Tag color="blue">{item.component}</Tag>
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--qa-text-secondary)",
                  marginBottom: 6,
                }}
              >
                <strong>Action:</strong> {item.action}
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  background: "rgba(34,197,94,0.08)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#22c55e",
                }}
              >
                📈 {item.expectedBenefit}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CodeIntelligence;
