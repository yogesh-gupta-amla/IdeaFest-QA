import React from "react";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  ClockCircleOutlined,
  BugOutlined,
  AlertOutlined,
  FireOutlined,
  ApartmentOutlined,
  RobotOutlined,
  FilterOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useDashboardStore } from "../../store/useStore";
import { QA_THEMES } from "../../themes";
import QAFilters from "./QAFilters";
import type { AuthMode, JiraUser } from "../../types";

const { Sider, Content } = Layout;

interface QALayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  configPanel?: React.ReactNode;
  user?: JiraUser | null;
  authMode?: AuthMode;
}

const NAV_ITEMS = [
  { key: "config", icon: <SettingOutlined />, label: "Configuration" },
  { key: "health", icon: <DashboardOutlined />, label: "Project Health" },
  { key: "ageing", icon: <ClockCircleOutlined />, label: "Ageing Analysis" },
  { key: "top-stories", icon: <BugOutlined />, label: "Top Stories" },
  { key: "leakage", icon: <AlertOutlined />, label: "Bug Leakage" },
  { key: "overburnt", icon: <FireOutlined />, label: "Overburnt Items" },
  { key: "flow", icon: <ApartmentOutlined />, label: "Flow Impact" },
  { key: "ai", icon: <RobotOutlined />, label: "AI Recommendations" },
];

const QALayout: React.FC<QALayoutProps> = ({
  children,
  onBack,
  configPanel,
  user,
  authMode,
}) => {
  const {
    activeSection,
    setActiveSection,
    themeId,
    setTheme: setDashboardTheme,
  } = useDashboardStore();
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const content =
    activeSection === "config"
      ? (configPanel ?? (
          <div style={{ color: "var(--qa-text-muted)", padding: 24 }}>
            No configuration panel provided.
          </div>
        ))
      : children;
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
            <span style={{ fontSize: 22 }}>🧪</span>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--qa-text-primary)",
                  lineHeight: 1.2,
                }}
              >
                QA Analytics
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

        {/* Bottom: Filters + DSR View */}
        <div
          style={{
            padding: 12,
            borderTop: "1px solid var(--qa-border)",
          }}
        >
          <button
            onClick={() => setFiltersOpen(true)}
            style={{
              width: "100%",
              background: "var(--qa-bg-card)",
              border: "1px solid var(--qa-border)",
              color: "var(--qa-text-secondary)",
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <FilterOutlined /> Filters
          </button>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                width: "100%",
                marginTop: 8,
                background: "transparent",
                border: "1px solid var(--qa-border)",
                color: "var(--qa-text-secondary)",
                fontSize: 11,
                padding: "5px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ← DSR View
            </button>
          )}
        </div>
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

          {/* Right: theme selector + auth badge + user */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
          {content}
        </Content>
      </Layout>

      {/* Filters drawer */}
      <QAFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </Layout>
  );
};

export default QALayout;
