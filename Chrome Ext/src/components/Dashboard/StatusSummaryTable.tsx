import React from "react";
import type { Metrics, JiraIssue } from "../../types";
import {
  classifyStatus,
  normalizePriority,
} from "../../services/metricsService";

interface StatusSummaryTableProps {
  metrics: Metrics;
  selectedProjectKey: string;
}

function typeIndicator(type: string) {
  const t = type.toLowerCase();
  let cls = "task";
  if (t === "bug" || t === "defect") cls = "bug";
  else if (t === "story" || t === "user story") cls = "story";
  else if (t === "epic") cls = "epic";
  return (
    <span className="type-icon">
      <span className={`dot ${cls}`} />
    </span>
  );
}

function isMustFix(issue: JiraIssue): boolean {
  const pLow = (issue.priority || "").toLowerCase();
  const labels = (issue.labels || []).map((l) => l.toLowerCase());
  return (
    pLow === "highest" ||
    pLow === "critical" ||
    pLow === "blocker" ||
    labels.includes("must-fix") ||
    labels.includes("must_fix") ||
    labels.includes("mustfix")
  );
}

function isBlocked(issue: JiraIssue): boolean {
  const s = (issue.status || "").toLowerCase();
  return (
    s.includes("block") || s.includes("impediment") || s.includes("waiting")
  );
}

export default function StatusSummaryTable({
  metrics,
  selectedProjectKey,
}: StatusSummaryTableProps) {
  const types = Object.keys(metrics.typeMap).sort();
  const hasComponents = Object.keys(metrics.componentOpenMap || {}).length > 0;

  return (
    <section className="card fade-in">
      <h2 className="card-title">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
        Status Summary
      </h2>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Total Open</th>
              <th>Today's Reported</th>
              <th>Today's Verified</th>
              <th>Reopened</th>
              <th>Must Fix</th>
              <th>Blocked</th>
            </tr>
          </thead>
          <tbody>
            {/* Summary row */}
            <tr>
              <td>
                <strong>{selectedProjectKey} (All)</strong>
              </td>
              <td>
                <strong>{metrics.totalOpen}</strong>
              </td>
              <td>
                <strong>{metrics.todayNew}</strong>
              </td>
              <td>
                <strong>{metrics.todayResolved}</strong>
              </td>
              <td>
                <strong>{metrics.reopened}</strong>
              </td>
              <td>
                <strong>{metrics.mustFix}</strong>
              </td>
              <td>
                <strong>{metrics.blocked}</strong>
              </td>
            </tr>

            {/* Per issue type rows */}
            {types.map((type) => {
              const typeIssues = metrics.openIssues.filter(
                (i) => (i.issueType || "Other") === type,
              );
              const typeTodayNew = metrics.todayCreated.filter(
                (i) => (i.issueType || "Other") === type,
              ).length;
              const typeTodayResolved = metrics.todayResolvedIssues.filter(
                (i) => (i.issueType || "Other") === type,
              ).length;
              const typeBlocked = typeIssues.filter(isBlocked).length;
              const typeReopened = typeIssues.filter((i) =>
                (i.status || "").toLowerCase().includes("reopen"),
              ).length;
              const typeMustFix = typeIssues.filter(isMustFix).length;
              return (
                <tr key={type}>
                  <td>
                    {typeIndicator(type)} {type}
                  </td>
                  <td>{typeIssues.length}</td>
                  <td>{typeTodayNew}</td>
                  <td>{typeTodayResolved}</td>
                  <td>{typeReopened}</td>
                  <td>{typeMustFix}</td>
                  <td>{typeBlocked}</td>
                </tr>
              );
            })}

            {/* Component breakdown */}
            {hasComponents && (
              <>
                <tr className="comp-section-header">
                  <td colSpan={7} className="comp-section-label">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>{" "}
                    Blocked by Component
                  </td>
                </tr>
                {Object.entries(metrics.componentOpenMap)
                  .sort((a, b) => b[1] - a[1])
                  .map(([comp, count]) => {
                    const blocked = metrics.componentBlockedMap[comp] || 0;
                    return (
                      <tr key={comp} className="comp-data-row">
                        <td>
                          <span className="comp-tag">{comp}</span>
                        </td>
                        <td>{count}</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td>—</td>
                        <td className={blocked > 0 ? "comp-blocked-count" : ""}>
                          {blocked}
                        </td>
                      </tr>
                    );
                  })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
