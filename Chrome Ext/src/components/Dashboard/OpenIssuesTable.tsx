import React from "react";
import type { JiraIssue } from "../../types";
import {
  classifyStatus,
  normalizePriority,
} from "../../services/metricsService";

interface OpenIssuesTableProps {
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

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function OpenIssuesTable({ issues }: OpenIssuesTableProps) {
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        Open Issues <span className="count-badge">{issues.length} issues</span>
      </h2>
      {issues.length === 0 ? (
        <p className="empty-state">No open issues 🎉</p>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Summary</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.key}>
                  <td className="issue-key">{i.key}</td>
                  <td>{i.summary}</td>
                  <td>
                    {typeIndicator(i.issueType)} {i.issueType}
                  </td>
                  <td>{priorityBadge(i.priority)}</td>
                  <td>{statusBadge(i)}</td>
                  <td>{i.assignee || "Unassigned"}</td>
                  <td>{formatDate(i.created)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
