import React, { useState } from "react";
import { useDashboardStore } from "../../store/useStore";

interface InsightsLogoProps {
  size?: number;
}

/** Theme IDs whose background is dark. The .jfif logo has a white matte, so we
 *  pick the blend mode that turns the matte transparent for that surface:
 *  - light surface → `multiply` drops the white
 *  - dark surface  → `screen` drops the dark logo edges into the dark page */
const DARK_THEME_IDS = new Set([
  "dark-pro",
  "ocean-blue",
  "cyberpunk",
  "midnight",
  "matrix",
]);

export default function InsightsLogo({ size = 40 }: InsightsLogoProps) {
  const [hovered, setHovered] = useState(false);
  const themeId = useDashboardStore((s) => s.themeId);
  const blendMode = DARK_THEME_IDS.has(themeId) ? "screen" : "multiply";

  return (
    <img
      src="/logo.jfif"
      alt="InSights AI"
      width={size}
      height={size}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        background: "transparent",
        mixBlendMode: blendMode,
        cursor: "pointer",
        transform: hovered
          ? "scale(1.08) rotate(4deg)"
          : "scale(1) rotate(0deg)",
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}
