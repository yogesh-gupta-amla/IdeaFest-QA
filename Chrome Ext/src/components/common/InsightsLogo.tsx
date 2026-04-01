import React, { useState } from "react";

interface InsightsLogoProps {
  size?: number;
}

export default function InsightsLogo({ size = 40 }: InsightsLogoProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        transform: hovered
          ? "scale(1.12) rotate(6deg)"
          : "scale(1) rotate(0deg)",
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        display: "block",
        flexShrink: 0,
      }}
    >
      <defs>
        <radialGradient id="iaiGradBg" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <radialGradient id="iaiGradEye" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </radialGradient>
        <filter id="iaiGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="iaiSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <style>{`
          @keyframes iai-pulse {
            0%, 100% { opacity: 0.45; }
            50% { opacity: 0.08; }
          }
          @keyframes iai-blink {
            0%, 88%, 100% { transform: scaleY(1); transform-origin: 50px 50px; }
            92% { transform: scaleY(0.08); transform-origin: 50px 50px; }
          }
          @keyframes iai-spin-slow {
            from { transform: rotate(0deg); transform-origin: 50px 50px; }
            to   { transform: rotate(360deg); transform-origin: 50px 50px; }
          }
          @keyframes iai-spin-rev {
            from { transform: rotate(0deg); transform-origin: 50px 50px; }
            to   { transform: rotate(-360deg); transform-origin: 50px 50px; }
          }
          @keyframes iai-dot {
            0%, 100% { opacity: 0.35; r: 2.5; }
            50%       { opacity: 1;    r: 3.5; }
          }
          @keyframes iai-streak {
            0%   { stroke-dashoffset: 60; opacity: 0; }
            30%  { opacity: 0.6; }
            100% { stroke-dashoffset: 0; opacity: 0; }
          }
          .iai-ring1 { animation: iai-pulse 2.8s ease-in-out infinite; }
          .iai-ring2 { animation: iai-pulse 2.8s ease-in-out infinite 1.4s; }
          .iai-blink   { animation: iai-blink 5s ease-in-out infinite; }
          .iai-orbit1  { animation: iai-spin-slow 9s linear infinite; }
          .iai-orbit2  { animation: iai-spin-rev  13s linear infinite; }
          .iai-d1 { animation: iai-dot 2s   ease-in-out infinite 0s;    }
          .iai-d2 { animation: iai-dot 2s   ease-in-out infinite 0.33s; }
          .iai-d3 { animation: iai-dot 2s   ease-in-out infinite 0.66s; }
          .iai-d4 { animation: iai-dot 2s   ease-in-out infinite 1s;    }
          .iai-d5 { animation: iai-dot 2s   ease-in-out infinite 1.3s;  }
          .iai-d6 { animation: iai-dot 2s   ease-in-out infinite 1.6s;  }
        `}</style>
      </defs>

      {/* ── Outer pulsing rings ── */}
      <circle
        className="iai-ring1"
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke="#818cf8"
        strokeWidth="1"
      />
      <circle
        className="iai-ring2"
        cx="50"
        cy="50"
        r="44"
        fill="none"
        stroke="#60a5fa"
        strokeWidth="0.6"
      />

      {/* ── Main circle ── */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="url(#iaiGradBg)"
        filter="url(#iaiGlow)"
      />
      {/* Inner vignette */}
      <circle cx="50" cy="50" r="40" fill="rgba(0,0,0,0.18)" />

      {/* ── Orbit 1: 6 neural nodes on a ring r=34 ── */}
      <g className="iai-orbit1">
        {/* Nodes at 0°,60°,120°,180°,240°,300° on r=34 */}
        <circle className="iai-d1" cx="84" cy="50" r="2.8" fill="#bae6fd" />
        <circle className="iai-d2" cx="67" cy="79.4" r="2.8" fill="#a5b4fc" />
        <circle className="iai-d3" cx="33" cy="79.4" r="2.8" fill="#bae6fd" />
        <circle className="iai-d4" cx="16" cy="50" r="2.8" fill="#a5b4fc" />
        <circle className="iai-d5" cx="33" cy="20.6" r="2.8" fill="#bae6fd" />
        <circle className="iai-d6" cx="67" cy="20.6" r="2.8" fill="#a5b4fc" />
        {/* Hexagon outline connecting nodes */}
        <polygon
          points="84,50 67,79.4 33,79.4 16,50 33,20.6 67,20.6"
          fill="none"
          stroke="#c7d2fe"
          strokeWidth="0.5"
          opacity="0.35"
        />
      </g>

      {/* ── Orbit 2: 3 tiny sparkle dots on r=26, counter-rotating ── */}
      <g className="iai-orbit2">
        <circle cx="76" cy="50" r="1.8" fill="#f0abfc" opacity="0.7" />
        <circle cx="37" cy="74.2" r="1.8" fill="#f0abfc" opacity="0.7" />
        <circle cx="37" cy="25.8" r="1.8" fill="#f0abfc" opacity="0.7" />
      </g>

      {/* ── Eye (the "insight" symbol) ── */}
      <g className="iai-blink">
        {/* Eye white area */}
        <path
          d="M 18 50 Q 34 34 50 34 Q 66 34 82 50 Q 66 66 50 66 Q 34 66 18 50 Z"
          fill="rgba(255,255,255,0.14)"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="1.2"
        />
        {/* Iris glow */}
        <circle
          cx="50"
          cy="50"
          r="11"
          fill="url(#iaiGradEye)"
          opacity="0.9"
          filter="url(#iaiSoftGlow)"
        />
        {/* Pupil */}
        <circle cx="50" cy="50" r="6.5" fill="#1e1b4b" />
        {/* Highlight dot */}
        <circle cx="47.5" cy="47.5" r="2" fill="white" opacity="0.85" />
        {/* Tiny inner shimmer */}
        <circle cx="53" cy="52" r="1" fill="white" opacity="0.35" />
      </g>

      {/* ── AI sparkle cross (center, subtle) ── */}
      <g opacity={hovered ? 0.9 : 0.5} style={{ transition: "opacity 0.3s" }}>
        <line
          x1="50"
          y1="25"
          x2="50"
          y2="21"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="50"
          y1="75"
          x2="50"
          y2="79"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="25"
          y1="50"
          x2="21"
          y2="50"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="75"
          y1="50"
          x2="79"
          y2="50"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="32"
          y1="32"
          x2="29"
          y2="29"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <line
          x1="68"
          y1="68"
          x2="71"
          y2="71"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <line
          x1="68"
          y1="32"
          x2="71"
          y2="29"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <line
          x1="32"
          y1="68"
          x2="29"
          y2="71"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
