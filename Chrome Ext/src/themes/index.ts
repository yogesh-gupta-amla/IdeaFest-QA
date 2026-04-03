import { theme as antdTheme } from "antd";
import type { ThemeConfig } from "../types/qa";

export const QA_THEMES: ThemeConfig[] = [
  {
    id: "dark-pro",
    name: "Dark Professional",
    icon: "🌑",
    isDark: true,
    primaryColor: "#4f8ef7",
    cssVars: {
      "--qa-bg-primary": "#0f1117",
      "--qa-bg-secondary": "#1a1d27",
      "--qa-bg-sidebar": "#13151e",
      "--qa-bg-card": "#1e2235",
      "--qa-text-primary": "#e8eaf0",
      "--qa-text-secondary": "#9ba3bf",
      "--qa-text-muted": "#5a6080",
      "--qa-border": "#2a2f45",
      "--qa-accent": "#4f8ef7",
      "--qa-accent-hover": "#6ba3fa",
      "--qa-success": "#52c41a",
      "--qa-warning": "#faad14",
      "--qa-error": "#ff4d4f",
      "--qa-shadow": "0 4px 24px rgba(0,0,0,0.4)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "light-enterprise",
    name: "Light Enterprise",
    icon: "☀️",
    isDark: false,
    primaryColor: "#1677ff",
    cssVars: {
      "--qa-bg-primary": "#f5f7fa",
      "--qa-bg-secondary": "#ffffff",
      "--qa-bg-sidebar": "#ffffff",
      "--qa-bg-card": "#ffffff",
      "--qa-text-primary": "#1a1d27",
      "--qa-text-secondary": "#5a6272",
      "--qa-text-muted": "#9ba3bf",
      "--qa-border": "#e8eaed",
      "--qa-accent": "#1677ff",
      "--qa-accent-hover": "#4096ff",
      "--qa-success": "#52c41a",
      "--qa-warning": "#faad14",
      "--qa-error": "#ff4d4f",
      "--qa-shadow": "0 4px 16px rgba(0,0,0,0.08)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    icon: "🌊",
    isDark: true,
    primaryColor: "#00b4d8",
    cssVars: {
      "--qa-bg-primary": "#03045e",
      "--qa-bg-secondary": "#023e8a",
      "--qa-bg-sidebar": "#020a4a",
      "--qa-bg-card": "#0a1875",
      "--qa-text-primary": "#caf0f8",
      "--qa-text-secondary": "#90e0ef",
      "--qa-text-muted": "#48cae4",
      "--qa-border": "#0077b6",
      "--qa-accent": "#00b4d8",
      "--qa-accent-hover": "#48cae4",
      "--qa-success": "#52c41a",
      "--qa-warning": "#faad14",
      "--qa-error": "#ff4d4f",
      "--qa-shadow": "0 4px 24px rgba(0,50,100,0.5)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    icon: "🌿",
    isDark: true,
    primaryColor: "#52c41a",
    cssVars: {
      "--qa-bg-primary": "#0d1f0e",
      "--qa-bg-secondary": "#132915",
      "--qa-bg-sidebar": "#0a1a0b",
      "--qa-bg-card": "#1a3320",
      "--qa-text-primary": "#d4edda",
      "--qa-text-secondary": "#95d5a3",
      "--qa-text-muted": "#5a9e6a",
      "--qa-border": "#2d5a33",
      "--qa-accent": "#52c41a",
      "--qa-accent-hover": "#73d13d",
      "--qa-success": "#95de64",
      "--qa-warning": "#faad14",
      "--qa-error": "#ff4d4f",
      "--qa-shadow": "0 4px 24px rgba(0,40,0,0.5)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    icon: "⚡",
    isDark: true,
    primaryColor: "#bf5af2",
    cssVars: {
      "--qa-bg-primary": "#0d0015",
      "--qa-bg-secondary": "#15002a",
      "--qa-bg-sidebar": "#0a0010",
      "--qa-bg-card": "#1c0035",
      "--qa-text-primary": "#f0e6ff",
      "--qa-text-secondary": "#c084fc",
      "--qa-text-muted": "#7c3aed",
      "--qa-border": "#4c1d95",
      "--qa-accent": "#bf5af2",
      "--qa-accent-hover": "#d084fc",
      "--qa-success": "#34d399",
      "--qa-warning": "#fbbf24",
      "--qa-error": "#f87171",
      "--qa-shadow": "0 4px 32px rgba(120,0,180,0.4)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    icon: "🌅",
    isDark: true,
    primaryColor: "#ff7849",
    cssVars: {
      "--qa-bg-primary": "#1a0a00",
      "--qa-bg-secondary": "#2d1200",
      "--qa-bg-sidebar": "#140800",
      "--qa-bg-card": "#3d1a00",
      "--qa-text-primary": "#fff0e8",
      "--qa-text-secondary": "#ffb38a",
      "--qa-text-muted": "#cc6633",
      "--qa-border": "#6b2d00",
      "--qa-accent": "#ff7849",
      "--qa-accent-hover": "#ff9a70",
      "--qa-success": "#52c41a",
      "--qa-warning": "#faad14",
      "--qa-error": "#ff2d20",
      "--qa-shadow": "0 4px 24px rgba(100,30,0,0.5)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "arctic",
    name: "Arctic White",
    icon: "❄️",
    isDark: false,
    primaryColor: "#0ea5e9",
    cssVars: {
      "--qa-bg-primary": "#f0f9ff",
      "--qa-bg-secondary": "#ffffff",
      "--qa-bg-sidebar": "#e0f2fe",
      "--qa-bg-card": "#ffffff",
      "--qa-text-primary": "#0c4a6e",
      "--qa-text-secondary": "#0369a1",
      "--qa-text-muted": "#7dd3fc",
      "--qa-border": "#bae6fd",
      "--qa-accent": "#0ea5e9",
      "--qa-accent-hover": "#38bdf8",
      "--qa-success": "#22c55e",
      "--qa-warning": "#f59e0b",
      "--qa-error": "#ef4444",
      "--qa-shadow": "0 4px 20px rgba(14,165,233,0.12)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "midnight",
    name: "Midnight Navy",
    icon: "🌙",
    isDark: true,
    primaryColor: "#818cf8",
    cssVars: {
      "--qa-bg-primary": "#0f172a",
      "--qa-bg-secondary": "#1e293b",
      "--qa-bg-sidebar": "#0a1020",
      "--qa-bg-card": "#1e293b",
      "--qa-text-primary": "#f1f5f9",
      "--qa-text-secondary": "#94a3b8",
      "--qa-text-muted": "#475569",
      "--qa-border": "#334155",
      "--qa-accent": "#818cf8",
      "--qa-accent-hover": "#a5b4fc",
      "--qa-success": "#4ade80",
      "--qa-warning": "#fbbf24",
      "--qa-error": "#f87171",
      "--qa-shadow": "0 4px 24px rgba(0,0,0,0.5)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    icon: "🌸",
    isDark: false,
    primaryColor: "#e91e8c",
    cssVars: {
      "--qa-bg-primary": "#fff5f8",
      "--qa-bg-secondary": "#ffffff",
      "--qa-bg-sidebar": "#fce4ec",
      "--qa-bg-card": "#ffffff",
      "--qa-text-primary": "#3d0020",
      "--qa-text-secondary": "#880e4f",
      "--qa-text-muted": "#f48fb1",
      "--qa-border": "#f8bbd0",
      "--qa-accent": "#e91e8c",
      "--qa-accent-hover": "#f06292",
      "--qa-success": "#66bb6a",
      "--qa-warning": "#ffa726",
      "--qa-error": "#ef5350",
      "--qa-shadow": "0 4px 20px rgba(233,30,140,0.1)",
      "--qa-sidebar-width": "240px",
    },
  },
  {
    id: "matrix",
    name: "Matrix",
    icon: "💻",
    isDark: true,
    primaryColor: "#00ff41",
    cssVars: {
      "--qa-bg-primary": "#000000",
      "--qa-bg-secondary": "#001400",
      "--qa-bg-sidebar": "#000800",
      "--qa-bg-card": "#001a00",
      "--qa-text-primary": "#00ff41",
      "--qa-text-secondary": "#00cc33",
      "--qa-text-muted": "#007a1f",
      "--qa-border": "#003300",
      "--qa-accent": "#00ff41",
      "--qa-accent-hover": "#39ff60",
      "--qa-success": "#00ff41",
      "--qa-warning": "#ffee00",
      "--qa-error": "#ff0033",
      "--qa-shadow": "0 0 20px rgba(0,255,65,0.2)",
      "--qa-sidebar-width": "240px",
    },
  },
];

/** Convert a 6-digit hex colour to rgba(r, g, b, alpha) */
function hexToRgba(hex: string, alpha: number): string {
  const h = (hex ?? "#888888").replace("#", "").padEnd(6, "0");
  const r = parseInt(h.slice(0, 2), 16) || 128;
  const g = parseInt(h.slice(2, 4), 16) || 128;
  const b = parseInt(h.slice(4, 6), 16) || 128;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const getAntdTheme = (themeConfig: ThemeConfig) => {
  const isDark = themeConfig.isDark;
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: themeConfig.primaryColor,
      colorBgBase: themeConfig.cssVars["--qa-bg-secondary"],
      colorTextBase: themeConfig.cssVars["--qa-text-primary"],
      borderRadius: 8,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    components: {
      Table: {
        colorBgContainer: themeConfig.cssVars["--qa-bg-card"],
        headerBg: themeConfig.cssVars["--qa-bg-sidebar"],
      },
      Card: {
        colorBgContainer: themeConfig.cssVars["--qa-bg-card"],
      },
      Menu: {
        colorItemBg: themeConfig.cssVars["--qa-bg-sidebar"],
        colorItemText: themeConfig.cssVars["--qa-text-secondary"],
        colorItemTextSelected: themeConfig.cssVars["--qa-text-primary"],
        colorItemBgSelected: themeConfig.cssVars["--qa-bg-card"],
      },
    },
  };
};

export const applyTheme = (themeConfig: ThemeConfig) => {
  const root = document.documentElement;
  // Sync data-theme attr so [data-theme="light"] / [data-theme="dark"] CSS rules activate
  root.setAttribute("data-theme", themeConfig.isDark ? "dark" : "light");
  Object.entries(themeConfig.cssVars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  // Bridge QA theme vars → standard CSS vars used by AI cards & components
  root.style.setProperty(
    "--text-heading",
    themeConfig.cssVars["--qa-text-primary"],
  );
  root.style.setProperty("--text", themeConfig.cssVars["--qa-text-secondary"]);
  root.style.setProperty(
    "--text-muted",
    themeConfig.cssVars["--qa-text-muted"],
  );
  root.style.setProperty("--bg", themeConfig.cssVars["--qa-bg-primary"]);
  root.style.setProperty("--accent", themeConfig.cssVars["--qa-accent"]);
  root.style.setProperty(
    "--accent-secondary",
    themeConfig.cssVars["--qa-accent-hover"],
  );
  root.style.setProperty("--border", themeConfig.cssVars["--qa-border"]);
  root.style.setProperty("--card-shadow", themeConfig.cssVars["--qa-shadow"]);
  root.style.setProperty(
    "--surface",
    themeConfig.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  );
  root.style.setProperty(
    "--surface-hover",
    themeConfig.isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",
  );
  // Bridge bg-gradient so body background honours the QA theme
  root.style.setProperty(
    "--bg-gradient",
    themeConfig.isDark
      ? `linear-gradient(135deg, ${themeConfig.cssVars["--qa-bg-primary"]} 0%, ${themeConfig.cssVars["--qa-bg-secondary"]} 50%, ${themeConfig.cssVars["--qa-bg-primary"]} 100%)`
      : `linear-gradient(135deg, ${themeConfig.cssVars["--qa-bg-primary"]} 0%, ${themeConfig.cssVars["--qa-bg-secondary"]} 50%, ${themeConfig.cssVars["--qa-bg-primary"]} 100%)`,
  );
  // Bridge input-bg for form inputs
  root.style.setProperty(
    "--input-bg",
    themeConfig.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  );

  /* ── Status / semantic colours ─────────────────────────────── */
  const qs = themeConfig.cssVars["--qa-success"];
  const qw = themeConfig.cssVars["--qa-warning"];
  const qe = themeConfig.cssVars["--qa-error"];
  root.style.setProperty("--success", qs);
  root.style.setProperty("--warning", qw);
  root.style.setProperty("--danger", qe);
  root.style.setProperty("--info", themeConfig.cssVars["--qa-accent"]);

  /* ── Accent glow & scrollbar ────────────────────────────────── */
  root.style.setProperty(
    "--accent-glow",
    hexToRgba(themeConfig.primaryColor, 0.25),
  );
  root.style.setProperty(
    "--scrollbar-thumb",
    hexToRgba(themeConfig.primaryColor, 0.16),
  );

  /* ── Health colours ─────────────────────────────────────────── */
  root.style.setProperty("--health-green", qs);
  root.style.setProperty("--health-yellow", qw);
  root.style.setProperty("--health-red", qe);
  root.style.setProperty("--health-green-bg", hexToRgba(qs, 0.08));
  root.style.setProperty("--health-yellow-bg", hexToRgba(qw, 0.08));
  root.style.setProperty("--health-red-bg", hexToRgba(qe, 0.08));
  root.style.setProperty("--health-green-border", hexToRgba(qs, 0.28));
  root.style.setProperty("--health-yellow-border", hexToRgba(qw, 0.28));
  root.style.setProperty("--health-red-border", hexToRgba(qe, 0.28));

  /* ── Chart colours ──────────────────────────────────────────── */
  root.style.setProperty("--chart-done", qs);
  root.style.setProperty("--chart-progress", qw);
  root.style.setProperty("--chart-todo", themeConfig.cssVars["--qa-accent"]);
  root.style.setProperty(
    "--chart-line",
    themeConfig.cssVars["--qa-accent-hover"],
  );

  /* ── Table hover / header ───────────────────────────────────── */
  const tableHover = hexToRgba(
    themeConfig.primaryColor,
    themeConfig.isDark ? 0.04 : 0.03,
  );
  root.style.setProperty("--table-row-hover", tableHover);
  root.style.setProperty("--table-header-bg", tableHover);

  /* ── Priority colours ────────────────────────────────────────── */
  root.style.setProperty("--priority-highest", qe);
  root.style.setProperty("--priority-high", qe);
  root.style.setProperty("--priority-medium", qw);
  root.style.setProperty("--priority-low", themeConfig.cssVars["--qa-accent"]);
  root.style.setProperty(
    "--priority-lowest",
    themeConfig.isDark ? "#6b7280" : "#9ba3bf",
  );
};

export const getThemeById = (id: string): ThemeConfig =>
  QA_THEMES.find((t) => t.id === id) ?? QA_THEMES[0];
