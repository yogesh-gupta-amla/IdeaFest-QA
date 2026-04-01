import React from "react";
import { Layout, Menu } from "antd";
import InsightsLogo from "../common/InsightsLogo";
import {
  DashboardOutlined,
  ClockCircleOutlined,
  BugOutlined,
  AlertOutlined,
  FireOutlined,
  ApartmentOutlined,
  RobotOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useDashboardStore } from "../../store/useStore";
import { QA_THEMES } from "../../themes";
import type { AuthMode, JiraUser, JiraProject } from "../../types";

const { Sider, Content } = Layout;

interface QALayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  user?: JiraUser | null;
  authMode?: AuthMode;
  projects?: JiraProject[];
  selectedProjectKey?: string;
  onProjectChange?: (key: string, name: string) => void;
}

const NAV_ITEMS = [
  { key: "health", icon: <DashboardOutlined />, label: "Project Health" },
  { key: "ageing", icon: <ClockCircleOutlined />, label: "Ageing Analysis" },
  { key: "top-stories", icon: <BugOutlined />, label: "Top Stories" },
  { key: "leakage", icon: <AlertOutlined />, label: "Bug Leakage" },
  { key: "overburnt", icon: <FireOutlined />, label: "Overburnt Items" },
  { key: "flow", icon: <ApartmentOutlined />, label: "Flow Impact" },
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
}) => {
  const {
    activeSection,
    setActiveSection,
    themeId,
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

          {/* Right: project selector + theme selector + auth badge + user */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
