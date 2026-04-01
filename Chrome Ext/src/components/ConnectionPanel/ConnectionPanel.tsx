import React, { useState } from "react";
import type { AuthMode } from "../../types";

interface ConnectionPanelProps {
  initialUrl: string;
  authMode: AuthMode;
  onConnect: (
    url: string,
    email?: string,
    token?: string,
  ) => Promise<boolean | void>;
}

export default function ConnectionPanel({
  initialUrl,
  authMode,
  onConnect,
}: ConnectionPanelProps) {
  const [url, setUrl] = useState(initialUrl || "");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [showTokenSection, setShowTokenSection] = useState(false);
  const [connecting, setConnecting] = useState(false);
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

  return (
    <section className="card config-card fade-in">
      <h2 className="card-title">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        Configuration
      </h2>
      <div className="config-row">
        <div className="input-group">
          <input
            type="url"
            className="input"
            placeholder="https://company.atlassian.net"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <span
            className={`status-dot ${connected ? "connected" : connecting ? "loading" : "disconnected"}`}
            title={connected ? "Connected" : "Not connected"}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSessionConnect}
          disabled={connecting}
        >
          {connecting ? "Connecting…" : connected ? "Reconnect" : "Connect"}
        </button>
      </div>

      {showTokenSection && !connected && (
        <div className="token-auth-section">
          <p className="auth-hint">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Browser session not found. Enter your Atlassian email &amp; API
            token to connect.
          </p>
          <div className="config-row" style={{ marginTop: 12 }}>
            <div className="input-group">
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                className="input"
                placeholder="Jira API Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleTokenConnect}
              disabled={connecting}
            >
              {connecting ? "Authenticating…" : "Authenticate"}
            </button>
          </div>
          <p className="auth-hint-small">
            Generate a token at{" "}
            <a
              href="https://id.atlassian.com/manage-profile/security/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
            >
              id.atlassian.com → Security → API tokens
            </a>
          </p>
        </div>
      )}
    </section>
  );
}
