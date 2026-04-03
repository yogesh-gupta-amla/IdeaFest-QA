import React from "react";
import { Row, Col, Card, Tag, Spin, Alert, Progress } from "antd";
import {
  RobotOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
  RiseOutlined,
  WarningOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useAIRecommendations } from "../../hooks/useQAData";
import type {
  AIImmediateAction,
  AIOptimizationTip,
  AIPrioritizedFix,
  AIRiskPrediction,
  AIProjectAnalysis,
  AIOverutilizedResource,
  AIUnderutilizedResource,
  AIResourceOptimizationRecommendation,
} from "../../types/qa";

const SEVERITY_COLORS: Record<string, string> = {
  High: "#ff4d4f",
  Medium: "#fa8c16",
  Low: "#52c41a",
};

const getScoreTone = (score: number) => {
  if (score >= 80) return { label: "Healthy", color: "#52c41a" };
  if (score >= 60) return { label: "Watch", color: "#fa8c16" };
  return { label: "At Risk", color: "#ff4d4f" };
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({
  icon,
  title,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
      fontWeight: 700,
      fontSize: 15,
      color: "var(--qa-text-primary)",
    }}
  >
    <span style={{ color: "var(--qa-accent)" }}>{icon}</span>
    <span>{title}</span>
  </div>
);

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  helper: string;
}> = ({ label, value, helper }) => (
  <Card
    style={{
      borderRadius: 14,
      border: "1px solid var(--qa-border)",
      background: "var(--qa-bg-card)",
      height: "100%",
    }}
    bodyStyle={{ padding: 18 }}
  >
    <div
      style={{ fontSize: 12, color: "var(--qa-text-muted)", marginBottom: 8 }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 28,
        fontWeight: 800,
        color: "var(--qa-text-primary)",
        lineHeight: 1,
        marginBottom: 10,
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: 12, color: "var(--qa-text-secondary)" }}>
      {helper}
    </div>
  </Card>
);

const ActionCard: React.FC<{ action: AIImmediateAction }> = ({ action }) => {
  const color = SEVERITY_COLORS[action.severity];

  return (
    <Card
      style={{
        background: `${color}10`,
        border: `1px solid ${color}40`,
        borderRadius: 16,
        height: "100%",
      }}
      bodyStyle={{ padding: 18 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Tag
          style={{
            background: `${color}20`,
            color,
            border: `1px solid ${color}`,
            fontWeight: 700,
          }}
        >
          {action.severity}
        </Tag>
        <WarningOutlined style={{ color, fontSize: 16 }} />
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          color: "var(--qa-text-primary)",
          lineHeight: 1.5,
          marginBottom: 10,
        }}
      >
        {action.issue}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--qa-text-secondary)",
          lineHeight: 1.6,
          marginBottom: 12,
        }}
      >
        {action.action}
      </div>
      <div
        style={{
          padding: "10px 12px",
          background: "var(--qa-bg-secondary)",
          borderRadius: 10,
          border: "1px solid var(--qa-border)",
          fontSize: 12,
          color: "var(--qa-text-secondary)",
        }}
      >
        {action.expectedImpact}
      </div>
    </Card>
  );
};

const RiskCard: React.FC<{ risk: AIRiskPrediction }> = ({ risk }) => (
  <Card
    style={{
      borderRadius: 14,
      border: "1px solid var(--qa-border)",
      background: "var(--qa-bg-card)",
      height: "100%",
    }}
    bodyStyle={{ padding: 18 }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontWeight: 700,
          color: "var(--qa-text-primary)",
          fontSize: 14,
        }}
      >
        {risk.risk}
      </div>
      <Tag
        color={
          risk.probability === "High"
            ? "red"
            : risk.probability === "Medium"
              ? "orange"
              : "green"
        }
      >
        {risk.probability}
      </Tag>
    </div>
    <div
      style={{
        fontSize: 13,
        color: "var(--qa-text-secondary)",
        marginBottom: 10,
      }}
    >
      {risk.impact}
    </div>
    <div
      style={{ fontSize: 12, color: "var(--qa-text-muted)", marginBottom: 8 }}
    >
      {risk.prediction}
    </div>
    <div style={{ fontSize: 12, color: "var(--qa-text-secondary)" }}>
      <strong>Mitigation:</strong> {risk.mitigation}
    </div>
  </Card>
);

const TipCard: React.FC<{ tip: AIOptimizationTip }> = ({ tip }) => (
  <Card
    style={{
      borderRadius: 14,
      border: "1px solid var(--qa-border)",
      background: "var(--qa-bg-card)",
      height: "100%",
    }}
    bodyStyle={{ padding: 18 }}
  >
    <div
      style={{
        fontWeight: 700,
        fontSize: 14,
        color: "var(--qa-text-primary)",
        marginBottom: 8,
      }}
    >
      {tip.area}
    </div>
    <div
      style={{
        fontSize: 13,
        color: "var(--qa-text-secondary)",
        marginBottom: 10,
      }}
    >
      {tip.issue}
    </div>
    <div
      style={{ fontSize: 12, color: "var(--qa-text-muted)", marginBottom: 8 }}
    >
      {tip.recommendation}
    </div>
    <Tag style={{ borderRadius: 999, paddingInline: 10 }}>
      {tip.expectedGain}
    </Tag>
  </Card>
);

const FixCard: React.FC<{ fix: AIPrioritizedFix }> = ({ fix }) => (
  <Card
    style={{
      borderRadius: 14,
      border: "1px solid var(--qa-border)",
      background: "var(--qa-bg-card)",
      height: "100%",
    }}
    bodyStyle={{ padding: 18 }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: "rgba(79,142,247,0.18)",
          color: "var(--qa-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
        }}
      >
        {fix.priorityRank}
      </div>
      <div
        style={{
          fontWeight: 700,
          color: "var(--qa-text-primary)",
          fontSize: 14,
        }}
      >
        {fix.fix}
      </div>
    </div>
    <div
      style={{
        fontSize: 13,
        color: "var(--qa-text-secondary)",
        marginBottom: 8,
      }}
    >
      {fix.reason}
    </div>
    <div style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
      {fix.expectedImpact}
    </div>
  </Card>
);

const ResourceList: React.FC<{
  title: string;
  emptyText: string;
  items: Array<{
    name: string;
    utilizationPercentage: number;
    summary: string;
    recommendation: string;
  }>;
}> = ({ title, emptyText, items }) => (
  <Card
    style={{
      borderRadius: 14,
      border: "1px solid var(--qa-border)",
      background: "var(--qa-bg-card)",
      height: "100%",
    }}
    bodyStyle={{ padding: 18 }}
  >
    <div
      style={{
        fontWeight: 700,
        color: "var(--qa-text-primary)",
        marginBottom: 12,
      }}
    >
      {title}
    </div>
    {items.length === 0 ? (
      <div style={{ fontSize: 13, color: "var(--qa-text-muted)" }}>
        {emptyText}
      </div>
    ) : (
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <div
            key={item.name}
            style={{
              border: "1px solid var(--qa-border)",
              borderRadius: 12,
              padding: 12,
              background: "var(--qa-bg-secondary)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--qa-text-primary)" }}>
                {item.name}
              </div>
              <Tag>{item.utilizationPercentage}%</Tag>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--qa-text-secondary)",
                marginBottom: 6,
              }}
            >
              {item.summary}
            </div>
            <div style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
              {item.recommendation}
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);

const AIRecommendations: React.FC = () => {
  const { data: analysis, isLoading, error } = useAIRecommendations();

  if (isLoading) {
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
  }

  if (error) {
    const errMsg = typeof error === "string" ? error : (error && (error as any).message) || String(error);
    return <Alert type="error" message="Failed to generate AI analysis" description={errMsg} />;
  }

  if (!analysis) {
    return (
      <Alert
        type="info"
        message="AI analysis will appear after project data is loaded."
        showIcon
      />
    );
  }

  const scoreTone = getScoreTone(analysis.projectHealthScore);

  return (
    <div>
      <div
        style={{
          background:
            "radial-gradient(circle at top left, rgba(79,142,247,0.22), rgba(79,142,247,0.04) 55%), var(--qa-bg-card)",
          border: "1px solid rgba(79,142,247,0.28)",
          borderRadius: 18,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <RobotOutlined
                style={{ fontSize: 28, color: "var(--qa-accent)" }}
              />
              <Tag color="blue">Live Jira Analysis</Tag>
              <Tag>{analysis.projectKey}</Tag>
              <Tag>{analysis.timeRangeLabel}</Tag>
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "var(--qa-text-primary)",
                marginBottom: 10,
              }}
            >
              {analysis.aiRecommendation.headline}
            </div>
            <div
              style={{
                color: "var(--qa-text-secondary)",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              {analysis.executiveSummary}
            </div>
            {analysis.sprintName && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "var(--qa-text-muted)",
                }}
              >
                Sprint context: {analysis.sprintName}
              </div>
            )}
          </div>

          <div
            style={{
              width: 220,
              display: "grid",
              justifyItems: "center",
              gap: 8,
            }}
          >
            <Progress
              type="circle"
              percent={analysis.projectHealthScore}
              strokeColor={scoreTone.color}
              format={() => `${analysis.projectHealthScore}`}
              size={132}
            />
            <div style={{ fontWeight: 800, color: scoreTone.color }}>
              {scoreTone.label}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--qa-text-muted)",
                textAlign: "center",
              }}
            >
              Estimated improvement potential{" "}
              {analysis.aiRecommendation.impactPercentage}% · Confidence{" "}
              {analysis.aiRecommendation.confidence}
            </div>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            label="Completion Rate"
            value={`${Math.round(analysis.metricsSnapshot.completionRate)}%`}
            helper={`${analysis.metricsSnapshot.resolvedInRange} resolved / ${analysis.metricsSnapshot.createdInRange} created`}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            label="Sprint Velocity"
            value={
              analysis.metricsSnapshot.sprintVelocity ||
              analysis.metricsSnapshot.resolvedInRange
            }
            helper={
              analysis.metricsSnapshot.sprintVelocity > 0
                ? "Resolved story points"
                : "Resolved work items"
            }
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            label="Cycle Time"
            value={`${Math.round(analysis.metricsSnapshot.cycleTimeHours)}h`}
            helper="Average created-to-resolved duration"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <MetricCard
            label="Reopened / Overdue"
            value={`${analysis.metricsSnapshot.reopenedIssues} / ${analysis.metricsSnapshot.overdueTasks}`}
            helper="Repeat failures and due-date breaches"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={14}>
          <Card
            style={{
              borderRadius: 16,
              border: "1px solid var(--qa-border)",
              background: "var(--qa-bg-card)",
              height: "100%",
            }}
            bodyStyle={{ padding: 20 }}
          >
            <SectionTitle
              icon={<ThunderboltOutlined />}
              title="Executive Summary"
            />
            <div
              style={{
                fontSize: 14,
                color: "var(--qa-text-secondary)",
                lineHeight: 1.7,
                marginBottom: 14,
              }}
            >
              {analysis.executiveSummary}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 14,
                borderRadius: 12,
                background: "var(--qa-bg-secondary)",
                border: "1px solid var(--qa-border)",
              }}
            >
              <RiseOutlined style={{ color: "var(--qa-accent)" }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--qa-text-primary)",
                    marginBottom: 4,
                  }}
                >
                  {analysis.aiRecommendation.headline}
                </div>
                <div style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
                  Estimated impact {analysis.aiRecommendation.impactPercentage}%
                  · Confidence {analysis.aiRecommendation.confidence}
                </div>
              </div>
              <ArrowRightOutlined style={{ color: "var(--qa-text-muted)" }} />
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card
            style={{
              borderRadius: 16,
              border: "1px solid var(--qa-border)",
              background: "var(--qa-bg-card)",
              height: "100%",
            }}
            bodyStyle={{ padding: 20 }}
          >
            <SectionTitle icon={<WarningOutlined />} title="KPI Insight" />
            {analysis.kpiInsights.storyWithMaxBugs ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <Tag color="red">Top Defect Cluster</Tag>
                  <div
                    style={{ fontWeight: 800, color: "var(--qa-text-primary)" }}
                  >
                    {analysis.kpiInsights.storyWithMaxBugs.bugCount} bugs
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--qa-text-primary)",
                    marginBottom: 8,
                  }}
                >
                  {analysis.kpiInsights.storyWithMaxBugs.storyId}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--qa-text-secondary)",
                    lineHeight: 1.6,
                    marginBottom: 10,
                  }}
                >
                  {analysis.kpiInsights.storyWithMaxBugs.rootCause}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--qa-text-muted)",
                    marginBottom: 8,
                  }}
                >
                  {analysis.kpiInsights.storyWithMaxBugs.recommendation}
                </div>
                <Tag>
                  {analysis.kpiInsights.storyWithMaxBugs.expectedImpact}
                </Tag>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--qa-text-muted)" }}>
                No concentrated bug story was detected in the current analysis
                window.
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 24 }}>
        <SectionTitle icon={<WarningOutlined />} title="Immediate Actions" />
        <Row gutter={[16, 16]}>
          {analysis.aiInsightsPanel.immediateActions.map((action: AIImmediateAction) => (
            <Col key={action.issue} xs={24} lg={12} xl={6}>
              <ActionCard action={action} />
            </Col>
          ))}
        </Row>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionTitle icon={<RiseOutlined />} title="Risks And Predictions" />
        <Row gutter={[16, 16]}>
          {analysis.aiInsightsPanel.risksAndPredictions.map((risk: AIRiskPrediction) => (
            <Col key={risk.risk} xs={24} xl={8}>
              <RiskCard risk={risk} />
            </Col>
          ))}
        </Row>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionTitle icon={<TeamOutlined />} title="Resource Suggestions" />
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <ResourceList
              title="Overutilized Resources"
              emptyText="No owner is materially above team-average load in the current window."
              items={analysis.aiInsightsPanel.resourceSuggestions.overutilizedResources.map(
                (resource: AIOverutilizedResource) => ({
                  name: resource.name,
                  utilizationPercentage: resource.utilizationPercentage,
                  summary: resource.risk,
                  recommendation: resource.recommendation,
                }),
              )}
            />
          </Col>
          <Col xs={24} xl={12}>
            <ResourceList
              title="Underutilized Resources"
              emptyText="No meaningful spare capacity signal was detected for the current open queue."
              items={analysis.aiInsightsPanel.resourceSuggestions.underutilizedResources.map(
                (resource: AIUnderutilizedResource) => ({
                  name: resource.name,
                  utilizationPercentage: resource.utilizationPercentage,
                  summary: resource.opportunity,
                  recommendation: resource.recommendation,
                }),
              )}
            />
          </Col>
        </Row>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionTitle
          icon={<ThunderboltOutlined />}
          title="Optimization Tips"
        />
        <Row gutter={[16, 16]}>
          {analysis.aiInsightsPanel.optimizationTips.map((tip: AIOptimizationTip) => (
            <Col key={tip.area} xs={24} md={12} xl={6}>
              <TipCard tip={tip} />
            </Col>
          ))}
        </Row>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionTitle
          icon={<TeamOutlined />}
          title="Resource Optimization Recommendations"
        />
        <Row gutter={[16, 16]}>
          {analysis.resourceOptimizationRecommendations.map((item: AIResourceOptimizationRecommendation) => (
            <Col key={item.problem} xs={24} md={12}>
              <Card
                style={{
                  borderRadius: 14,
                  border: "1px solid var(--qa-border)",
                  background: "var(--qa-bg-card)",
                  height: "100%",
                }}
                bodyStyle={{ padding: 18 }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--qa-text-primary)",
                    marginBottom: 8,
                  }}
                >
                  {item.problem}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--qa-text-secondary)",
                    marginBottom: 8,
                  }}
                >
                  {item.currentState}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--qa-text-muted)",
                    marginBottom: 8,
                  }}
                >
                  {item.recommendedAction}
                </div>
                <Tag>{item.expectedOutcome}</Tag>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <div>
        <SectionTitle icon={<RobotOutlined />} title="Prioritized Fixes" />
        <Row gutter={[16, 16]}>
          {analysis.prioritizedFixes.map((fix: AIPrioritizedFix) => (
            <Col key={`${fix.priorityRank}-${fix.fix}`} xs={24} md={8}>
              <FixCard fix={fix} />
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default AIRecommendations;
