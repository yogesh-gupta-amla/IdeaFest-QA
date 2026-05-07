import React, { useState, useEffect, useRef } from "react";

const TIPS = [
  "Fetching all issues with full pagination…",
  "Large projects may have thousands of issues — hang tight!",
  "Data is cached locally after first load for faster navigation.",
  "Switch between tabs without re-fetching — data stays in memory.",
  "Use the Sync button to pull fresh data anytime.",
  "Ageing analysis fetches lifetime data for complete coverage.",
  "Each page derives insights from the same shared dataset.",
  "Code Intelligence links Jira stories to GitHub commits.",
  "AI Recommendations analyze your project health metrics.",
  "Pro tip: Bookmark your most-used project for quick access.",
];

const QUERY_STEPS = [
  "Open Issues",
  "Created Issues",
  "Resolved Issues",
  "Recently Resolved",
  "Ageing Critical/Blockers",
  "Total Active Issues",
  "Overburnt Items",
  "Early Completions",
  "Code Intelligence",
  "Sprint Info",
  "Dev Info (Commits/PRs)",
];

interface LoadingOverlayProps {
  visible: boolean;
  text: string;
  progress?: { fetched: number; total: number; label: string } | null;
  onCancel?: () => void;
}

export default function LoadingOverlay({
  visible,
  text,
  progress,
  onCancel,
}: LoadingOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const startRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track which step we're on based on the loading text
  const currentStepFromText = QUERY_STEPS.findIndex((s) =>
    text.toLowerCase().includes(s.toLowerCase()),
  );
  const currentStepFromLabel = progress?.label
    ? QUERY_STEPS.findIndex((s) =>
        progress.label.toLowerCase().includes(s.toLowerCase()),
      )
    : -1;
  const currentStepRaw =
    currentStepFromText >= 0 ? currentStepFromText : currentStepFromLabel;
  const currentStep = Math.max(
    0,
    Math.min(QUERY_STEPS.length - 1, currentStepRaw),
  );
  const completedSteps = currentStep;
  const totalSteps = QUERY_STEPS.length;
  const stepFraction =
    progress && progress.total > 0
      ? Math.max(0, Math.min(1, progress.fetched / progress.total))
      : 0;
  const overallPct = Math.max(
    0,
    Math.min(
      100,
      Math.round(((completedSteps + stepFraction) / totalSteps) * 100),
    ),
  );

  useEffect(() => {
    if (visible) {
      startRef.current = Date.now();
      setElapsed(0);
      setTipIdx(0);
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible]);

  // Rotate tips every 4 seconds
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 4000);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  const pagePct =
    progress && progress.total > 0
      ? Math.max(
          0,
          Math.min(100, Math.round((progress.fetched / progress.total) * 100)),
        )
      : 0;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="loading-overlay">
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        {/* Animated spinner */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "3px solid rgba(139,92,246,0.15)",
              borderTopColor: "#8b5cf6",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>

        {/* Current action */}
        <p
          style={{
            color: "#e2e8f0",
            fontSize: 14,
            fontWeight: 600,
            margin: "0 0 4px",
          }}
        >
          {text}
        </p>
        <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 16px" }}>
          Elapsed: {timeStr}
        </p>

        {/* Overall progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              Overall Progress
            </span>
            <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>
              {overallPct}%
            </span>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: 8,
              height: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: "linear-gradient(90deg, #8b5cf6, #6366f1, #818cf8)",
                height: "100%",
                width: `${overallPct}%`,
                borderRadius: 8,
                transition: "width 0.4s ease",
                boxShadow: "0 0 12px rgba(139,92,246,0.4)",
              }}
            />
          </div>
        </div>

        {/* Per-query progress */}
        {progress && progress.total > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: 6,
                height: 6,
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  background: "linear-gradient(90deg, #22d3ee, #6366f1)",
                  height: "100%",
                  width: `${pagePct}%`,
                  borderRadius: 6,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
              {progress.label}:{" "}
              {Math.min(progress.fetched, progress.total).toLocaleString()} /{" "}
              {progress.total.toLocaleString()} ({pagePct}%)
            </p>
          </div>
        )}

        {/* Step indicators */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 6,
            margin: "16px 0",
            textAlign: "left",
          }}
        >
          {QUERY_STEPS.map((step, idx) => {
            const isDone = idx < completedSteps;
            const isActive = idx === completedSteps;
            return (
              <div
                key={step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  background: isActive
                    ? "rgba(139,92,246,0.15)"
                    : isDone
                      ? "rgba(34,197,94,0.08)"
                      : "rgba(255,255,255,0.03)",
                  color: isActive ? "#a78bfa" : isDone ? "#4ade80" : "#475569",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.3s ease",
                }}
              >
                <span style={{ fontSize: 13, width: 16, textAlign: "center" }}>
                  {isDone ? "✓" : isActive ? "◉" : "○"}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {/* Rotating tips */}
        <div
          style={{
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: 8,
            background: "rgba(139,92,246,0.06)",
            border: "1px solid rgba(139,92,246,0.12)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              margin: 0,
              fontStyle: "italic",
              transition: "opacity 0.5s ease",
            }}
          >
            💡 {TIPS[tipIdx]}
          </p>
        </div>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              marginTop: 20,
              padding: "8px 28px",
              borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.08)",
              color: "#f87171",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(239,68,68,0.18)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(239,68,68,0.7)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(239,68,68,0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "rgba(239,68,68,0.4)";
            }}
          >
            ✕ Cancel
          </button>
        )}
      </div>
    </div>
  );
}
