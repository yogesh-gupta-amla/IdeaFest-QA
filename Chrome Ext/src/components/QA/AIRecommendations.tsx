import React from "react";
import {
  Bot,
  Zap,
  TrendingUp,
  AlertTriangle,
  Users,
  ArrowRight,
  Cpu,
  Target,
  Shield,
  Activity,
  Clock,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Flame,
  Lightbulb,
  Bug,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { useAIRecommendations } from "../../hooks/useQAData";
import type {
  AIImmediateAction,
  AIOptimizationTip,
  AIPrioritizedFix,
  AIRiskPrediction,
} from "../../types/qa";

/* ─── colour palette ───────────────────────────────────── */
const SEV: Record<
  string,
  { text: string; bg: string; border: string; glow: string }
> = {
  High: {
    text: "#f87171",
    bg: "rgba(248,113,113,0.09)",
    border: "rgba(248,113,113,0.35)",
    glow: "248,113,113",
  },
  Medium: {
    text: "#fbbf24",
    bg: "rgba(251,191,36,0.09)",
    border: "rgba(251,191,36,0.35)",
    glow: "251,191,36",
  },
  Low: {
    text: "#34d399",
    bg: "rgba(52,211,153,0.09)",
    border: "rgba(52,211,153,0.35)",
    glow: "52,211,153",
  },
};
const PROB_PCT: Record<string, number> = { High: 88, Medium: 52, Low: 22 };
const ACCENTS = ["#8b5cf6", "#06d6a0", "#3a86ff", "#ffbe0b", "#f97316"];

const scoreTone = (s: number) =>
  s >= 80
    ? { label: "Healthy", color: "#34d399", glow: "52,211,153" }
    : s >= 60
      ? { label: "Watch", color: "#fbbf24", glow: "251,191,36" }
      : { label: "At Risk", color: "#f87171", glow: "248,113,113" };

/* CSS variable shorthand */
const T = "var(--text-heading)";
const TM = "var(--text)";
const TS = "var(--text-muted)";

/* Rainbow conic gradient */
const RB =
  "conic-gradient(from 0deg, #ff006e, #8338ec, #3a86ff, #06d6a0, #ffbe0b, #f97316, #ff006e)";

/* ─────────────────────────────────────────────────────────
   NeonCard — padding-based rotating border (correct technique)

   How it works:
   • Outer wrapper has padding: N px → this gap IS the visible border
   • Spinning conic-gradient fills that gap
   • Inner card body covers only the interior (radius - Npx)
───────────────────────────────────────────────────────── */
interface NeonCardProps {
  children: React.ReactNode;
  accent?: string;
  rainbow?: boolean;
  delay?: number;
  borderPx?: number;
  speed?: "slow" | "normal" | "fast";
  innerGlow?: boolean; // subtle radial accent glow inside
}

const NeonCard: React.FC<NeonCardProps> = ({
  children,
  accent = "#8b5cf6",
  rainbow = true,
  delay = 0,
  borderPx = 2,
  speed = "normal",
  innerGlow = true,
}) => {
  const spinCls =
    speed === "slow"
      ? "neon-border-spin-el-slow"
      : speed === "fast"
        ? "neon-border-spin-el-fast"
        : "neon-border-spin-el";
  const grad = rainbow
    ? RB
    : `conic-gradient(from 0deg, ${accent}00 0deg, ${accent}ff 60deg, ${accent}dd 120deg, ${accent}ff 180deg, ${accent}dd 240deg, ${accent}00 300deg)`;
  const outerR = 20;
  const innerR = outerR - borderPx;

  return (
    <div
      className="relative group/nc ai-card-in"
      style={{
        padding: borderPx,
        borderRadius: outerR,
        animationDelay: `${delay}ms`,
        boxShadow: `0 0 22px ${accent}40, 0 0 50px ${accent}10, 0 6px 36px rgba(0,0,0,0.65)`,
        transition: "box-shadow 0.35s ease, transform 0.3s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform =
          "translateY(-4px) scale(1.012)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 0 45px ${accent}70, 0 0 90px ${accent}30, 0 12px 48px rgba(0,0,0,0.8)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          `0 0 22px ${accent}40, 0 0 50px ${accent}10, 0 6px 36px rgba(0,0,0,0.65)`;
      }}
    >
      {/* spinning gradient — fills the padding gap = visible border */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: outerR, pointerEvents: "none" }}
      >
        <div
          className={`${spinCls} aurora-el absolute`}
          style={{
            inset: "-110%",
            background: grad,
            opacity: rainbow ? 1 : 0.9,
          }}
        />
      </div>

      {/* card body */}
      <div
        className="relative h-full"
        style={{
          borderRadius: innerR,
          background: "var(--qa-bg-card)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          overflow: "hidden",
        }}
      >
        {/* top edge shimmer line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none overflow-hidden"
          style={{ borderRadius: "100% 100% 0 0" }}
        >
          <div
            className="absolute inset-y-0 w-1/3"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}ff, transparent)`,
              animation: "stripe-slide 3s ease-in-out infinite",
              animationDelay: `${delay}ms`,
            }}
          />
        </div>

        {/* inner ambient glow orb */}
        {innerGlow && (
          <div
            className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none orb-float glow-breathe"
            style={{
              background: `radial-gradient(circle, ${accent}30 0%, transparent 70%)`,
              filter: "blur(22px)",
            }}
          />
        )}

        {/* dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {children}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   SectionHeader — gradient text + animated underline
───────────────────────────────────────────────────────── */
const SHead: React.FC<{
  icon: React.ReactNode;
  title: string;
  accent?: string;
  count?: number;
}> = ({ icon, title, accent = "#8b5cf6", count }) => (
  <div className="flex items-center gap-3 mb-5">
    <div
      className="flex items-center justify-center w-10 h-10 rounded-2xl flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
        border: `1px solid ${accent}40`,
        color: accent,
        boxShadow: `0 0 20px ${accent}35, inset 0 0 12px ${accent}10`,
      }}
    >
      {icon}
    </div>

    <div className="flex-1">
      <div
        className="font-extrabold text-[15px] tracking-tight"
        style={{
          background: `linear-gradient(110deg, #ffffff 40%, ${accent} 80%, #ffffff 100%)`,
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "text-shimmer 4s linear infinite",
        }}
      >
        {title}
      </div>
      {/* underline */}
      <div
        className="mt-0.5 h-px rounded-full"
        style={{
          background: `linear-gradient(90deg, ${accent}80, ${accent}20, transparent)`,
          width: "60%",
        }}
      />
    </div>

    {count !== undefined && (
      <div
        className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-[11px] font-black"
        style={{
          background: `${accent}20`,
          border: `1px solid ${accent}45`,
          color: accent,
          boxShadow: `0 0 10px ${accent}30`,
        }}
      >
        {count}
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────
   HealthCircle
───────────────────────────────────────────────────────── */
const HealthCircle: React.FC<{ score: number }> = ({ score }) => {
  const tone = scoreTone(score);
  const r = 54,
    circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative w-[152px] h-[152px]">
        {/* pulsing ring */}
        <div
          className="pulse-ring-el absolute rounded-full pointer-events-none"
          style={{ inset: -5, border: `2px solid ${tone.color}`, opacity: 0.5 }}
        />
        {/* spinning rainbow ring behind circle */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ padding: 3 }}
        >
          <div
            className="neon-border-spin-el-slow aurora-el absolute"
            style={{ inset: "-110%", background: RB, opacity: 0.6 }}
          />
        </div>
        {/* SVG arc */}
        <svg
          width="152"
          height="152"
          viewBox="0 0 152 152"
          className="absolute inset-0"
        >
          <circle
            cx="76"
            cy="76"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="10"
          />
          <circle
            cx="76"
            cy="76"
            r={r}
            fill="none"
            stroke={tone.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "76px 76px",
              filter: `drop-shadow(0 0 10px rgba(${tone.glow},0.95)) drop-shadow(0 0 22px rgba(${tone.glow},0.4))`,
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </svg>
        {/* center */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 12,
            background: "var(--qa-bg-card)",
            backdropFilter: "blur(20px)",
            boxShadow: `inset 0 0 30px rgba(${tone.glow},0.12)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[2.4rem] font-black leading-none"
            style={{
              color: tone.color,
              textShadow: `0 0 20px rgba(${tone.glow},0.9), 0 0 40px rgba(${tone.glow},0.4)`,
            }}
          >
            {score}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-[0.18em] mt-0.5"
            style={{ color: tone.color }}
          >
            {tone.label}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   MetricCard
───────────────────────────────────────────────────────── */
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
  accent: string;
  delay?: number;
}> = ({ icon, label, value, helper, accent, delay = 0 }) => (
  /* ── Holographic conic metallic card (like Image 1) ── */
  <div
    className="relative group/mc ai-card-in overflow-hidden"
    style={{
      borderRadius: 20,
      padding: 2,
      animationDelay: `${delay}ms`,
      boxShadow: `0 0 26px ${accent}45, 0 0 55px ${accent}12, 0 6px 36px rgba(0,0,0,0.65)`,
      transition: "box-shadow 0.35s ease, transform 0.3s ease",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform =
        "translateY(-5px) scale(1.015)";
      (e.currentTarget as HTMLDivElement).style.boxShadow =
        `0 0 50px ${accent}75, 0 0 100px ${accent}35, 0 12px 48px rgba(0,0,0,0.85)`;
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = "";
      (e.currentTarget as HTMLDivElement).style.boxShadow =
        `0 0 26px ${accent}45, 0 0 55px ${accent}12, 0 6px 36px rgba(0,0,0,0.65)`;
    }}
  >
    {/* always-spinning rainbow border */}
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ borderRadius: 20, pointerEvents: "none" }}
    >
      <div
        className="neon-border-spin-el aurora-el absolute"
        style={{ inset: "-110%", background: RB }}
      />
    </div>

    {/* card body — adapts to current theme */}
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 18,
        background: "var(--qa-bg-card)",
        backdropFilter: "blur(28px)",
      }}
    >
      {/* accent radial bloom */}
      <div
        className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none glow-breathe"
        style={{
          background: `radial-gradient(circle, ${accent}35 0%, transparent 70%)`,
          filter: "blur(18px)",
        }}
      />
      {/* bottom glow */}
      <div
        className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
          filter: "blur(16px)",
        }}
      />
      {/* dot-grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative p-5">
        {/* icon bubble with live-dot */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${accent}30, ${accent}12)`,
              border: `1.5px solid ${accent}60`,
              color: accent,
              boxShadow: `0 0 28px ${accent}50, inset 0 0 14px ${accent}12`,
            }}
          >
            {icon}
          </div>
          {/* live-status dot */}
          <div className="relative mt-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            <div
              className="dot-ping absolute inset-0 rounded-full"
              style={{ background: accent }}
            />
          </div>
        </div>

        {/* label */}
        <div
          className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
          style={{ color: TS }}
        >
          {label}
        </div>

        {/* value */}
        <div
          className="font-black leading-none mb-2"
          style={{
            fontSize: "clamp(1.7rem,3.5vw,2.3rem)",
            background: `linear-gradient(120deg, #ffffff 0%, ${accent} 55%, #ffffff 100%)`,
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontVariantNumeric: "tabular-nums",
            animation: `number-count 0.65s cubic-bezier(0.22,1,0.36,1) both, text-shimmer 3s linear infinite`,
            animationDelay: `${delay}ms, 0ms`,
          }}
        >
          {value}
        </div>

        {/* helper */}
        <div className="text-[11px] leading-relaxed" style={{ color: TM }}>
          {helper}
        </div>

        {/* bottom accent bar */}
        <div
          className="absolute bottom-0 left-5 right-5 h-px rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}70, transparent)`,
          }}
        />
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   ActionCard
───────────────────────────────────────────────────────── */
const ActionCard: React.FC<{ action: AIImmediateAction; delay?: number }> = ({
  action,
  delay = 0,
}) => {
  const s = SEV[action.severity] ?? SEV.Medium;
  const g = `rgba(${s.glow},`;
  return (
    <NeonCard
      accent={s.text}
      rainbow={false}
      delay={delay}
      borderPx={2}
      speed="normal"
    >
      <div className="p-5">
        {/* header row */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              color: s.text,
              boxShadow: `0 0 12px ${g}0.3)`,
            }}
          >
            <Flame size={10} />
            {action.severity}
          </span>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: s.bg, color: s.text }}
          >
            <AlertTriangle size={14} />
          </div>
        </div>

        {/* issue */}
        <div
          className="font-bold text-[13.5px] leading-snug mb-2"
          style={{ color: T }}
        >
          {action.issue}
        </div>
        <div
          className="text-[12.5px] leading-relaxed mb-3"
          style={{ color: TM }}
        >
          {action.action}
        </div>

        {/* impact chip */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
          style={{
            background: `${g}0.07)`,
            border: `1px solid ${g}0.22)`,
            color: s.text,
          }}
        >
          <TrendingUp size={11} className="flex-shrink-0" />
          {action.expectedImpact}
        </div>
      </div>
    </NeonCard>
  );
};

/* ─────────────────────────────────────────────────────────
   RiskCard
───────────────────────────────────────────────────────── */
const RiskCard: React.FC<{ risk: AIRiskPrediction; delay?: number }> = ({
  risk,
  delay = 0,
}) => {
  const s = SEV[risk.probability] ?? SEV.Medium;
  const pct = PROB_PCT[risk.probability] ?? 50;
  return (
    <NeonCard accent={s.text} rainbow={false} delay={delay} borderPx={2}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className="font-bold text-[13.5px] leading-snug"
            style={{ color: T }}
          >
            {risk.risk}
          </div>
          <span
            className="flex-shrink-0 text-[11px] font-black px-2.5 py-0.5 rounded-full"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              color: s.text,
            }}
          >
            {risk.probability}
          </span>
        </div>

        {/* probability bar */}
        <div
          className="relative h-2 rounded-full mb-3 overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${s.text}80, ${s.text})`,
              boxShadow: `0 0 10px rgba(${s.glow},0.8)`,
            }}
          />
        </div>

        <div
          className="text-[12.5px] leading-relaxed mb-2"
          style={{ color: TM }}
        >
          {risk.impact}
        </div>
        <div className="text-xs mb-3" style={{ color: TS }}>
          {risk.prediction}
        </div>

        <div
          className="text-xs px-3 py-2 rounded-xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: TM,
          }}
        >
          <span className="font-bold" style={{ color: T }}>
            Mitigation:{" "}
          </span>
          {risk.mitigation}
        </div>
      </div>
    </NeonCard>
  );
};

/* ─────────────────────────────────────────────────────────
   TipCard
───────────────────────────────────────────────────────── */
const TipCard: React.FC<{ tip: AIOptimizationTip; index: number }> = ({
  tip,
  index,
}) => {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <NeonCard accent={accent} rainbow={false} delay={index * 80} borderPx={2}>
      <div className="p-5">
        <div
          className="inline-flex items-center justify-center w-11 h-11 rounded-2xl mb-3"
          style={{
            background: `linear-gradient(135deg, ${accent}25, ${accent}08)`,
            border: `1px solid ${accent}45`,
            color: accent,
            boxShadow: `0 0 20px ${accent}40`,
          }}
        >
          <Lightbulb size={19} />
        </div>

        <div
          className="font-extrabold text-sm mb-1"
          style={{
            background: `linear-gradient(120deg, #fff 40%, ${accent})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {tip.area}
        </div>
        <div
          className="text-[12.5px] leading-relaxed mb-2"
          style={{ color: TM }}
        >
          {tip.issue}
        </div>
        <div className="text-xs mb-3" style={{ color: TS }}>
          {tip.recommendation}
        </div>

        <span
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
          style={{
            background: `${accent}18`,
            border: `1px solid ${accent}45`,
            color: accent,
            boxShadow: `0 0 14px ${accent}30`,
          }}
        >
          <TrendingUp size={11} />
          {tip.expectedGain}
        </span>
      </div>
    </NeonCard>
  );
};

/* ─────────────────────────────────────────────────────────
   FixCard
───────────────────────────────────────────────────────── */
const FixCard: React.FC<{ fix: AIPrioritizedFix; delay?: number }> = ({
  fix,
  delay = 0,
}) => (
  <NeonCard accent="#8b5cf6" rainbow={false} delay={delay} borderPx={2}>
    <div className="p-5">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-black"
          style={{
            background: "linear-gradient(135deg,#8b5cf6,#6366f1,#a855f7)",
            color: "#fff",
            boxShadow:
              "0 0 22px rgba(139,92,246,0.7), 0 0 8px rgba(139,92,246,0.4)",
          }}
        >
          {fix.priorityRank}
        </div>
        <div
          className="font-bold text-[13.5px] leading-snug"
          style={{ color: T }}
        >
          {fix.fix}
        </div>
      </div>
      <div className="text-[12.5px] leading-relaxed mb-3" style={{ color: TM }}>
        {fix.reason}
      </div>
      <div
        className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl"
        style={{
          background: "rgba(139,92,246,0.1)",
          border: "1px solid rgba(139,92,246,0.28)",
          color: "#a78bfa",
          boxShadow: "0 0 12px rgba(139,92,246,0.15)",
        }}
      >
        <Target size={11} />
        {fix.expectedImpact}
      </div>
    </div>
  </NeonCard>
);

/* ─────────────────────────────────────────────────────────
   ResourceList
───────────────────────────────────────────────────────── */
const ResourceList: React.FC<{
  title: string;
  emptyText: string;
  accent: string;
  items: {
    name: string;
    utilizationPercentage: number;
    summary: string;
    recommendation: string;
  }[];
  delay?: number;
}> = ({ title, emptyText, accent, items, delay = 0 }) => (
  <NeonCard accent={accent} rainbow={false} delay={delay} borderPx={2}>
    <div className="p-5">
      <div
        className="font-extrabold text-sm mb-4"
        style={{
          background: `linear-gradient(120deg, #fff 40%, ${accent})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: TS }}>
          {emptyText}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl p-3.5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm" style={{ color: T }}>
                  {item.name}
                </span>
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{
                    background: `${accent}18`,
                    border: `1px solid ${accent}45`,
                    color: accent,
                  }}
                >
                  {item.utilizationPercentage}%
                </span>
              </div>
              <div
                className="relative h-1.5 rounded-full mb-2 overflow-hidden"
                style={{ background: "var(--surface)" }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(item.utilizationPercentage, 100)}%`,
                    background: accent,
                    boxShadow: `0 0 8px ${accent}`,
                  }}
                />
              </div>
              <div className="text-xs mb-1" style={{ color: TM }}>
                {item.summary}
              </div>
              <div className="text-xs" style={{ color: TS }}>
                {item.recommendation}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </NeonCard>
);

/* ═══════════════════════════════════════════════════════════
   Main
═══════════════════════════════════════════════════════════ */
const AIRecommendations: React.FC = () => {
  const { data: analysis, isLoading } = useAIRecommendations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-56">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid rgba(139,92,246,0.1)" }}
            />
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{ padding: 2 }}
            >
              <div
                className="neon-border-spin-el-fast aurora-el absolute"
                style={{ inset: "-110%", background: RB }}
              />
            </div>
            <div
              className="absolute rounded-full"
              style={{ inset: 2, background: "var(--qa-bg-card)" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Bot size={22} style={{ color: "#8b5cf6" }} />
            </div>
          </div>
          <span className="text-sm font-semibold" style={{ color: TS }}>
            Generating AI insights…
          </span>
        </div>
      </div>
    );
  }

<<<<<<< HEAD
  if (error) {
    const errMsg = typeof error === "string" ? error : (error && (error as any).message) || String(error);
    return <Alert type="error" message="Failed to generate AI analysis" description={errMsg} />;
  }

=======
>>>>>>> 391d805795128e1f658368265e082735c34f0620
  if (!analysis) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{
          background: "rgba(139,92,246,0.07)",
          border: "1px solid rgba(139,92,246,0.2)",
          color: "#a78bfa",
        }}
      >
        <Bot size={18} />
        <span className="text-sm font-medium">
          AI analysis will appear after project data is loaded.
        </span>
      </div>
    );
  }

  const tone = scoreTone(analysis.projectHealthScore);

  return (
    <div className="flex flex-col gap-8">
      {/* ══════════════════════════════════ HERO ══════════════ */}
      <div
        className="relative overflow-hidden rounded-[22px] ai-card-in"
        style={{
          padding: 3,
          animationDelay: "0ms",
          boxShadow:
            "0 0 40px rgba(139,92,246,0.35), 0 0 80px rgba(139,92,246,0.12), 0 8px 48px rgba(0,0,0,0.7)",
        }}
      >
        {/* thick rainbow spinning border */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ borderRadius: 22 }}
        >
          <div
            className="neon-border-spin-el-slow aurora-el absolute"
            style={{ inset: "-110%", background: RB, opacity: 0.85 }}
          />
        </div>

        {/* card body */}
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 19,
            background: "var(--qa-bg-card)",
            backdropFilter: "blur(32px)",
          }}
        >
          {/* large purple orb */}
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none orb-float"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.28) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          {/* cyan accent orb */}
          <div
            className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(6,214,160,0.12) 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          {/* dot grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />

          <div className="relative p-6">
            <div className="flex flex-wrap items-start gap-6">
              {/* left */}
              <div className="flex-1 min-w-[260px]">
                {/* pills */}
                <div className="flex items-center flex-wrap gap-2 mb-4">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-xl"
                    style={{
                      background: "rgba(139,92,246,0.22)",
                      border: "1px solid rgba(139,92,246,0.4)",
                      color: "#c4b5fd",
                      boxShadow: "0 0 18px rgba(139,92,246,0.4)",
                    }}
                  >
                    <Bot size={17} />
                  </div>
                  {[
                    {
                      label: "AI Analysis",
                      col: "#38bdf8",
                      bg: "rgba(56,189,248,0.1)",
                      bd: "rgba(56,189,248,0.3)",
                    },
                    {
                      label: analysis.projectKey,
                      col: "#a78bfa",
                      bg: "rgba(167,139,250,0.1)",
                      bd: "rgba(167,139,250,0.3)",
                    },
                    {
                      label: analysis.timeRangeLabel,
                      col: "var(--text-muted)",
                      bg: "var(--surface)",
                      bd: "var(--border)",
                    },
                  ].map((p) => (
                    <span
                      key={p.label}
                      className="text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{
                        background: p.bg,
                        border: `1px solid ${p.bd}`,
                        color: p.col,
                      }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>

                {/* headline */}
                <h2
                  className="font-black leading-tight mb-3"
                  style={{
                    fontSize: "clamp(1.2rem,3vw,1.65rem)",
                    background:
                      "linear-gradient(120deg, #e2e8f0 0%, #c4b5fd 40%, #38bdf8 100%)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    animation: "text-shimmer 5s linear infinite",
                  }}
                >
                  {analysis.aiRecommendation.headline}
                </h2>

                <p
                  className="text-[13.5px] leading-relaxed mb-4"
                  style={{ color: TM }}
                >
                  {analysis.executiveSummary}
                </p>

                {/* footer chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      icon: <Activity size={11} />,
                      label: `Sprint: ${analysis.sprintName || "—"}`,
                    },
                    {
                      icon: <TrendingUp size={11} />,
                      label: `Impact ${analysis.aiRecommendation.impactPercentage}%`,
                    },
                    {
                      icon: <CheckCircle2 size={11} />,
                      label: `${analysis.aiRecommendation.confidence} confidence`,
                    },
                  ].map((c) => (
                    <span
                      key={c.label}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: TM,
                      }}
                    >
                      {c.icon}
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* right: health circle */}
              <div className="flex flex-col items-center gap-2">
                <HealthCircle score={analysis.projectHealthScore} />
                <span className="text-[11px] font-medium" style={{ color: TS }}>
                  Project Health Score
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════ METRIC CARDS ══════════ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity size={20} />}
          label="Completion Rate"
          value={`${Math.round(analysis.metricsSnapshot.completionRate)}%`}
          helper={`${analysis.metricsSnapshot.resolvedInRange} resolved · ${analysis.metricsSnapshot.createdInRange} created`}
          accent="#06d6a0"
          delay={60}
        />
        <MetricCard
          icon={<Zap size={20} />}
          label="Sprint Velocity"
          value={
            analysis.metricsSnapshot.sprintVelocity ||
            analysis.metricsSnapshot.resolvedInRange
          }
          helper="Resolved story points / items"
          accent="#8b5cf6"
          delay={120}
        />
        <MetricCard
          icon={<Clock size={20} />}
          label="Cycle Time"
          value={`${Math.round(analysis.metricsSnapshot.cycleTimeHours)}h`}
          helper="Avg created-to-resolved"
          accent="#3a86ff"
          delay={180}
        />
        <MetricCard
          icon={<RotateCcw size={20} />}
          label="Reopened / Overdue"
          value={`${analysis.metricsSnapshot.reopenedIssues} / ${analysis.metricsSnapshot.overdueTasks}`}
          helper="Repeat failures & due-date breaches"
          accent="#ffbe0b"
          delay={240}
        />
      </div>

      {/* ══════════════════════════ SUMMARY + KPI ════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5">
        <NeonCard accent="#6366f1" rainbow={false} delay={80} borderPx={2}>
          <div className="p-5">
            <SHead
              icon={<BarChart3 size={16} />}
              title="Executive Summary"
              accent="#818cf8"
            />
            <p
              className="text-[13.5px] leading-relaxed mb-4"
              style={{ color: TM }}
            >
              {analysis.executiveSummary}
            </p>
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: "rgba(99,102,241,0.08)",
                border: "1px solid rgba(99,102,241,0.22)",
              }}
            >
              <TrendingUp
                size={16}
                style={{ color: "#818cf8", flexShrink: 0 }}
              />
              <div className="flex-1">
                <div
                  className="font-semibold text-sm mb-0.5"
                  style={{ color: T }}
                >
                  {analysis.aiRecommendation.headline}
                </div>
                <div className="text-xs" style={{ color: TS }}>
                  Impact {analysis.aiRecommendation.impactPercentage}% ·{" "}
                  {analysis.aiRecommendation.confidence} confidence
                </div>
              </div>
              <ChevronRight size={15} style={{ color: TS }} />
            </div>
          </div>
        </NeonCard>

        <NeonCard accent="#f59e0b" rainbow={false} delay={120} borderPx={2}>
          <div className="p-5">
            <SHead
              icon={<Bug size={16} />}
              title="KPI Insight"
              accent="#fbbf24"
            />
            {analysis.kpiInsights.storyWithMaxBugs ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-black px-2.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(248,113,113,0.12)",
                      border: "1px solid rgba(248,113,113,0.3)",
                      color: "#f87171",
                    }}
                  >
                    Top Defect Cluster
                  </span>
                  <span className="font-black text-xl" style={{ color: T }}>
                    {analysis.kpiInsights.storyWithMaxBugs.bugCount} bugs
                  </span>
                </div>
                <div className="font-bold text-sm mb-2" style={{ color: T }}>
                  {analysis.kpiInsights.storyWithMaxBugs.storyId}
                </div>
                <div
                  className="text-[13px] leading-relaxed mb-2"
                  style={{ color: TM }}
                >
                  {analysis.kpiInsights.storyWithMaxBugs.rootCause}
                </div>
                <div className="text-xs mb-3" style={{ color: TS }}>
                  {analysis.kpiInsights.storyWithMaxBugs.recommendation}
                </div>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(251,191,36,0.12)",
                    border: "1px solid rgba(251,191,36,0.3)",
                    color: "#fbbf24",
                    boxShadow: "0 0 12px rgba(251,191,36,0.2)",
                  }}
                >
                  <Target size={11} />
                  {analysis.kpiInsights.storyWithMaxBugs.expectedImpact}
                </span>
              </>
            ) : (
              <p className="text-xs" style={{ color: TS }}>
                No concentrated bug story was detected in the current analysis
                window.
              </p>
            )}
            </div>
            </NeonCard>
            </div>
   

      {/* ══════════════════════════ IMMEDIATE ACTIONS ════════ */}
      <div>
        <SHead
          icon={<AlertTriangle size={16} />}
          title="Immediate Actions"
          accent="#f87171"
          count={analysis.aiInsightsPanel.immediateActions.length}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {analysis.aiInsightsPanel.immediateActions.map((a, i) => (
            <ActionCard key={a.issue} action={a} delay={i * 70} />
          ))}
        </div>
      </div>

      {/* ══════════════════════════ RISKS ════════════════════ */}
      <div>
        <SHead
          icon={<Shield size={16} />}
          title="Risks & Predictions"
          accent="#f87171"
          count={analysis.aiInsightsPanel.risksAndPredictions.length}
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {analysis.aiInsightsPanel.risksAndPredictions.map((r, i) => (
            <RiskCard key={r.risk} risk={r} delay={i * 80} />
          ))}
        </div>
      </div>

      {/* ══════════════════════════ RESOURCES ════════════════ */}
      <div>
        <SHead
          icon={<Users size={16} />}
          title="Resource Suggestions"
          accent="#38bdf8"
        />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ResourceList
            title="⚠ Overutilized Resources"
            accent="#f87171"
            delay={60}
            emptyText="No owner materially above team-average load."
            items={analysis.aiInsightsPanel.resourceSuggestions.overutilizedResources.map(
              (r) => ({
                name: r.name,
                utilizationPercentage: r.utilizationPercentage,
                summary: r.risk,
                recommendation: r.recommendation,
              }),
            )}
          />
          <ResourceList
            title="✅ Underutilized Resources"
            accent="#06d6a0"
            delay={120}
            emptyText="No meaningful spare capacity signal detected."
            items={analysis.aiInsightsPanel.resourceSuggestions.underutilizedResources.map(
              (r) => ({
                name: r.name,
                utilizationPercentage: r.utilizationPercentage,
                summary: r.opportunity,
                recommendation: r.recommendation,
              }),
            )}
          />
        </div>
      </div>

      {/* ══════════════════════════ TIPS ═════════════════════ */}
      <div>
        <SHead
          icon={<Cpu size={16} />}
          title="Optimization Tips"
          accent="#06d6a0"
          count={analysis.aiInsightsPanel.optimizationTips.length}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {analysis.aiInsightsPanel.optimizationTips.map((tip, i) => (
            <TipCard key={tip.area} tip={tip} index={i} />
          ))}
        </div>
      </div>

      {/* ══════════════════════════ RESOURCE OPT RECS ════════ */}
      {analysis.resourceOptimizationRecommendations.length > 0 && (
        <div>
          <SHead
            icon={<GitBranch size={16} />}
            title="Resource Optimization"
            accent="#3a86ff"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.resourceOptimizationRecommendations.map((item, i) => (
              <NeonCard
                key={item.problem}
                accent="#3a86ff"
                rainbow={false}
                delay={i * 80}
                borderPx={2}
              >
                <div className="p-5">
                  <div
                    className="font-bold text-[13.5px] mb-2"
                    style={{ color: T }}
                  >
                    {item.problem}
                  </div>
                  <div
                    className="text-[12.5px] leading-relaxed mb-2"
                    style={{ color: TM }}
                  >
                    {item.currentState}
                  </div>
                  <div className="text-xs mb-3" style={{ color: TS }}>
                    {item.recommendedAction}
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(58,134,255,0.12)",
                      border: "1px solid rgba(58,134,255,0.3)",
                      color: "#60a5fa",
                      boxShadow: "0 0 12px rgba(58,134,255,0.2)",
                    }}
                  >
                    <ArrowRight size={11} />
                    {item.expectedOutcome}
                  </span>
                </div>
              </NeonCard>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════ PRIORITIZED FIXES ════════ */}
      <div>
        <SHead
          icon={<Target size={16} />}
          title="Prioritized Fixes"
          accent="#a78bfa"
          count={analysis.prioritizedFixes.length}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analysis.prioritizedFixes.map((fix, i) => (
            <FixCard
              key={`${fix.priorityRank}-${fix.fix}`}
              fix={fix}
              delay={i * 60}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIRecommendations;
