import React, { useEffect, useState } from "react";
import type { JiraProject } from "../../types";
import { fetchJiraIssues } from "../../services/jiraService";
import { computeMetrics, calculateHealth } from "../../services/metricsService";

interface MultiProjectViewProps {
  projects: JiraProject[];
  jiraUrl: string;
  authToken: string | null;
  onSelectProject: (key: string, name: string) => void;
}

type ProjectStatus = "loading" | "loaded" | "error";

interface ProjectCard {
  project: JiraProject;
  status: ProjectStatus;
  health?: "green" | "yellow" | "red";
  totalOpen?: number;
  todayNew?: number;
  mustFix?: number;
  blocked?: number;
  reasons?: { text: string; type: string }[];
  error?: string;
}

const HEALTH_LABELS = { green: "HEALTHY", yellow: "AT RISK", red: "CRITICAL" };

export default function MultiProjectView({
  projects,
  jiraUrl,
  authToken,
  onSelectProject,
}: MultiProjectViewProps) {
  const [cards, setCards] = useState<ProjectCard[]>(
    projects.map((p) => ({ project: p, status: "loading" })),
  );

  useEffect(() => {
    let cancelled = false;
    setCards(projects.map((p) => ({ project: p, status: "loading" })));

    async function loadAll() {
      for (const project of projects) {
        if (cancelled) break;
        try {
          const [openResult, todayResult, resolvedResult] = await Promise.all([
            fetchJiraIssues(
              jiraUrl,
              `project = "${project.key}" AND resolution = Unresolved ORDER BY priority ASC`,
              500,
              authToken,
            ),
            fetchJiraIssues(
              jiraUrl,
              `project = "${project.key}" AND created >= startOfDay()`,
              200,
              authToken,
            ),
            fetchJiraIssues(
              jiraUrl,
              `project = "${project.key}" AND resolved >= startOfDay()`,
              200,
              authToken,
            ),
          ]);

          if (cancelled) break;

          const openIssues = openResult.success ? openResult.issues || [] : [];
          const todayCreated = todayResult.success
            ? todayResult.issues || []
            : [];
          const todayResolved = resolvedResult.success
            ? resolvedResult.issues || []
            : [];
          const metrics = computeMetrics(
            openIssues,
            todayCreated,
            todayResolved,
          );
          const { health, reasons } = calculateHealth(metrics);

          setCards((prev) =>
            prev.map((c) =>
              c.project.key === project.key
                ? {
                    ...c,
                    status: "loaded",
                    health,
                    reasons,
                    totalOpen: metrics.totalOpen,
                    todayNew: metrics.todayNew,
                    mustFix: metrics.mustFix,
                    blocked: metrics.blocked,
                  }
                : c,
            ),
          );
        } catch (err: unknown) {
          if (cancelled) break;
          setCards((prev) =>
            prev.map((c) =>
              c.project.key === project.key
                ? { ...c, status: "error", error: (err as Error).message }
                : c,
            ),
          );
        }
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [projects, jiraUrl, authToken]);

  return (
    <section className="fade-in" style={{ marginBottom: 28 }}>
      <div className="overview-header">
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
          Project Health Overview
        </h2>
        <div className="overview-legend">
          <span className="legend-item">
            <span className="legend-dot legend-green" />
            Healthy
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-yellow" />
            At Risk
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-red" />
            Critical
          </span>
        </div>
      </div>

      <div className="project-health-grid">
        {cards.map(
          ({
            project,
            status,
            health,
            reasons,
            totalOpen,
            todayNew,
            mustFix,
            blocked,
            error,
          }) => (
            <div
              key={project.key}
              className={`project-health-card${health ? ` phc-${health}` : ""}`}
              onClick={() =>
                status === "loaded" &&
                onSelectProject(project.key, `${project.name} (${project.key})`)
              }
              style={{ cursor: status === "loaded" ? "pointer" : "default" }}
            >
              <div className="phc-header">
                <div className="phc-title">
                  {status === "loaded" && <span className="phc-dot" />}
                  <span className="phc-name">{project.name}</span>
                  <span className="phc-key">{project.key}</span>
                </div>
                {health && (
                  <span className="phc-health-tag">
                    {HEALTH_LABELS[health]}
                  </span>
                )}
              </div>

              {status === "loading" && (
                <div className="phc-loading">
                  <span className="mini-spinner" /> Loading…
                </div>
              )}

              {status === "error" && (
                <div className="phc-loading" style={{ color: "var(--danger)" }}>
                  Failed: {error}
                </div>
              )}

              {status === "loaded" && (
                <>
                  <div className="phc-stats">
                    <div className="phc-stat">
                      <div className="phc-stat-val">{totalOpen}</div>
                      <div className="phc-stat-label">Open</div>
                    </div>
                    <div className="phc-stat">
                      <div className="phc-stat-val">{todayNew}</div>
                      <div className="phc-stat-label">New Today</div>
                    </div>
                    <div className="phc-stat">
                      <div
                        className={`phc-stat-val${(mustFix ?? 0) > 0 ? " phc-danger" : ""}`}
                      >
                        {mustFix}
                      </div>
                      <div className="phc-stat-label">Must Fix</div>
                    </div>
                    <div className="phc-stat">
                      <div
                        className={`phc-stat-val${(blocked ?? 0) > 0 ? " phc-danger" : ""}`}
                      >
                        {blocked}
                      </div>
                      <div className="phc-stat-label">Blocked</div>
                    </div>
                  </div>
                  <div className="phc-reasons">
                    {(reasons || []).slice(0, 3).map((r, i) => (
                      <span key={i} className={`phc-reason r-${r.type}`}>
                        {r.text}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ),
        )}
      </div>
      <p className="overview-hint">
        Click any project card to drill into its detailed dashboard.
      </p>
    </section>
  );
}
