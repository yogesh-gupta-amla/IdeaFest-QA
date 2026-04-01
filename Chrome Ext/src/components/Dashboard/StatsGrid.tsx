import React, { useEffect, useRef } from "react";
import type { Metrics, SnapshotMetrics } from "../../types";

interface StatsGridProps {
  metrics: Metrics;
  prevMetrics: SnapshotMetrics | null;
}

interface StatCardProps {
  id: string;
  value: number;
  label: string;
  prev: number | null;
  higherIsBad: boolean;
  danger?: boolean;
  icon: React.ReactNode;
}

function animateValue(el: HTMLElement, from: number, to: number) {
  const diff = to - from;
  if (diff === 0) {
    el.textContent = String(to);
    return;
  }
  const duration = 600;
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = String(
      Math.round(from + diff * (1 - Math.pow(1 - progress, 3))),
    );
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function StatCard({
  value,
  label,
  prev,
  higherIsBad,
  danger,
  icon,
}: StatCardProps) {
  const valRef = useRef<HTMLDivElement>(null);
  const prevVal = useRef(0);

  useEffect(() => {
    if (valRef.current) {
      animateValue(valRef.current, prevVal.current, value);
      prevVal.current = value;
    }
  }, [value]);

  let trendEl: React.ReactNode = null;
  if (prev !== null && prev !== undefined) {
    const diff = value - prev;
    if (diff !== 0) {
      const isUp = diff > 0;
      const isBad = higherIsBad ? isUp : !isUp;
      trendEl = (
        <div className={`stat-trend trend-${isBad ? "bad" : "good"}`}>
          {isUp ? "↑" : "↓"} {Math.abs(diff)} vs prev
        </div>
      );
    }
  }

  return (
    <div className={`stat-card${danger ? " stat-card-danger" : ""}`}>
      <div
        className={`stat-icon stat-icon-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        {icon}
      </div>
      <div className="stat-value" ref={valRef}>
        0
      </div>
      <div className="stat-label">{label}</div>
      {trendEl}
    </div>
  );
}

export default function StatsGrid({ metrics, prevMetrics }: StatsGridProps) {
  const p = prevMetrics;

  const stats: StatCardProps[] = [
    {
      id: "total-open",
      value: metrics.totalOpen,
      label: "Total Open",
      prev: p?.totalOpen ?? null,
      higherIsBad: true,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
    {
      id: "today-new",
      value: metrics.todayNew,
      label: "Today's Reported",
      prev: p?.todayNew ?? null,
      higherIsBad: true,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
    },
    {
      id: "today-resolved",
      value: metrics.todayResolved,
      label: "Today's Verified",
      prev: p?.todayResolved ?? null,
      higherIsBad: false,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      id: "reopened",
      value: metrics.reopened,
      label: "Reopened",
      prev: p?.reopened ?? null,
      higherIsBad: true,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      ),
    },
    {
      id: "must-fix",
      value: metrics.mustFix,
      label: "Must Fix",
      prev: p?.mustFix ?? null,
      higherIsBad: true,
      danger: true,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      id: "blocked",
      value: metrics.blocked,
      label: "Blocked",
      prev: p?.blocked ?? null,
      higherIsBad: true,
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
  ];

  return (
    <section className="stats-row stats-row-6 fade-in">
      {stats.map((s) => (
        <StatCard key={s.id} {...s} />
      ))}
    </section>
  );
}
