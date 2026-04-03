import React from "react";
import { Moon, Sun, Zap, Shield } from "lucide-react";
import type { Theme, AuthMode, JiraUser } from "../../types";
import InsightsLogo from "../common/InsightsLogo";

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
          <InsightsLogo size={34} />
        </div>
        <h1 className="app-title">InSights AI</h1>
        {user && <span className="badge visible">{user.displayName}</span>}
      </div>

      <div className="header-right">
        {user && authMode !== "none" && (
          <span className="auth-mode-badge">
            <Shield size={12} />
            {authMode === "session" ? "Session Auth" : "Token Auth"}
          </span>
        )}

        <div className="theme-switcher">
          <button
            className={`theme-btn${theme === "dark" ? " active" : ""}`}
            title="Dark theme"
            onClick={() => onThemeChange("dark")}
          >
            <Moon size={15} />
          </button>
          <button
            className={`theme-btn${theme === "light" ? " active" : ""}`}
            title="Light theme"
            onClick={() => onThemeChange("light")}
          >
            <Sun size={15} />
          </button>
          <button
            className={`theme-btn${theme === "neon" ? " active" : ""}`}
            title="Neon theme"
            onClick={() => onThemeChange("neon")}
          >
            <Zap size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
