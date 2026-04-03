import React from "react";

const RB =
  "conic-gradient(from 0deg, #ff006e, #8338ec, #3a86ff, #06d6a0, #ffbe0b, #f97316, #ff006e)";

export interface NeonCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  accent?: string;
  rainbow?: boolean;
  delay?: number;
  borderPx?: number;
  speed?: "slow" | "normal" | "fast";
  innerGlow?: boolean;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
}

const NeonCard: React.FC<NeonCardProps> = ({
  children,
  title,
  extra,
  accent = "var(--qa-accent, #8b5cf6)",
  rainbow = true,
  delay = 0,
  borderPx = 2,
  speed = "normal",
  innerGlow = true,
  className = "",
  style,
  bodyStyle,
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

  const outerR = 14;
  const innerR = outerR - borderPx;

  const accentVal = accent.startsWith("var(")
    ? "var(--qa-accent, #8b5cf6)"
    : accent;

  return (
    <div
      className={`relative group/nc ai-card-in ${className}`}
      style={{
        padding: borderPx,
        borderRadius: outerR,
        animationDelay: `${delay}ms`,
        boxShadow: `0 0 18px color-mix(in srgb, ${accentVal} 20%, transparent), 0 4px 28px rgba(0,0,0,0.45)`,
        transition: "box-shadow 0.35s ease, transform 0.3s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = `0 0 36px color-mix(in srgb, ${accentVal} 38%, transparent), 0 10px 44px rgba(0,0,0,0.65)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "";
        el.style.boxShadow = `0 0 18px color-mix(in srgb, ${accentVal} 20%, transparent), 0 4px 28px rgba(0,0,0,0.45)`;
      }}
    >
      {/* spinning rainbow/accent border */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ borderRadius: outerR }}
      >
        <div
          className={`${spinCls} aurora-el absolute`}
          style={{
            inset: "-110%",
            background: grad,
            opacity: rainbow ? 0.88 : 0.8,
          }}
        />
      </div>

      {/* inner card body */}
      <div
        className="relative h-full"
        style={{
          borderRadius: innerR,
          background: "var(--qa-bg-card)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          overflow: "hidden",
        }}
      >
        {/* top edge shimmer */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none overflow-hidden"
          style={{ borderRadius: "100% 100% 0 0" }}
        >
          <div
            className="absolute inset-y-0 w-1/3"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentVal}, transparent)`,
              animation: "stripe-slide 3.5s ease-in-out infinite",
              animationDelay: `${delay}ms`,
            }}
          />
        </div>

        {/* inner glow orb */}
        {innerGlow && (
          <div
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none orb-float glow-breathe"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${accentVal} 18%, transparent) 0%, transparent 70%)`,
              filter: "blur(18px)",
              animationDelay: `${delay}ms`,
            }}
          />
        )}

        {/* dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* card header — only rendered when title or extra provided */}
        {(title || extra) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderBottom: "1px solid var(--qa-border)",
              position: "relative",
              zIndex: 1,
            }}
          >
            {title && (
              <span
                style={{
                  color: "var(--qa-text-primary)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {title}
              </span>
            )}
            {extra && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {extra}
              </div>
            )}
          </div>
        )}

        {/* card content */}
        <div style={{ position: "relative", zIndex: 1, ...bodyStyle }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default NeonCard;
