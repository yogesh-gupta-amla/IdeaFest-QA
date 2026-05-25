import React, { useState, useCallback, useRef, useEffect } from "react";
import { Layout, Tour } from "antd";
import type { TourProps } from "antd";
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
import {
  RefreshCw,
  LayoutDashboard,
  Clock4,
  Flame,
  BrainCircuit,
  Search,
  ChevronLeft,
  Palette,
  Timer,
  LogOut,
  KeyRound,
  Wifi,
  WifiOff,
  Menu,
} from "lucide-react";
import SearchableProjectSelect from "../common/SearchableProjectSelect";

const { Content } = Layout;

interface QALayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  onLogout?: () => Promise<void> | void;
  user?: JiraUser | null;
  authMode?: AuthMode;
  projects?: JiraProject[];
  selectedProjectKey?: string;
  onProjectChange?: (key: string, name: string) => void;
  onRefreshProjects?: () => Promise<void> | void;
  onRefresh?: () => Promise<void> | void;
  onTimeRangeChange?: (timeRange: QueryTimeRange) => Promise<void> | void;
}

/* -- Section groups matching the reference screenshot -- */
const NAV_GROUPS = [
  {
    label: "Analysis",
    items: [
      {
        key: "health",
        icon: <DashboardOutlined />,
        label: "Project Health",
      },
      {
        key: "ageing",
        icon: <ClockCircleOutlined />,
        label: "Ageing Analysis",
      },
      {
        key: "overburnt",
        icon: <FireOutlined />,
        label: "Overburnt Items",
      },
      {
        key: "early-completions",
        icon: <TrophyOutlined />,
        label: "Early Completions",
      },
      {
        key: "code-intel",
        icon: <CodeOutlined />,
        label: "Code Intelligence",
      },
    ],
  },
  {
    label: "AI Tools",
    items: [
      {
        key: "ai",
        icon: <RobotOutlined />,
        label: "AI Recommendations",
      },
      {
        key: "explorer",
        icon: <SearchOutlined />,
        label: "Jira Explorer",
      },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/* rainbow gradient shared with AI cards */
const RB =
  "conic-gradient(from 0deg, #ff006e, #8338ec, #3a86ff, #06d6a0, #ffbe0b, #f97316, #ff006e)";

const selectStyle: React.CSSProperties = {
  background: "var(--qa-bg-secondary)",
  color: "var(--qa-text-primary)",
  border: "1px solid var(--qa-border)",
  borderRadius: 8,
  padding: "5px 32px 5px 10px",
  fontSize: 12,
  cursor: "pointer",
  outline: "none",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
};

/* -- Individual nav item -- */
const NavItem: React.FC<{
  item: { key: string; icon: React.ReactNode; label: string };
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}> = ({ item, isActive, collapsed, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const show = isActive || hovered;

  return (
    <div
      className="relative cursor-pointer"
      title={collapsed ? item.label : undefined}
      style={{
        padding: "1.5px",
        borderRadius: 12,
        margin: collapsed ? "3px 6px" : "3px 10px",
        transition: "box-shadow 0.3s ease, transform 0.25s ease",
        boxShadow: hovered
          ? "0 2px 8px color-mix(in srgb, var(--qa-accent) 20%, rgba(0,0,0,0.12))"
          : "none",
        transform:
          hovered && !isActive && !collapsed ? "translateX(3px)" : "none",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* spinning rainbow border � visible on hover/active */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: 12,
          pointerEvents: "none",
          opacity: show ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
      >
        <div
          className={
            isActive
              ? "neon-border-spin-el-slow aurora-el absolute"
              : "neon-border-spin-el aurora-el absolute"
          }
          style={{ inset: "-200%", background: RB, opacity: 0.9 }}
        />
      </div>

      {/* inner body */}
      <div
        className="relative flex items-center gap-3 px-3 py-2.5"
        style={{
          borderRadius: 11,
          background: isActive
            ? "var(--qa-bg-card)"
            : hovered
              ? "var(--qa-bg-secondary)"
              : "transparent",
          transition: "background 0.25s ease",
          overflow: "hidden",
        }}
      >
        {/* top-edge stripe flash on hover */}
        {hovered && !isActive && (
          <div
            className="absolute top-0 left-0 right-0 h-px overflow-hidden"
            style={{ borderRadius: "100% 100% 0 0" }}
          >
            <div
              className="absolute inset-y-0 w-1/3 stripe-slide"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--qa-accent), transparent)",
              }}
            />
          </div>
        )}

        {/* active left accent bar */}
        {isActive && (
          <div
            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
            style={{
              background:
                "linear-gradient(180deg, var(--qa-accent), var(--qa-accent-hover))",
            }}
          />
        )}

        {/* icon */}
        <span
          style={{
            color: isActive
              ? "var(--qa-accent-hover)"
              : hovered
                ? "var(--qa-accent)"
                : "var(--qa-text-muted)",
            transition: "color 0.2s ease",
            filter: isActive ? "none" : "none",
            margin: collapsed ? "0 auto" : undefined,
          }}
        >
          {item.icon}
        </span>

        {/* label � hidden when collapsed */}
        {!collapsed && (
          <span
            className="text-[13px] font-semibold leading-none"
            style={{
              color: isActive
                ? "var(--qa-text-primary)"
                : hovered
                  ? "var(--qa-accent-hover)"
                  : "var(--qa-text-secondary)",
              transition: "color 0.2s ease",
            }}
          >
            {item.label}
          </span>
        )}
      </div>
    </div>
  );
};

const QALayout: React.FC<QALayoutProps> = ({
  children,
  onBack,
  onLogout,
  user,
  authMode,
  projects = [],
  selectedProjectKey = "",
  onProjectChange,
  onRefreshProjects,
  onRefresh,
  onTimeRangeChange,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingProjects, setRefreshingProjects] = useState(false);
  const [switchingRange, setSwitchingRange] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const timeRangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Show the tour on every login; auto-dismiss after 2 s.
  useEffect(() => {
    if (!onTimeRangeChange) return;
    // Open after a short paint delay so the spotlight target is in the DOM.
    const openTimer = setTimeout(() => setTourOpen(true), 800);
    // Auto-close 2 s after it opens (800 ms delay + 2000 ms visible = 2800 ms total).
    const closeTimer = setTimeout(() => setTourOpen(false), 2800);
    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTourClose = () => {
    setTourOpen(false);
  };

  const tourSteps: TourProps["steps"] = [
    {
      title: "Set a wider date range for better insights",
      description: (
        <span>
          Switch the time range to <strong>Last 6 Months</strong> to unlock
          richer trend data — ageing analysis, bug-leakage patterns and AI
          recommendations all improve significantly with more history.
        </span>
      ),
      target: () => timeRangeRef.current,
      placement: "bottomRight",
    },
  ];

  const SIDEBAR_W = isMobile ? 0 : collapsed ? 64 : 220;

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  }, [onRefresh, refreshing]);

  const handleRefreshProjects = useCallback(async () => {
    if (!onRefreshProjects || refreshingProjects) return;
    setRefreshingProjects(true);
    try {
      await onRefreshProjects();
    } finally {
      setRefreshingProjects(false);
    }
  }, [onRefreshProjects, refreshingProjects]);

  const handleTimeRangeChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (!onTimeRangeChange || switchingRange) return;
      const val = event.target.value as QueryTimeRange;
      setSwitchingRange(true);
      try {
        await onTimeRangeChange(val);
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
    ALL_ITEMS.find((n) => n.key === activeSection)?.label ?? "Dashboard";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className="fixed top-0 left-0 h-screen flex flex-col"
        style={{
          width: isMobile ? 220 : SIDEBAR_W,
          zIndex: isMobile ? 200 : 100,
          left: isMobile ? (mobileOpen ? 0 : -220) : 0,
          background: "var(--qa-bg-sidebar)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderRight: "1px solid var(--qa-border)",
          boxShadow: "1px 0 12px rgba(0,0,0,0.18)",
          overflow: "hidden",
          transition:
            "left 0.28s cubic-bezier(0.4,0,0.2,1), width 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* accent top glow orb */}
        <div
          className="absolute -top-12 -left-8 w-52 h-52 rounded-full pointer-events-none orb-float"
          style={{
            background:
              "radial-gradient(circle, var(--qa-accent) 0%, transparent 70%)",
            opacity: 0.18,
            filter: "blur(30px)",
          }}
        />
        {/* accent bottom orb */}
        <div
          className="absolute -bottom-10 -right-6 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, var(--qa-accent) 0%, transparent 70%)",
            opacity: 0.08,
            filter: "blur(24px)",
          }}
        />
        {/* dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* -- Logo -- */}
        <div
          className="relative flex items-center flex-shrink-0"
          style={{
            borderBottom: "1px solid var(--qa-border)",
            padding: collapsed ? "14px 0" : "14px 16px",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : 12,
            transition: "padding 0.28s ease, justify-content 0.28s ease",
          }}
        >
          <div
            className="relative flex-shrink-0"
            style={{ padding: 1.5, borderRadius: 12, background: RB }}
          >
            <div
              style={{
                borderRadius: 10,
                background: "var(--qa-bg-sidebar)",
                padding: 2,
              }}
            >
              <InsightsLogo size={30} />
            </div>
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div
                className="font-black text-sm leading-tight"
                style={{
                  background:
                    "linear-gradient(120deg, var(--qa-text-primary), var(--qa-accent), var(--qa-accent-hover))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  backgroundSize: "200% auto",
                  animation: "text-shimmer 5s linear infinite",
                  whiteSpace: "nowrap",
                }}
              >
                InSightsAI
              </div>
              <div
                className="text-[10px]"
                style={{ color: "var(--qa-text-muted)", whiteSpace: "nowrap" }}
              >
                AI Powered Project Analytics
              </div>
            </div>
          )}
        </div>

        {/* -- Nav Groups -- */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              {/* group label � hidden when collapsed, show thin divider instead */}
              {collapsed ? (
                <div
                  className="mx-3 my-2"
                  style={{
                    height: 1,
                    background:
                      "linear-gradient(90deg, transparent, var(--qa-accent), transparent)",
                    opacity: 0.35,
                  }}
                />
              ) : (
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                  <div
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--qa-accent), transparent)",
                      opacity: 0.4,
                    }}
                  />
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.18em] flex-shrink-0"
                    style={{ color: "var(--qa-accent)" }}
                  >
                    {group.label}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{
                      background:
                        "linear-gradient(270deg, var(--qa-accent), transparent)",
                      opacity: 0.4,
                    }}
                  />
                </div>
              )}

              {/* items */}
              {group.items.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  collapsed={collapsed}
                  isActive={activeSection === item.key}
                  onClick={() => setActiveSection(item.key)}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* -- User card at bottom -- */}
        <div
          className="relative flex-shrink-0 mx-3 mb-3 overflow-hidden"
          style={{ padding: "1.5px", borderRadius: 14 }}
          title={collapsed && user ? user.displayName : undefined}
        >
          {/* subtle spinning border on the user card */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ borderRadius: 14, pointerEvents: "none" }}
          >
            <div
              className="neon-border-spin-el-slow aurora-el absolute"
              style={{ inset: "-200%", background: RB, opacity: 0.5 }}
            />
          </div>
          <div
            className="relative rounded-[12px] py-2.5"
            style={{
              background: "var(--qa-bg-card)",
              padding: collapsed ? "8px 6px" : "10px 12px",
              transition: "padding 0.28s ease",
            }}
          >
            {user ? (
              <div
                className="flex items-center"
                style={{
                  gap: collapsed ? 0 : 10,
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--qa-accent), var(--qa-accent-hover))",
                    opacity: 0.9,
                  }}
                >
                  {user.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[12px] font-bold truncate"
                      style={{ color: "var(--qa-text-primary)" }}
                    >
                      {user.displayName}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {authMode === "token" ? (
                        <KeyRound
                          size={10}
                          style={{ color: "var(--qa-success)" }}
                        />
                      ) : authMode === "session" ? (
                        <Wifi
                          size={10}
                          style={{ color: "var(--qa-success)" }}
                        />
                      ) : (
                        <WifiOff
                          size={10}
                          style={{ color: "var(--qa-text-muted)" }}
                        />
                      )}
                      <span
                        className="text-[10px]"
                        style={{
                          color:
                            authMode === "session" || authMode === "token"
                              ? "var(--qa-success)"
                              : "var(--qa-text-muted)",
                        }}
                      >
                        {authMode === "session"
                          ? "Session Auth"
                          : authMode === "token"
                            ? "Token Auth"
                            : "Connected"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !collapsed && (
                <button
                  onClick={() => setActiveSection("config")}
                  className="w-full text-left text-[11px] font-medium"
                  style={{
                    color: "var(--text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Not connected � Configure ?
                </button>
              )
            )}
          </div>
        </div>

        {/* -- Logout -- */}
        {user && onLogout && (
          <button
            onClick={() => void onLogout()}
            title={collapsed ? "Logout" : undefined}
            className="relative flex-shrink-0 flex items-center gap-2 mx-3 mb-3 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200"
            style={{
              background:
                "color-mix(in srgb, var(--qa-bg-secondary) 60%, transparent)",
              border: "1px solid var(--qa-border)",
              color: "var(--qa-text-muted)",
              cursor: "pointer",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--qa-accent)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "color-mix(in srgb, var(--qa-accent) 35%, transparent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--qa-text-muted)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--qa-border)";
            }}
          >
            <LogOut size={13} />
            {!collapsed && " Logout"}
          </button>
        )}

        {/* -- Back link -- */}
        {onBack && (
          <button
            onClick={onBack}
            title={collapsed ? "Back to Home" : undefined}
            className="relative flex-shrink-0 flex items-center gap-2 mx-3 mb-3 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200"
            style={{
              background:
                "color-mix(in srgb, var(--qa-bg-secondary) 60%, transparent)",
              border: "1px solid var(--qa-border)",
              color: "var(--qa-text-muted)",
              cursor: "pointer",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--qa-accent)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "color-mix(in srgb, var(--qa-accent) 35%, transparent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--qa-text-muted)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "var(--qa-border)";
            }}
          >
            <ChevronLeft size={13} />
            {!collapsed && " Back to Home"}
          </button>
        )}
      </aside>

      {/* -------- Mobile backdrop -------- */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[150]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ---------------- MAIN AREA ---------------- */}
      <div
        className="flex-1 flex flex-col"
        style={{
          marginLeft: isMobile ? 0 : SIDEBAR_W,
          transition: "margin-left 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Top bar */}
        <div
          className="sticky top-0 z-[90] flex items-center justify-between px-5"
          style={{
            minHeight: 54,
            background: "var(--qa-bg-primary)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--qa-border)",
            boxShadow: "0 1px 8px rgba(0,0,0,0.12)",
            paddingTop: "1rem",
            paddingBottom: "1rem",
          }}
        >
          {/* Burger menu toggle */}
          <button
            onClick={() =>
              isMobile ? setMobileOpen((c) => !c) : setCollapsed((c) => !c)
            }
            className="flex items-center justify-center w-8 h-8 rounded-lg mr-2 flex-shrink-0 transition-all duration-200"
            style={{
              background:
                "color-mix(in srgb, var(--qa-accent) 10%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--qa-accent) 25%, transparent)",
              color: "var(--qa-text-muted)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "color-mix(in srgb, var(--qa-accent) 20%, transparent)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--qa-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "color-mix(in srgb, var(--qa-accent) 10%, transparent)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--qa-text-muted)";
            }}
          >
            <Menu size={15} />
          </button>

          {/* Section title */}
          <div className="flex items-center gap-3">
            <span
              className="font-black text-[16px]"
              style={{
                background:
                  "linear-gradient(120deg, var(--qa-text-primary) 30%, var(--qa-accent))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {sectionLabel}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                background: "var(--qa-accent)",
                opacity: 0.85,
                border: "1px solid var(--qa-border)",
                color: "var(--qa-bg-primary)",
              }}
            >
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Time range */}
            {onTimeRangeChange && (
              <div
                ref={timeRangeRef}
                className="relative flex items-center gap-1.5"
              >
                <Timer
                  size={12}
                  className="pointer-events-none"
                  style={{ color: "var(--qa-text-muted)" }}
                />
                <select
                  value={queryTimeRange}
                  onChange={handleTimeRangeChange}
                  disabled={switchingRange}
                  style={{
                    ...selectStyle,
                    minWidth: 110,
                    opacity: switchingRange ? 0.7 : 1,
                  }}
                >
                  {QUERY_TIME_RANGE_OPTIONS.map((o) => (
                    <option
                      key={o.value}
                      value={o.value}
                      style={{
                        background: "var(--qa-bg-primary)",
                        color: "var(--qa-text-primary)",
                      }}
                    >
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Project selector */}
            {projects.length > 0 && onProjectChange && (
              <div className="flex items-center gap-1">
                <SearchableProjectSelect
                  projects={projects}
                  value={selectedProjectKey}
                  onChange={(key, name) => onProjectChange(key, name)}
                  variant="header"
                />
                {onRefreshProjects && (
                  <button
                    onClick={() => void handleRefreshProjects()}
                    disabled={refreshingProjects}
                    title="Refresh project list"
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background:
                        "color-mix(in srgb, var(--qa-accent) 10%, transparent)",
                      border:
                        "1px solid color-mix(in srgb, var(--qa-accent) 25%, transparent)",
                      color: "var(--qa-text-muted)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!refreshingProjects) {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background =
                          "color-mix(in srgb, var(--qa-accent) 20%, transparent)";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--qa-accent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "color-mix(in srgb, var(--qa-accent) 10%, transparent)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "var(--qa-text-muted)";
                    }}
                  >
                    <RefreshCw
                      size={11}
                      className={refreshingProjects ? "animate-spin" : ""}
                    />
                  </button>
                )}
              </div>
            )}

            {/* Theme */}
            <div className="relative flex items-center">
              <Palette
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
              />
              <select
                value={themeId}
                onChange={(e) => setDashboardTheme(e.target.value)}
                style={{ ...selectStyle, paddingLeft: 24, minWidth: 130 }}
              >
                {QA_THEMES.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    style={{
                      background: "var(--qa-bg-primary)",
                      color: "var(--qa-text-primary)",
                    }}
                  >
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh */}
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="relative flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl overflow-hidden transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: refreshing
                    ? "color-mix(in srgb, var(--qa-accent) 18%, transparent)"
                    : "color-mix(in srgb, var(--qa-accent) 12%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--qa-accent) 35%, transparent)",
                  color: "var(--qa-accent)",
                  boxShadow: refreshing
                    ? "0 0 18px color-mix(in srgb, var(--qa-accent) 40%, transparent)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!refreshing) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "color-mix(in srgb, var(--qa-accent) 22%, transparent)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 0 16px color-mix(in srgb, var(--qa-accent) 40%, transparent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!refreshing) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "color-mix(in srgb, var(--qa-accent) 12%, transparent)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "none";
                  }
                }}
              >
                <RefreshCw
                  size={12}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Syncing�" : "Sync"}
              </button>
            )}

            {/* Auth badge */}
            {user && authMode && authMode !== "none" && (
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{
                  background: "var(--qa-accent)",
                  opacity: 0.85,
                  color: "var(--qa-bg-primary)",
                  border: "1px solid var(--qa-accent-hover)",
                }}
              >
                {authMode === "session" ? "Session" : "Token"}
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <div
          id="qa-dashboard-content"
          className="relative flex-1 p-6 overflow-hidden"
          style={{ minHeight: "calc(100vh - 54px)" }}
        >
          <div className="relative" style={{ zIndex: 1 }}>
            {children}
          </div>
        </div>
      </div>

      {/* Daily onboarding tour — points user to the time-range selector */}
      <Tour
        open={tourOpen}
        onClose={handleTourClose}
        onFinish={handleTourClose}
        steps={tourSteps}
        mask={{ style: { boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" } }}
        indicatorsRender={() => null}
      />
    </div>
  );
};

export default QALayout;
