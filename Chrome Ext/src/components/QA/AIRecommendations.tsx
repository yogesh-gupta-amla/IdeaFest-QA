import React from "react";
import { Row, Col, Card, Tag, Spin, Alert, Progress } from "antd";
import {
  RobotOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useAIRecommendations } from "../../hooks/useQAData";
import type { AIRecommendation } from "../../types/qa";

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#ff4d4f",
  High: "#fa8c16",
  Medium: "#faad14",
};

const PRIORITY_GRADIENT: Record<string, string> = {
  Critical:
    "linear-gradient(135deg, rgba(255,77,79,0.15), rgba(255,77,79,0.05))",
  High: "linear-gradient(135deg, rgba(250,140,22,0.15), rgba(250,140,22,0.05))",
  Medium:
    "linear-gradient(135deg, rgba(250,173,20,0.15), rgba(250,173,20,0.05))",
};

const RecommendationCard: React.FC<{
  rec: AIRecommendation;
  index: number;
}> = ({ rec, index }) => {
  const color = PRIORITY_COLORS[rec.priority];
  const gradient = PRIORITY_GRADIENT[rec.priority];

  return (
    <Card
      style={{
        background: gradient,
        border: `1px solid ${color}40`,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: color,
        height: "100%",
      }}
      bodyStyle={{ padding: 24 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: color + "22",
            border: `1px solid ${color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {index === 0 ? "🎯" : index === 1 ? "⏰" : "🔄"}
        </div>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <Tag
              style={{
                background: color + "22",
                color,
                border: `1px solid ${color}`,
                fontWeight: 600,
              }}
            >
              #{index + 1} · {rec.priority}
            </Tag>
            <Tag
              style={{
                background: "var(--qa-bg-card)",
                color: "var(--qa-text-muted)",
                border: "1px solid var(--qa-border)",
                fontSize: 11,
              }}
            >
              {rec.category}
            </Tag>
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--qa-text-primary)",
              lineHeight: 1.4,
            }}
          >
            {rec.title}
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          color: "var(--qa-text-secondary)",
          fontSize: 13,
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        {rec.description}
      </p>

      {/* Impact Meter */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
            Severity Score Reduction
          </span>
          <span style={{ fontWeight: 700, color, fontSize: 16 }}>
            {rec.impactPercent}%
          </span>
        </div>
        <Progress
          percent={rec.impactPercent}
          showInfo={false}
          strokeColor={color}
          trailColor="var(--qa-border)"
          strokeWidth={8}
        />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          padding: "12px 0",
          borderTop: "1px solid var(--qa-border)",
          borderBottom: "1px solid var(--qa-border)",
          marginBottom: 16,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color }}>
            {rec.bugCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--qa-text-muted)" }}>
            Issues
          </div>
        </div>
        <div style={{ width: 1, background: "var(--qa-border)" }} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--qa-text-muted)",
              marginBottom: 2,
            }}
          >
            Affected Story
          </div>
          <div
            style={{
              fontWeight: 600,
              color: "var(--qa-text-primary)",
              fontSize: 13,
            }}
          >
            {rec.storyName}
          </div>
        </div>
      </div>

      {/* Action */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "var(--qa-bg-card)",
          borderRadius: 8,
          border: "1px solid var(--qa-border)",
        }}
      >
        <ThunderboltOutlined style={{ color }} />
        <span style={{ fontSize: 13, color: "var(--qa-text-secondary)" }}>
          {rec.action}
        </span>
        <ArrowRightOutlined
          style={{ color: "var(--qa-text-muted)", marginLeft: "auto" }}
        />
      </div>
    </Card>
  );
};

const AIRecommendations: React.FC = () => {
  const {
    data: recommendations = [],
    isLoading,
    error,
  } = useAIRecommendations();

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
    return <Alert type="error" message="Failed to generate recommendations" />;

  return (
    <div>
      {/* Header Banner */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(79,142,247,0.15), rgba(79,142,247,0.03))",
          border: "1px solid rgba(79,142,247,0.3)",
          borderRadius: 12,
          padding: "16px 24px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <RobotOutlined style={{ fontSize: 36, color: "var(--qa-accent)" }} />
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: "var(--qa-text-primary)",
            }}
          >
            AI-Powered QA Recommendations
          </div>
          <div style={{ color: "var(--qa-text-secondary)", fontSize: 13 }}>
            Top {recommendations.length} actionable recommendations based on
            issue patterns, SLA breaches, and reopen cycles. Each recommendation
            includes estimated severity score reduction impact.
          </div>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <Alert
          type="success"
          message="No critical recommendations at this time. Project health looks stable."
          showIcon
        />
      ) : (
        <Row gutter={[20, 20]}>
          {recommendations.map((rec, i) => (
            <Col key={rec.id} xs={24} lg={8}>
              <RecommendationCard rec={rec} index={i} />
            </Col>
          ))}
        </Row>
      )}

      {/* Methodology note */}
      <Card
        style={{
          background: "var(--qa-bg-card)",
          border: "1px solid var(--qa-border)",
          borderRadius: 12,
          marginTop: 24,
        }}
        bodyStyle={{ padding: 20 }}
      >
        <div
          style={{
            fontWeight: 600,
            color: "var(--qa-text-primary)",
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          📋 Recommendation Methodology
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              icon: "🐛",
              title: "Bug Density",
              desc: "Stories with most bugs are prioritized first",
            },
            {
              icon: "⏰",
              title: "SLA Analysis",
              desc: "AGED issues exceeding SLA trigger escalation",
            },
            {
              icon: "🔄",
              title: "Reopen Pattern",
              desc: "Issues reopened 2+ times indicate root cause gaps",
            },
          ].map((m) => (
            <div
              key={m.title}
              style={{
                display: "flex",
                gap: 10,
                padding: 12,
                background: "var(--qa-bg-secondary)",
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--qa-text-primary)",
                  }}
                >
                  {m.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--qa-text-muted)" }}>
                  {m.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AIRecommendations;
