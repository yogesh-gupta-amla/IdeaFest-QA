import React from "react";
import type { Metrics, HealthReason } from "../../types";
import { calculateHealth } from "../../services/metricsService";

interface HealthBannerProps {
  metrics: Metrics;
  selectedProjectName: string;
  sprintName?: string;
  sprintGoal?: string;
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
  sprintName,
  sprintGoal,
}: HealthBannerProps) {
  const { health, reasons } = calculateHealth(metrics);
  const healthLabels = { green: "HEALTHY", yellow: "AT RISK", red: "CRITICAL" };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className={`health-banner fade-in health-${health}`}>
      <div className="health-indicator">
        <div className="health-dot" />
        <div className="health-info">
          <h2 className="health-project-name">{selectedProjectName}</h2>
          <div className="health-status">
            <span className="health-label">{healthLabels[health]}</span>
          </div>
        </div>
      </div>

      <div className="health-reasons">
        {reasons.map((r, i) => (
          <ReasonTag key={i} reason={r} />
        ))}
      </div>

      <div className="health-meta">
        <span className="health-meta-item">📅 {today}</span>
        <span className="health-meta-item">
          📊 {metrics.totalOpen} open issues
        </span>
        {sprintName && (
          <span className="health-meta-item">🏃 {sprintName}</span>
        )}
        {sprintGoal && (
          <span className="health-meta-item" title={sprintGoal}>
            🎯{" "}
            {sprintGoal.length > 60
              ? sprintGoal.slice(0, 60) + "…"
              : sprintGoal}
          </span>
        )}
      </div>
    </section>
  );
}
