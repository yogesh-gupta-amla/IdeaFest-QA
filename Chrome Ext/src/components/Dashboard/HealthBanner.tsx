import React from "react";
import type { Metrics, RAGStatus, HealthReason } from "../../types";
import { calculateHealth } from "../../services/metricsService";

interface HealthBannerProps {
  metrics: Metrics;
  selectedProjectName: string;
  testingEnv: string;
  sprintName: string;
  ragOverride: RAGStatus;
  onRagOverrideChange: (rag: RAGStatus) => void;
}

function ReasonTag({ reason }: { reason: HealthReason }) {
  return (
    <span className={`health-reason-tag tag-${reason.type}`}>
      {reason.text}
    </span>
  );
}

export default function HealthBanner({
  metrics,
  selectedProjectName,
  testingEnv,
  sprintName,
  ragOverride,
  onRagOverrideChange,
}: HealthBannerProps) {
  const { health: autoHealth, reasons } = calculateHealth(metrics);
  const health = ragOverride || autoHealth;
  const healthLabels = { green: "HEALTHY", yellow: "AT RISK", red: "CRITICAL" };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const ragBtns: { rag: "auto" | RAGStatus; label: string; cls?: string }[] = [
    { rag: "auto", label: "Auto" },
    { rag: "green", label: "Healthy", cls: "rag-green-btn" },
    { rag: "yellow", label: "At Risk", cls: "rag-yellow-btn" },
    { rag: "red", label: "Critical", cls: "rag-red-btn" },
  ];

  return (
    <section className={`health-banner fade-in health-${health}`}>
      <div className="health-indicator">
        <div className="health-dot" />
        <div className="health-info">
          <h2 className="health-project-name">{selectedProjectName}</h2>
          <div className="health-status">
            <span className="health-label">
              {healthLabels[health]}
              {ragOverride ? " ◆ Override" : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="health-reasons">
        {reasons.map((r, i) => (
          <ReasonTag key={i} reason={r} />
        ))}
        {ragOverride && (
          <span className="health-reason-tag tag-warning">
            ✏️ Manual override active
          </span>
        )}
      </div>

      <div className="health-meta">
        <span className="health-meta-item">📅 {today}</span>
        <span className="health-meta-item">
          📊 {metrics.totalOpen} open issues
        </span>
        <span className="health-meta-item">🌐 Env: {testingEnv}</span>
        {sprintName && (
          <span className="health-meta-item">🏃 {sprintName}</span>
        )}
      </div>

      <div className="rag-override-row">
        <span className="rag-label">Override Status:</span>
        {ragBtns.map(({ rag, label, cls }) => {
          const isActive =
            rag === "auto" ? ragOverride === null : rag === ragOverride;
          return (
            <button
              key={String(rag)}
              className={`rag-btn${cls ? ` ${cls}` : ""}${isActive ? " rag-active" : ""}`}
              onClick={() => {
                const next: RAGStatus = rag === "auto" ? null : rag;
                onRagOverrideChange(next);
              }}
            >
              {rag !== "auto" && (
                <span
                  className="rag-dot"
                  style={{ background: `var(--health-${rag})` }}
                />
              )}
              {rag === "auto" && (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              )}
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
