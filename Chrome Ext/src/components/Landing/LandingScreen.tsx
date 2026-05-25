import React, { useState } from "react";
import InsightsLogo from "../common/InsightsLogo";
import SearchableProjectSelect from "../common/SearchableProjectSelect";
import type { AuthMode, JiraUser, JiraProject } from "../../types";
import { IS_ADMIN_MODE } from "../../App";
import {
  Lock,
  ChevronRight,
  CheckCircle2,
  FolderOpen,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

/** Hardcoded Jira host for the IdeaFest QA dashboard. */
const JIRA_URL = "https://amla.atlassian.net";

interface LandingScreenProps {
  authMode: AuthMode;
  user: JiraUser | null;
  projects: JiraProject[];
  onConnect: (
    email: string,
    jiraToken: string,
    jiraUrl?: string,
  ) => Promise<boolean | void>;
  onLoadProject: (key: string, name: string) => void;
}

/** Decorative glowing orb behind the card */
function GlowOrb({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className ?? ""}`}
      style={style}
    />
  );
}

export default function LandingScreen({
  authMode,
  user,
  projects,
  onConnect,
  onLoadProject,
}: LandingScreenProps) {
  const [email, setEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");

  const connected = authMode === "token" && !!user;

  const handleTokenConnect = async () => {
    setConnecting(true);
    await onConnect(email, jiraToken);
    setConnecting(false);
  };

  const handleLoadDashboard = () => {
    if (!selectedKey) return;
    const project = projects.find((p) => p.key === selectedKey);
    onLoadProject(selectedKey, project ? project.name : selectedKey);
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-5 py-10"
      style={{
        background:
          "var(--bg-gradient, linear-gradient(135deg, #050510 0%, #0d0621 35%, #0a0a1a 65%, #050510 100%))",
      }}
    >
      {/* ── Background decorative orbs ── */}
      <GlowOrb
        className="w-96 h-96 -top-24 -left-24"
        style={
          { background: "var(--qa-accent, #7c3aed)" } as React.CSSProperties
        }
      />
      <GlowOrb
        className="w-72 h-72 bottom-10 -right-16"
        style={
          {
            background: "var(--qa-accent-hover, #6366f1)",
          } as React.CSSProperties
        }
      />
      <GlowOrb
        className="w-56 h-56 top-1/2 left-1/4"
        style={
          { background: "var(--qa-accent, #7c3aed)" } as React.CSSProperties
        }
      />

      {/* ── Animated grid overlay ── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.8) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Card wrapper ── */}
      <div className="relative w-full max-w-[460px] flex flex-col gap-4 animate-[fadeInUp_0.6s_cubic-bezier(0.4,0,0.2,1)_both]">
        {/* ── Logo / Hero ── */}
        <div className="text-center mb-2">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl opacity-60"
                style={{
                  background: "var(--accent-glow, rgba(139,92,246,0.4))",
                  animation: "glow-pulse 2s ease-in-out infinite",
                }}
              />
              <div className="relative">
                <InsightsLogo size={72} />
              </div>
            </div>
          </div>

          <h1
            className="text-3xl font-extrabold tracking-tight mb-1"
            style={{
              background:
                "linear-gradient(135deg, var(--qa-text-primary, #c4b5fd) 0%, var(--qa-accent, #818cf8) 50%, var(--qa-accent-hover, #38bdf8) 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "text-shimmer 5s linear infinite",
            }}
          >
            InSightsAI
          </h1>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-muted, #64748b)" }}
          >
            AI Powered Project Analytics
          </p>

          {/* Feature pills */}
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {["Live Metrics", "AI Analysis", "Sprint Health"].map((label) => (
              <span
                key={label}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: "var(--accent-glow, rgba(139,92,246,0.12))",
                  border:
                    "1px solid color-mix(in srgb, var(--qa-accent, #8b5cf6) 25%, transparent)",
                  color: "var(--qa-text-secondary, #a78bfa)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Step 1: Jira Credentials (hidden in admin mode) ── */}
        {IS_ADMIN_MODE ? (
          /* Admin mode — show a compact status badge instead of the login form */
          <div
            className="rounded-2xl px-5 py-4 flex items-center gap-3"
            style={{
              background: "var(--health-green-bg, rgba(34,197,94,0.07))",
              border: "1px solid var(--health-green-border, rgba(34,197,94,0.3))",
              backdropFilter: "blur(20px)",
            }}
          >
            <ShieldCheck size={18} style={{ color: "var(--health-green, #22c55e)", flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "var(--health-green, #22c55e)" }}>
                Admin Account Connected
              </p>
              {!connected && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted, #64748b)" }}>
                  Connecting…
                </p>
              )}
            </div>
            {connected && <CheckCircle2 size={16} style={{ color: "var(--health-green, #22c55e)", flexShrink: 0 }} />}
          </div>
        ) : (
        <div
          className="rounded-2xl p-6 transition-all duration-300"
          style={{
            background: "var(--surface, rgba(255,255,255,0.04))",
            border: connected
              ? "1px solid var(--health-green-border, rgba(34,197,94,0.35))"
              : "1px solid var(--border, rgba(139,92,246,0.25))",
            backdropFilter: "blur(20px)",
            boxShadow: connected
              ? "0 0 0 1px var(--health-green-bg, rgba(34,197,94,0.1)), 0 8px 32px rgba(0,0,0,0.4)"
              : "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Card header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 transition-all duration-300"
              style={{
                background: connected
                  ? "var(--health-green-bg, rgba(34,197,94,0.15))"
                  : "var(--accent-glow, rgba(139,92,246,0.15))",
                border: connected
                  ? "1px solid var(--health-green-border, rgba(34,197,94,0.5))"
                  : "1px solid var(--qa-accent, rgba(139,92,246,0.5))",
                color: connected
                  ? "var(--health-green, #22c55e)"
                  : "var(--qa-text-secondary, #a78bfa)",
              }}
            >
              {connected ? <CheckCircle2 size={14} /> : <Lock size={13} />}
            </div>
            <div className="flex-1">
              <span
                className="font-semibold text-sm"
                style={{ color: "var(--text-heading, #e2e8f0)" }}
              >
                {connected ? "Connected" : "Sign In"}
              </span>
            </div>
            {connected && user && (
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--health-green, #22c55e)" }}
              >
                {user.emailAddress}
              </span>
            )}
          </div>

          {!connected && (
            <div className="flex flex-col gap-3">
              {/* Email */}
              <div>
                <label
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: "var(--text-muted, #94a3b8)" }}
                >
                  Work Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    padding: "10px 12px",
                    background: "var(--input-bg, rgba(255,255,255,0.05))",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    color: "var(--text-heading, #e2e8f0)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      "color-mix(in srgb, var(--qa-accent, #8b5cf6) 60%, transparent)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px var(--accent-glow, rgba(139,92,246,0.15))";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--border, rgba(255,255,255,0.1))";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email.trim())
                      void handleTokenConnect();
                  }}
                />
              </div>

              {/* Jira API Token */}
              <div>
                <label
                  className="text-xs font-medium mb-1.5 block"
                  style={{ color: "var(--text-muted, #94a3b8)" }}
                >
                  Jira API Token
                </label>
                <input
                  type="password"
                  placeholder="Paste your Atlassian API token"
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-xl text-sm outline-none transition-all duration-200"
                  style={{
                    padding: "10px 12px",
                    background: "var(--input-bg, rgba(255,255,255,0.05))",
                    border: "1px solid var(--border, rgba(255,255,255,0.1))",
                    color: "var(--text-heading, #e2e8f0)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor =
                      "color-mix(in srgb, var(--qa-accent, #8b5cf6) 60%, transparent)";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px var(--accent-glow, rgba(139,92,246,0.15))";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      "var(--border, rgba(255,255,255,0.1))";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && email.trim() && jiraToken.trim())
                      void handleTokenConnect();
                  }}
                />
                <p
                  className="text-[10px] mt-1"
                  style={{ color: "var(--text-muted, #64748b)" }}
                >
                  Generate at{" "}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                    style={{ color: "var(--qa-text-secondary, #a78bfa)" }}
                  >
                    Atlassian → API Tokens
                  </a>
                </p>
              </div>

              {/* Sign In button */}
              <button
                onClick={handleTokenConnect}
                disabled={connecting || !email.trim() || !jiraToken.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                style={{
                  background: `linear-gradient(135deg, var(--qa-accent, #8b5cf6), var(--qa-accent-hover, #6366f1))`,
                  boxShadow:
                    "0 4px 14px var(--accent-glow, rgba(139,92,246,0.4))",
                }}
                onMouseEnter={(e) => {
                  if (!connecting)
                    e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {connecting ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Lock size={13} />
                )}
                {connecting ? "Signing in…" : "Sign In"}
              </button>
            </div>
          )}
        </div>
        )} {/* end IS_ADMIN_MODE ternary */}

        {/* ── Step 2: Select Project ── */}
        {connected && (
          <div
            className="rounded-2xl p-6 transition-all duration-300"
            style={{
              background: "var(--surface, rgba(255,255,255,0.04))",
              border: "1px solid var(--border, rgba(139,92,246,0.25))",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
              animation: "fadeInUp 0.4s ease both",
            }}
          >
            {/* Step header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{
                  background: "var(--accent-glow, rgba(139,92,246,0.15))",
                  border:
                    "1px solid color-mix(in srgb, var(--qa-accent, #8b5cf6) 50%, transparent)",
                  color: "var(--qa-text-secondary, #a78bfa)",
                }}
              >
                <FolderOpen size={14} />
              </div>
              <span
                className="font-semibold text-sm"
                style={{ color: "var(--text-heading, #e2e8f0)" }}
              >
                Select Project
              </span>
            </div>

            {/* Project dropdown */}
            <div className="mb-3">
              <SearchableProjectSelect
                projects={projects}
                value={selectedKey}
                onChange={(key) => setSelectedKey(key)}
                placeholder="— Choose a project —"
                variant="landing"
              />
            </div>

            {/* Load Dashboard button */}
            <button
              onClick={handleLoadDashboard}
              disabled={!selectedKey}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selectedKey
                  ? `linear-gradient(135deg, var(--qa-accent, #8b5cf6), var(--qa-accent-hover, #6366f1))`
                  : "var(--surface, rgba(255,255,255,0.05))",
                border: selectedKey
                  ? "none"
                  : "1px solid var(--border, rgba(255,255,255,0.1))",
                color: selectedKey ? "#fff" : "var(--text-muted, #64748b)",
                boxShadow: selectedKey
                  ? "0 4px 20px var(--accent-glow, rgba(139,92,246,0.4))"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (selectedKey) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 28px var(--accent-glow, rgba(139,92,246,0.55))";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = selectedKey
                  ? "0 4px 20px var(--accent-glow, rgba(139,92,246,0.4))"
                  : "none";
              }}
            >
              Load Dashboard
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <p
          className="text-center text-xs mt-1"
          style={{ color: "var(--text-muted, #334155)" }}
        >
          InSightsAI - AI Powered Project Analytics
        </p>
      </div>
    </div>
  );
}
