import React from "react";
import type { Metrics } from "../../types";

interface HighlightsListProps {
  metrics: Metrics;
  selectedProjectKey: string;
  qaNotes: { id: string; text: string }[];
}

interface HighlightItem {
  icon: string;
  text: string;
  type: "danger" | "warning" | "info" | "success";
}

export default function HighlightsList({
  metrics,
  selectedProjectKey,
  qaNotes,
}: HighlightsListProps) {
  const items: HighlightItem[] = [];

  if (metrics.mustFix > 0) {
    items.push({
      icon: "⚠️",
      text: `From the ${selectedProjectKey} side, there are ${metrics.mustFix} (Issues) must-fix bugs related to functional defects that require resolution.`,
      type: "danger",
    });
  }
  if (metrics.blocked > 0) {
    items.push({
      icon: "🔒",
      text: `${metrics.blocked} issues are currently blocked and need immediate attention.`,
      type: "warning",
    });
  }
  if (metrics.todayNew > 0) {
    items.push({
      icon: "📝",
      text: `${metrics.todayNew} new issues reported today${metrics.todayResolved > 0 ? `, ${metrics.todayResolved} verified/resolved.` : "."}`,
      type: "info",
    });
  }
  if (metrics.bugCount > 0) {
    items.push({
      icon: "🐛",
      text: `${metrics.bugCount} open bugs in the project across all priorities.`,
      type: "info",
    });
  }
  if (metrics.todayResolved > metrics.todayNew && metrics.todayResolved > 0) {
    items.push({
      icon: "✅",
      text: `Good progress! More issues resolved (${metrics.todayResolved}) than created (${metrics.todayNew}) today.`,
      type: "success",
    });
  }
  if (metrics.blocked > 0 || metrics.mustFix > 0) {
    items.push({
      icon: "📋",
      text: "Perform regression & adhoc testing. Focus on must-fix and blocked items.",
      type: "info",
    });
  }

  return (
    <section className="card highlights-card fade-in">
      <h2 className="card-title">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        Highlights
      </h2>
      <div className="highlights-list">
        {items.map((item, i) => (
          <div key={i} className={`highlight-item highlight-${item.type}`}>
            <span className="highlight-icon">{item.icon}</span>
            <span className="highlight-text">{item.text}</span>
          </div>
        ))}
        {qaNotes
          .filter((n) => n.text.trim())
          .map((note) => (
            <div key={note.id} className="highlight-item highlight-info">
              <span className="highlight-icon">•</span>
              <span className="highlight-text">{note.text}</span>
            </div>
          ))}
      </div>
    </section>
  );
}
