import React, { useState, useCallback } from "react";
import { Layout, Menu } from "antd";
import InsightsLogo from "../common/InsightsLogo";
import {
  DashboardOutlined,
  ClockCircleOutlined,
  FireOutlined,
  RobotOutlined,
  SearchOutlined,
  TrophyOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import { useDashboardStore } from "../../store/useStore";
import { QA_THEMES } from "../../themes";
import type { AuthMode, JiraUser, JiraProject } from "../../types";
import {
  QUERY_TIME_RANGE_OPTIONS,
  type QueryTimeRange,
} from "../../utils/queryTimeRange";

const { Sider, Content } = Layout;

interface QALayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  user?: JiraUser | null;
  authMode?: AuthMode;
  projects?: JiraProject[];
  selectedProjectKey?: string;
  onProjectChange?: (key: string, name: string) => void;
  onRefresh?: () => Promise<void> | void;
  onTimeRangeChange?: (timeRange: QueryTimeRange) => Promise<void> | void;
}

const NAV_ITEMS = [
  { key: "health", icon: <DashboardOutlined />, label: "Project Health" },
  { key: "ageing", icon: <ClockCircleOutlined />, label: "Ageing Analysis" },
  // { key: "top-stories", icon: <BugOutlined />, label: "Top Stories" },
  // { key: "leakage", icon: <AlertOutlined />, label: "Bug Leakage" },
  { key: "overburnt", icon: <FireOutlined />, label: "Overburnt Items" },
  // { key: "flow", icon: <ApartmentOutlined />, label: "Flow Impact" },
  {
    key: "early-completions",
    icon: <TrophyOutlined />,
    label: "Early Completions",
  },
  { key: "code-intel", icon: <CodeOutlined />, label: "Code Intelligence" },
  { key: "ai", icon: <RobotOutlined />, label: "AI Recommendations" },
  { key: "explorer", icon: <SearchOutlined />, label: "Jira Explorer" },
];

const QALayout: React.FC<QALayoutProps> = ({
  children,
  onBack,
  user,
  authMode,
  projects = [],
  selectedProjectKey = "",
  onProjectChange,
  onRefresh,
  onTimeRangeChange,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [switchingRange, setSwitchingRange] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  }, [onRefresh, refreshing]);

  const handleTimeRangeChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!onTimeRangeChange || switchingRange) return;

      setSwitchingRange(true);
      try {
        await onTimeRangeChange(event.target.value as QueryTimeRange);
      } finally {
        setSwitchingRange(false);
      }
    },
    [onTimeRangeChange, switchingRange],
  );

  const {
    activeSection,
    setActiveSection,
    themeId,
    queryTimeRange,
    setTheme: setDashboardTheme,
  } = useDashboardStore();

  const sectionLabel =
    NAV_ITEMS.find((n) => n.key === activeSection)?.label ?? "Dashboard";

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--qa-bg-primary)" }}>
      {/* Sidebar */}
      <Sider
        width={210}
        style={{
          background: "var(--qa-bg-sidebar)",
          borderRight: "1px solid var(--qa-border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          height: "100vh",
          overflow: "auto",
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "16px 16px 12px",
            borderBottom: "1px solid var(--qa-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <InsightsLogo size={34} />
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--qa-text-primary)",
                  lineHeight: 1.2,
                }}
              >
                InSights AI
              </div>
              <div style={{ fontSize: 11, color: "var(--qa-text-muted)" }}>
                AI-Powered Dashboard
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <Menu
          mode="inline"
          selectedKeys={[activeSection]}
          onSelect={({ key }) => setActiveSection(key)}
          style={{
            background: "transparent",
            border: "none",
            flex: 1,
            padding: "8px 0",
          }}
          items={NAV_ITEMS.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            style: {
              borderRadius: 8,
              margin: "2px 8px",
              width: "calc(100% - 16px)",
            },
          }))}
        />
      </Sider>

      {/* Main content */}
      <Layout style={{ marginLeft: 210, background: "var(--qa-bg-primary)" }}>
        {/* Top bar */}
        <div
          style={{
            padding: "11px 24px",
            background: "var(--qa-bg-secondary)",
            borderBottom: "1px solid var(--qa-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 90,
          }}
        >
          {/* Left: section title */}
          <div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 17,
                color: "var(--qa-text-primary)",
              }}
            >
              {sectionLabel}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--qa-text-muted)",
                marginLeft: 10,
              }}
            >
              {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
            </span>
          </div>

          {/* Right: refresh + project selector + theme selector + auth badge + user */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {onTimeRangeChange && (
              <select
                value={queryTimeRange}
                onChange={handleTimeRangeChange}
                disabled={switchingRange}
                title="Select reporting window"
                style={{
                  background: "var(--qa-bg-card)",
                  color: "var(--qa-text-primary)",
                  border: "1px solid var(--qa-border)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: switchingRange ? "not-allowed" : "pointer",
                  minWidth: 115,
                  opacity: switchingRange ? 0.7 : 1,
                }}
              >
                {QUERY_TIME_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {/* Refresh button */}
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh data"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "var(--qa-bg-card)",
                  color: "var(--qa-text-primary)",
                  border: "1px solid var(--qa-border)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: refreshing ? "not-allowed" : "pointer",
                  opacity: refreshing ? 0.7 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 14,
                    animation: refreshing
                      ? "qa-spin 0.7s linear infinite"
                      : "none",
                    transformOrigin: "center",
                  }}
                >
                  🔄
                </span>
                {refreshing ? "Syncing…" : "Sync"}
              </button>
            )}
            <style>{`@keyframes qa-spin { to { transform: rotate(360deg); } }`}</style>
            {/* Project selector */}
            {projects.length > 0 && onProjectChange && (
              <select
                value={selectedProjectKey}
                onChange={(e) => {
                  const proj = projects.find((p) => p.key === e.target.value);
                  if (proj) onProjectChange(proj.key, proj.name);
                }}
                style={{
                  background: "var(--qa-bg-card)",
                  color: "var(--qa-text-primary)",
                  border: "1px solid var(--qa-border)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                  minWidth: 170,
                  maxWidth: 220,
                }}
              >
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            )}
            {/* QA Theme selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>🎨</span>
              <select
                value={themeId}
                onChange={(e) => setDashboardTheme(e.target.value)}
                style={{
                  background: "var(--qa-bg-card)",
                  color: "var(--qa-text-primary)",
                  border: "1px solid var(--qa-border)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                  minWidth: 155,
                }}
              >
                {QA_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Auth mode badge */}
            {user && authMode && authMode !== "none" && (
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background:
                    authMode === "session"
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(79,142,247,0.15)",
                  color: authMode === "session" ? "#22c55e" : "#4f8ef7",
                  border: `1px solid ${
                    authMode === "session"
                      ? "rgba(34,197,94,0.3)"
                      : "rgba(79,142,247,0.3)"
                  }`,
                  whiteSpace: "nowrap",
                }}
              >
                {authMode === "session" ? "🔐 Session Auth" : "🔑 Token Auth"}
              </span>
            )}

            {/* User avatar + name */}
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, var(--qa-accent,#4f8ef7), #7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {user.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div style={{ lineHeight: 1.3 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--qa-text-primary)",
                    }}
                  >
                    {user.displayName}
                  </div>
                  {user.emailAddress && (
                    <div
                      style={{ fontSize: 10, color: "var(--qa-text-muted)" }}
                    >
                      {user.emailAddress}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--qa-text-muted)",
                  cursor: "pointer",
                }}
                onClick={() => setActiveSection("config")}
              >
                Not connected · Configure →
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <Content
          id="qa-dashboard-content"
          style={{ padding: 24, minHeight: "calc(100vh - 55px)" }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default QALayout;
