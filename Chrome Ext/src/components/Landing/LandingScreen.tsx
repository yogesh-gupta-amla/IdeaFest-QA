import React, { useState } from "react";
import InsightsLogo from "../common/InsightsLogo";
import type { AuthMode, JiraUser, JiraProject } from "../../types";
import {
  Link,
  Lock,
  Zap,
  ChevronRight,
  CheckCircle2,
  FolderOpen,
  RefreshCw,
} from "lucide-react";

interface LandingScreenProps {
  jiraUrl: string;
  authMode: AuthMode;
  user: JiraUser | null;
  projects: JiraProject[];
  onConnect: (
    url: string,
    email?: string,
    token?: string,
  ) => Promise<boolean | void>;
  onLoadProject: (key: string, name: string) => void;
}

/** Decorative glowing orb behind the card */
function GlowOrb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className ?? ""}`}
    />
  );
}

export default function LandingScreen({
  jiraUrl,
  authMode,
  user,
  projects,
  onConnect,
  onLoadProject,
}: LandingScreenProps) {
  const [url, setUrl] = useState(jiraUrl || "");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [showTokenSection, setShowTokenSection] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");

  const connected = authMode !== "none";

  const handleSessionConnect = async () => {
    setConnecting(true);
    const ok = await onConnect(url);
    if (ok === false) setShowTokenSection(true);
    setConnecting(false);
  };

  const handleTokenConnect = async () => {
    setConnecting(true);
    await onConnect(url, email, token);
    setConnecting(false);
  };

  const handleLoadDashboard = () => {
    if (!selectedKey) return;
    const project = projects.find((p) => p.key === selectedKey);
    onLoadProject(
      selectedKey,
      project ? `${project.name} (${project.key})` : selectedKey,
    );
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-5 py-10"
      style={{
        background:
          "linear-gradient(135deg, #050510 0%, #0d0621 35%, #0a0a1a 65%, #050510 100%)",
      }}
    >
      {/* ── Background decorative orbs ── */}
      <GlowOrb className="w-96 h-96 bg-violet-600 -top-24 -left-24" />
      <GlowOrb className="w-72 h-72 bg-indigo-600 bottom-10 -right-16" />
      <GlowOrb className="w-56 h-56 bg-purple-500 top-1/2 left-1/4" />

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
                  background: "rgba(139,92,246,0.4)",
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
                "linear-gradient(135deg,#c4b5fd 0%,#818cf8 50%,#38bdf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "neon-flicker 4s ease-in-out infinite",
            }}
          >
            InSights AI
          </h1>
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>
            AI-Powered QA Dashboard
          </p>

          {/* Feature pills */}
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {["Live Metrics", "AI Analysis", "Sprint Health"].map((label) => (
              <span
                key={label}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  color: "#a78bfa",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Step 1: Connect to Jira ── */}
        <div
          className="rounded-2xl p-6 transition-all duration-300"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: connected
              ? "1px solid rgba(34,197,94,0.35)"
              : "1px solid rgba(139,92,246,0.25)",
            backdropFilter: "blur(20px)",
            boxShadow: connected
              ? "0 0 0 1px rgba(34,197,94,0.1), 0 8px 32px rgba(0,0,0,0.4)"
              : "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Step header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 transition-all duration-300"
              style={{
                background: connected
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(139,92,246,0.15)",
                border: connected
                  ? "1px solid rgba(34,197,94,0.5)"
                  : "1px solid rgba(139,92,246,0.5)",
                color: connected ? "#22c55e" : "#a78bfa",
              }}
            >
              {connected ? <CheckCircle2 size={14} /> : "1"}
            </div>
            <div className="flex-1">
              <span
                className="font-semibold text-sm"
                style={{ color: "#e2e8f0" }}
              >
                Connect to Jira
              </span>
            </div>
            {connected && user && (
              <span
                className="text-xs font-semibold"
                style={{ color: "#22c55e" }}
              >
                {user.displayName}
              </span>
            )}
          </div>

          {/* URL + Connect button */}
          <div className="flex gap-2.5">
            <div className="relative flex-1">
              <Link
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "#64748b" }}
              />
              <input
                type="url"
                placeholder="https://company.atlassian.net"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  paddingLeft: 34,
                  paddingRight: 12,
                  paddingTop: 10,
                  paddingBottom: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e2e8f0",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(139,92,246,0.6)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(139,92,246,0.15)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
            <button
              onClick={handleSessionConnect}
              disabled={connecting || !url.trim()}
              className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: connecting
                  ? "rgba(139,92,246,0.5)"
                  : "linear-gradient(135deg,#8b5cf6,#6366f1)",
                boxShadow: connecting
                  ? "none"
                  : "0 4px 14px rgba(139,92,246,0.4)",
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
                <Zap size={13} />
              )}
              {connecting ? "Connecting…" : connected ? "Reconnect" : "Connect"}
            </button>
          </div>

          {/* Token auth fallback */}
          {showTokenSection && !connected && (
            <div
              className="mt-4 pt-4"
              style={{
                borderTop: "1px dashed rgba(255,255,255,0.08)",
                animation: "fadeInUp 0.3s ease both",
              }}
            >
              <p className="text-xs mb-3" style={{ color: "#64748b" }}>
                Session not found — enter your Atlassian email &amp; API token.
              </p>
              <div className="flex gap-2 flex-wrap mb-3">
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className="flex-1 min-w-36 rounded-xl text-xs outline-none transition-all duration-200"
                  style={{
                    padding: "9px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                  }}
                />
                <input
                  type="password"
                  placeholder="API Token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                  className="flex-1 min-w-36 rounded-xl text-xs outline-none transition-all duration-200"
                  style={{
                    padding: "9px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                  }}
                />
                <button
                  onClick={handleTokenConnect}
                  disabled={connecting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg,#8b5cf6,#6366f1)",
                    boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                  }}
                >
                  <Lock size={11} />
                  {connecting ? "…" : "Authenticate"}
                </button>
              </div>
              <p className="text-xs" style={{ color: "#64748b" }}>
                Generate a token at{" "}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                  style={{ color: "#a78bfa" }}
                >
                  Atlassian → API Tokens
                </a>
              </p>
            </div>
          )}
        </div>

        {/* ── Step 2: Select Project ── */}
        {connected && (
          <div
            className="rounded-2xl p-6 transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(139,92,246,0.25)",
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
                  background: "rgba(139,92,246,0.15)",
                  border: "1px solid rgba(139,92,246,0.5)",
                  color: "#a78bfa",
                }}
              >
                <FolderOpen size={14} />
              </div>
              <span
                className="font-semibold text-sm"
                style={{ color: "#e2e8f0" }}
              >
                Select Project
              </span>
            </div>

            {/* Project dropdown */}
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="w-full rounded-xl text-sm outline-none cursor-pointer mb-3 transition-all duration-200"
              style={{
                padding: "10px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: selectedKey ? "#e2e8f0" : "#64748b",
                appearance: "none",
                WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                paddingRight: 36,
              }}
            >
              <option value="">— Choose a project —</option>
              {projects.map((p) => (
                <option
                  key={p.key}
                  value={p.key}
                  style={{ background: "#0a0a1a", color: "#e2e8f0" }}
                >
                  {p.name} ({p.key})
                </option>
              ))}
            </select>

            {/* Load Dashboard button */}
            <button
              onClick={handleLoadDashboard}
              disabled={!selectedKey}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selectedKey
                  ? "linear-gradient(135deg,#8b5cf6,#6366f1)"
                  : "rgba(255,255,255,0.05)",
                border: selectedKey
                  ? "none"
                  : "1px solid rgba(255,255,255,0.1)",
                color: selectedKey ? "#fff" : "#64748b",
                boxShadow: selectedKey
                  ? "0 4px 20px rgba(139,92,246,0.4)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (selectedKey) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 28px rgba(139,92,246,0.55)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = selectedKey
                  ? "0 4px 20px rgba(139,92,246,0.4)"
                  : "none";
              }}
            >
              Load Dashboard
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <p className="text-center text-xs mt-1" style={{ color: "#334155" }}>
          InSights AI · AI-Powered QA Analytics
        </p>
      </div>
    </div>
  );
}
