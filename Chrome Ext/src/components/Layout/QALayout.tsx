import React, { useState, useCallback } from "react";
import { Layout } from "antd";
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
  Wifi,
  WifiOff,
} from "lucide-react";

const { Content } = Layout;

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

/* ── Section groups matching the reference screenshot ── */
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

/* ── Floating bubble data (pre-seeded, no Math.random) ── */
const BUBBLES = [
  { left: 5, size: 13, dur: 18, delay: 0, opacity: 0.13 },
  { left: 12, size: 28, dur: 24, delay: -6, opacity: 0.07 },
  { left: 20, size: 9, dur: 13, delay: -13, opacity: 0.15 },
  { left: 28, size: 42, dur: 30, delay: -4, opacity: 0.05 },
  { left: 36, size: 17, dur: 20, delay: -10, opacity: 0.1 },
  { left: 44, size: 11, dur: 15, delay: -18, opacity: 0.12 },
  { left: 52, size: 33, dur: 26, delay: -7, opacity: 0.06 },
  { left: 60, size: 15, dur: 17, delay: -14, opacity: 0.11 },
  { left: 68, size: 23, dur: 22, delay: -2, opacity: 0.09 },
  { left: 76, size: 8, dur: 12, delay: -11, opacity: 0.14 },
  { left: 84, size: 37, dur: 32, delay: -17, opacity: 0.04 },
  { left: 92, size: 19, dur: 19, delay: -8, opacity: 0.08 },
  { left: 10, size: 7, dur: 11, delay: -20, opacity: 0.16 },
  { left: 33, size: 48, dur: 38, delay: -3, opacity: 0.04 },
  { left: 48, size: 14, dur: 16, delay: -15, opacity: 0.11 },
  { left: 64, size: 10, dur: 14, delay: -9, opacity: 0.13 },
  { left: 80, size: 29, dur: 25, delay: -12, opacity: 0.06 },
  { left: 88, size: 12, dur: 15, delay: -5, opacity: 0.12 },
  { left: 22, size: 21, dur: 21, delay: -16, opacity: 0.08 },
  { left: 72, size: 6, dur: 10, delay: -21, opacity: 0.17 },
] as const;

/* BubbleBg — theme-aware floating bubbles */
const BubbleBg: React.FC<{ kf?: "bubble-rise" | "bubble-rise-sm" }> = ({
  kf = "bubble-rise",
}) => (
  <div
    className="absolute inset-0 overflow-hidden pointer-events-none"
    style={{ zIndex: 0 }}
  >
    {BUBBLES.map((b, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${b.left}%`,
          bottom: "-60px",
          width: b.size,
          height: b.size,
          borderRadius: "50%",
          background: `radial-gradient(circle at 33% 28%, rgba(255,255,255,0.45), var(--qa-accent) 55%, transparent 80%)`,
          border: `1px solid var(--qa-accent)`,
          opacity: b.opacity,
          animation: `${i % 3 === 0 ? "bubble-rise-sm" : kf} ${b.dur}s ease-in-out ${b.delay}s infinite`,
          willChange: "transform, opacity",
        }}
      />
    ))}
  </div>
);

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

/* ── Individual nav item ── */
const NavItem: React.FC<{
  item: { key: string; icon: React.ReactNode; label: string };
  isActive: boolean;
  onClick: () => void;
}> = ({ item, isActive, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const show = isActive || hovered;

  return (
    <div
      className="relative cursor-pointer"
      style={{
        padding: "1.5px",
        borderRadius: 12,
        margin: "3px 10px",
        transition: "box-shadow 0.3s ease, transform 0.25s ease",
        boxShadow: isActive
          ? "0 0 22px var(--qa-accent), 0 0 44px var(--qa-accent)"
          : hovered
            ? "0 0 16px var(--qa-accent)"
            : "none",
        transform: hovered && !isActive ? "translateX(3px)" : "none",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* spinning rainbow border — visible on hover/active */}
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
              boxShadow: "0 0 10px var(--qa-accent)",
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
            filter: isActive ? "drop-shadow(0 0 6px var(--qa-accent))" : "none",
          }}
        >
          {item.icon}
        </span>

        {/* label */}
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
      </div>
    </div>
  );
};

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
      {/* ════════════════ SIDEBAR ════════════════ */}
      <aside
        className="fixed top-0 left-0 h-screen z-[100] flex flex-col"
        style={{
          width: 220,
          background: "var(--qa-bg-sidebar)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderRight: "1px solid var(--qa-border)",
          boxShadow: "4px 0 32px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
      >
        {/* floating bubbles — sidebar layer */}
        <BubbleBg kf="bubble-rise-sm" />
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

        {/* ── Logo ── */}
        <div
          className="relative flex items-center gap-3 px-4 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--qa-border)" }}
        >
          <div
            className="relative"
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
          <div>
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
              }}
            >
              InSights AI
            </div>
            <div
              className="text-[10px]"
              style={{ color: "var(--qa-text-muted)" }}
            >
              Intelligence Dashboard
            </div>
          </div>
        </div>

        {/* ── Nav Groups ── */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-2">
              {/* group label */}
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

              {/* items */}
              {group.items.map((item) => (
                <NavItem
                  key={item.key}
                  item={item}
                  isActive={activeSection === item.key}
                  onClick={() => setActiveSection(item.key)}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* ── User card at bottom ── */}
        <div
          className="relative flex-shrink-0 mx-3 mb-3 overflow-hidden"
          style={{ padding: "1.5px", borderRadius: 14 }}
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
            className="relative rounded-[12px] px-3 py-2.5"
            style={{
              background: "var(--qa-bg-card)",
            }}
          >
            {user ? (
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--qa-accent), var(--qa-accent-hover))",
                    boxShadow: `0 0 14px var(--qa-accent)`,
                    opacity: 0.9,
                  }}
                >
                  {user.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[12px] font-bold truncate"
                    style={{ color: "var(--qa-text-primary)" }}
                  >
                    {user.displayName}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {authMode === "session" ? (
                      <Wifi size={9} style={{ color: "var(--qa-success)" }} />
                    ) : (
                      <WifiOff
                        size={9}
                        style={{ color: "var(--qa-text-muted)" }}
                      />
                    )}
                    <span
                      className="text-[10px]"
                      style={{
                        color:
                          authMode === "session"
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
              </div>
            ) : (
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
                Not connected · Configure →
              </button>
            )}
          </div>
        </div>

        {/* ── Back link ── */}
        {onBack && (
          <button
            onClick={onBack}
            className="relative flex-shrink-0 flex items-center gap-2 mx-3 mb-3 px-3 py-2 text-xs font-medium rounded-xl transition-all duration-200"
            style={{
              background:
                "color-mix(in srgb, var(--qa-bg-secondary) 60%, transparent)",
              border: "1px solid var(--qa-border)",
              color: "var(--qa-text-muted)",
              cursor: "pointer",
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
            <ChevronLeft size={13} /> Back to Home
          </button>
        )}
      </aside>

      {/* ════════════════ MAIN AREA ════════════════ */}
      <div className="flex-1 flex flex-col" style={{ marginLeft: 220 }}>
        {/* Top bar */}
        <div
          className="sticky top-0 z-[90] flex items-center justify-between px-5"
          style={{
            minHeight: 54,
            background: "var(--qa-bg-primary)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--qa-border)",
            boxShadow: "0 2px 24px rgba(0,0,0,0.4)",
          }}
        >
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
          <div className="flex items-center gap-2">
            {/* Time range */}
            {onTimeRangeChange && (
              <div className="relative flex items-center gap-1.5">
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
              <select
                value={selectedProjectKey}
                onChange={(e) => {
                  const p = projects.find((p) => p.key === e.target.value);
                  if (p) onProjectChange(p.key, p.name);
                }}
                style={{ ...selectStyle, minWidth: 170, maxWidth: 220 }}
              >
                {projects.map((p) => (
                  <option
                    key={p.key}
                    value={p.key}
                    style={{
                      background: "var(--qa-bg-primary)",
                      color: "var(--qa-text-primary)",
                    }}
                  >
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
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
                {refreshing ? "Syncing…" : "Sync"}
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
                {authMode === "session" ? "🔐 Session" : "🔑 Token"}
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <div
          id="qa-dashboard-content"
          className="relative flex-1 p-5 overflow-hidden"
          style={{ minHeight: "calc(100vh - 54px)" }}
        >
          {/* floating bubbles — main content layer */}
          <BubbleBg />
          <div className="relative" style={{ zIndex: 1 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QALayout;
