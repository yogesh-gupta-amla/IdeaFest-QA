import React from "react";
import { useDashboardStore } from "../../store/useStore";
import StatsGrid from "../Dashboard/StatsGrid";
import HealthBanner from "../Dashboard/HealthBanner";

export default function ProjectOverview() {
  const {
    projectMetrics,
    prevProjectMetrics,
    projectKey,
    projectName,
    sprintName,
    sprintGoal,
  } = useDashboardStore();

  if (!projectMetrics) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          gap: 12,
          color: "var(--qa-text-muted)",
        }}
      >
        <span style={{ fontSize: 42 }}>📂</span>
        <p style={{ fontSize: 15, margin: 0 }}>No project loaded yet.</p>
        <p style={{ fontSize: 13, margin: 0 }}>
          Select a project from the header dropdown to load data.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <HealthBanner
        metrics={projectMetrics}
        selectedProjectName={projectName || projectKey}
        sprintName={sprintName}
        sprintGoal={sprintGoal}
      />
      <StatsGrid metrics={projectMetrics} prevMetrics={prevProjectMetrics} />
    </div>
  );
}
