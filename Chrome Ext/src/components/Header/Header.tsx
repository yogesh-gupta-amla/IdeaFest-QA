import React from "react";
import type { Theme, AuthMode, JiraUser } from "../../types";

interface HeaderProps {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  user: JiraUser | null;
  authMode: AuthMode;
}

export default function Header({
  theme,
  onThemeChange,
  user,
  authMode,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="3"
              width="7"
              height="7"
              rx="2"
              fill="var(--accent)"
            />
            <rect
              x="14"
              y="3"
              width="7"
              height="7"
              rx="2"
              fill="var(--accent)"
              opacity="0.6"
            />
            <rect
              x="3"
              y="14"
              width="7"
              height="7"
              rx="2"
              fill="var(--accent)"
              opacity="0.6"
            />
            <rect
              x="14"
              y="14"
              width="7"
              height="7"
              rx="2"
              fill="var(--accent)"
              opacity="0.3"
            />
          </svg>
        </div>
        <h1 className="app-title">DSR Assistant</h1>
        {user && <span className="badge visible">{user.displayName}</span>}
      </div>
      <div className="header-right">
        {user && authMode !== "none" && (
          <span className="auth-mode-badge">
            <span>
              {authMode === "session" ? "🔐 Session Auth" : "🔑 Token Auth"}
            </span>
          </span>
        )}
        <div className="theme-switcher">
          <button
            className={`theme-btn${theme === "dark" ? " active" : ""}`}
            title="Dark theme"
            onClick={() => onThemeChange("dark")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
            </svg>
          </button>
          <button
            className={`theme-btn${theme === "light" ? " active" : ""}`}
            title="Light theme"
            onClick={() => onThemeChange("light")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>
          <button
            className={`theme-btn${theme === "neon" ? " active" : ""}`}
            title="Neon theme"
            onClick={() => onThemeChange("neon")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
