import React from "react";
import type { JiraIssue } from "../../types";
import {
  classifyStatus,
  normalizePriority,
} from "../../services/metricsService";

interface MustFixTableProps {
  issues: JiraIssue[];
}

function priorityBadge(priority: string) {
  const norm = normalizePriority(priority);
  return (
    <span className={`priority-badge p-${norm.toLowerCase()}`}>{norm}</span>
  );
}

function statusBadge(issue: JiraIssue) {
  const cat = classifyStatus(issue);
  let cls = "s-open";
  if (cat === "Done") cls = "s-done";
  else if (cat === "In Progress") cls = "s-progress";
  else if (cat === "Blocked") cls = "s-blocked";
  return <span className={`status-badge ${cls}`}>{issue.status}</span>;
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

export default function MustFixTable({ issues }: MustFixTableProps) {
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
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        Must Fix Issues{" "}
        <span className="count-badge">{issues.length} issues</span>
      </h2>
      {issues.length === 0 ? (
        <p className="empty-state">No must-fix issues 🎉</p>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Summary</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.key}>
                  <td className="issue-key">{i.key}</td>
                  <td>{i.summary}</td>
                  <td>{priorityBadge(i.priority)}</td>
                  <td>{statusBadge(i)}</td>
                  <td>{i.assignee || "Unassigned"}</td>
                  <td>
                    {typeIndicator(i.issueType)} {i.issueType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
