import React, { useState } from "react";
import {
  Card,
  Table,
  Tag,
  Spin,
  Alert,
  Statistic,
  Row,
  Col,
  Badge,
} from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTopStories } from "../../hooks/useQAData";
import ChartCard from "../Charts/ChartCard";
import { exportIssuesToExcel } from "../../utils/exportUtils";
import { FileExcelOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { TopStory } from "../../types/qa";
import type { ColumnsType } from "antd/es/table";
import type { QAIssue } from "../../types/qa";

const STORY_COLORS = ["#ff4d4f", "#fa8c16", "#faad14"];

const PRIORITY_COLORS: Record<string, string> = {
  Blocker: "#ff0033",
  Critical: "#ff4d4f",
  High: "#fa8c16",
  Medium: "#faad14",
  Low: "#52c41a",
};

const bugColumns: ColumnsType<QAIssue> = [
  {
    title: "Key",
    dataIndex: "key",
    width: 100,
    render: (k: string) => (
      <span style={{ color: "var(--qa-accent)", fontWeight: 600 }}>{k}</span>
    ),
  },
  {
    title: "Summary",
    dataIndex: "summary",
    ellipsis: true,
    render: (s: string) => (
      <span style={{ color: "var(--qa-text-primary)" }}>{s}</span>
    ),
  },
  {
    title: "Priority",
    dataIndex: "priority",
    width: 90,
    render: (p: string) => (
      <Tag
        color={PRIORITY_COLORS[p] ? undefined : "default"}
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
    title: "Status",
    dataIndex: "status",
    width: 110,
    render: (s: string) => <Tag>{s}</Tag>,
  },
  {
    title: "Assignee",
    dataIndex: "assignee",
    width: 140,
    render: (a: string) => (
      <span style={{ color: "var(--qa-text-secondary)" }}>{a}</span>
    ),
  },
];

const TopStories: React.FC = () => {
  const { data: stories = [], isLoading, error } = useTopStories();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
    return <Alert type="error" message="Failed to load stories data" />;

  const chartData = stories.map((s) => ({
    name: s.storyKey,
    title: s.storyTitle,
    bugs: s.bugCount,
    critical: s.criticalCount,
    high: s.highCount,
  }));

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div>
      {/* Summary Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {stories.map((story, i) => (
          <Col key={story.storyKey} xs={24} md={8}>
            <Card
              style={{
                background: "var(--qa-bg-card)",
                border: `1px solid ${STORY_COLORS[i]}`,
                borderRadius: 12,
                borderLeftWidth: 4,
              }}
              bodyStyle={{ padding: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Tag color="blue">{story.storyKey}</Tag>
                <Badge
                  count={story.bugCount}
                  overflowCount={99}
                  color={STORY_COLORS[i]}
                />
              </div>
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--qa-text-primary)",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                {story.storyTitle}
              </div>
              <Row gutter={8}>
                <Col span={8}>
                  <Statistic
                    title={
                      <span
                        style={{ fontSize: 10, color: "var(--qa-text-muted)" }}
                      >
                        Total Bugs
                      </span>
                    }
                    value={story.bugCount}
                    valueStyle={{ fontSize: 18, color: STORY_COLORS[i] }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={
                      <span
                        style={{ fontSize: 10, color: "var(--qa-text-muted)" }}
                      >
                        Critical
                      </span>
                    }
                    value={story.criticalCount}
                    valueStyle={{ fontSize: 18, color: "#ff4d4f" }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={
                      <span
                        style={{ fontSize: 10, color: "var(--qa-text-muted)" }}
                      >
                        High
                      </span>
                    }
                    value={story.highCount}
                    valueStyle={{ fontSize: 18, color: "#fa8c16" }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Bar Chart */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <ChartCard title="Bug Count per Story" id="stories-bar" height={220}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--qa-border)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--qa-text-muted)" }}
                />
                <YAxis tick={{ fontSize: 10, fill: "var(--qa-text-muted)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--qa-bg-card)",
                    border: "1px solid var(--qa-border)",
                  }}
                  formatter={(val, _name, props) => [val, props.payload.title]}
                />
                <Bar dataKey="bugs" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={STORY_COLORS[i] ?? "#888"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* Expandable bug tables per story */}
      {stories.map((story, i) => (
        <Card
          key={story.storyKey}
          style={{
            background: "var(--qa-bg-card)",
            border: "1px solid var(--qa-border)",
            borderRadius: 12,
            marginBottom: 16,
          }}
          styles={{ header: { borderBottom: "1px solid var(--qa-border)" } }}
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: STORY_COLORS[i], fontWeight: 700 }}>
                #{i + 1}
              </span>
              <span style={{ color: "var(--qa-text-primary)" }}>
                {story.storyTitle}
              </span>
              <Tag color="blue">{story.storyKey}</Tag>
              <Badge
                count={`${story.bugCount} bugs`}
                style={{ background: STORY_COLORS[i] }}
              />
            </div>
          }
          extra={
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                size="small"
                icon={<FileExcelOutlined />}
                onClick={() =>
                  exportIssuesToExcel(
                    story.bugs,
                    story.storyKey,
                    story.storyKey,
                  )
                }
                style={{
                  background: "transparent",
                  border: "1px solid var(--qa-border)",
                  color: "var(--qa-text-secondary)",
                }}
              >
                Export
              </Button>
              <Button
                size="small"
                onClick={() => toggleExpand(story.storyKey)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--qa-border)",
                  color: "var(--qa-text-secondary)",
                }}
              >
                {expanded.has(story.storyKey) ? "Collapse ▲" : "Expand ▼"}
              </Button>
            </div>
          }
        >
          {expanded.has(story.storyKey) && (
            <Table
              columns={bugColumns}
              dataSource={story.bugs}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 600 }}
            />
          )}
        </Card>
      ))}
    </div>
  );
};

export default TopStories;
