import React, { useState } from "react";
import type { AuthMode, JiraUser, JiraProject } from "../../types";

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
      style={{
        minHeight: "100vh",
        background: "var(--qa-bg-primary, #0f1117)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🧪</div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: "var(--qa-text-primary, #f1f5f9)",
              letterSpacing: "-0.5px",
            }}
          >
            Insights AI
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--qa-text-muted, #64748b)",
            }}
          >
            AI-Powered Dashboard
          </p>
        </div>

        {/* Step 1 – Connect */}
        <div
          style={{
            background: "var(--qa-bg-card, #1e2230)",
            border: "1px solid var(--qa-border, #2d3448)",
            borderRadius: 14,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: connected
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(79,142,247,0.15)",
                border: `1px solid ${connected ? "rgba(34,197,94,0.4)" : "rgba(79,142,247,0.4)"}`,
                color: connected ? "#22c55e" : "#4f8ef7",
                fontSize: 11,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {connected ? "✓" : "1"}
            </span>
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "var(--qa-text-primary, #f1f5f9)",
              }}
            >
              Connect to Jira
            </span>
            {connected && user && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "#22c55e",
                }}
              >
                {user.displayName}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="url"
              placeholder="https://company.atlassian.net"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                background: "var(--qa-bg-secondary, #161a27)",
                border: "1px solid var(--qa-border, #2d3448)",
                borderRadius: 8,
                color: "var(--qa-text-primary, #f1f5f9)",
                padding: "9px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={handleSessionConnect}
              disabled={connecting}
              style={{
                background: "var(--qa-accent, #4f8ef7)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: connecting ? "not-allowed" : "pointer",
                opacity: connecting ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {connecting ? "…" : connected ? "Reconnect" : "Connect"}
            </button>
          </div>

          {/* Token auth fallback */}
          {showTokenSection && !connected && (
            <div style={{ marginTop: 14 }}>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: 12,
                  color: "var(--qa-text-muted, #64748b)",
                }}
              >
                Session not found — enter your Atlassian email &amp; API token.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: "var(--qa-bg-secondary, #161a27)",
                    border: "1px solid var(--qa-border, #2d3448)",
                    borderRadius: 8,
                    color: "var(--qa-text-primary, #f1f5f9)",
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <input
                  type="password"
                  placeholder="API Token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  autoComplete="off"
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: "var(--qa-bg-secondary, #161a27)",
                    border: "1px solid var(--qa-border, #2d3448)",
                    borderRadius: 8,
                    color: "var(--qa-text-primary, #f1f5f9)",
                    padding: "8px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleTokenConnect}
                  disabled={connecting}
                  style={{
                    background: "var(--qa-accent, #4f8ef7)",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: connecting ? "not-allowed" : "pointer",
                    opacity: connecting ? 0.7 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {connecting ? "…" : "Authenticate"}
                </button>
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 11,
                  color: "var(--qa-text-muted, #64748b)",
                }}
              >
                Generate a token at{" "}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--qa-accent, #4f8ef7)" }}
                >
                  Atlassian → Security → API Tokens
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Step 2 – Select Project */}
        {connected && (
          <div
            style={{
              background: "var(--qa-bg-card, #1e2230)",
              border: "1px solid var(--qa-border, #2d3448)",
              borderRadius: 14,
              padding: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "rgba(79,142,247,0.15)",
                  border: "1px solid rgba(79,142,247,0.4)",
                  color: "#4f8ef7",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                2
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: "var(--qa-text-primary, #f1f5f9)",
                }}
              >
                Select Project
              </span>
            </div>

            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              style={{
                width: "100%",
                background: "var(--qa-bg-secondary, #161a27)",
                border: "1px solid var(--qa-border, #2d3448)",
                borderRadius: 8,
                color: selectedKey
                  ? "var(--qa-text-primary, #f1f5f9)"
                  : "var(--qa-text-muted, #64748b)",
                padding: "9px 12px",
                fontSize: 13,
                outline: "none",
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              <option value="">— Choose a project —</option>
              {projects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadDashboard}
              disabled={!selectedKey}
              style={{
                width: "100%",
                background: selectedKey
                  ? "var(--qa-accent, #4f8ef7)"
                  : "var(--qa-bg-secondary, #161a27)",
                border: selectedKey
                  ? "none"
                  : "1px solid var(--qa-border, #2d3448)",
                borderRadius: 8,
                color: selectedKey ? "#fff" : "var(--qa-text-muted, #64748b)",
                padding: "10px",
                fontSize: 13,
                fontWeight: 700,
                cursor: selectedKey ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              Load Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
