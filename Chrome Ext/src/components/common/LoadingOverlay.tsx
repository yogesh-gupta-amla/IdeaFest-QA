import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface LoadingOverlayProps {
  visible: boolean;
  text: string;
}

const GEARS = [
  {
    x: 90,
    y: 100,
    r: 50,
    teeth: 12,
    color: "#e94560",
    dir: "cw" as const,
    speed: 3,
  },
  {
    x: 175,
    y: 75,
    r: 35,
    teeth: 9,
    color: "#ffb830",
    dir: "ccw" as const,
    speed: 2.1,
  },
  {
    x: 240,
    y: 110,
    r: 45,
    teeth: 11,
    color: "#00d2ff",
    dir: "cw" as const,
    speed: 2.65,
  },
  {
    x: 155,
    y: 145,
    r: 25,
    teeth: 7,
    color: "#ff6b9d",
    dir: "ccw" as const,
    speed: 1.5,
  },
];

const BASE_W = 350;
const BASE_H = 320;

interface SteamParticle {
  id: number;
  left: number;
  top: number;
  drift: number;
  duration: number;
  size: number;
  alpha: number;
}

function buildGearPath(
  r: number,
  teeth: number,
  cx: number,
  cy: number,
): string {
  const toothHeight = r * 0.2;
  const innerR = r - toothHeight;
  const outerR = r + toothHeight;
  const angleStep = (Math.PI * 2) / teeth;
  let d = "";
  for (let i = 0; i < teeth; i++) {
    const a1 = i * angleStep;
    const a2 = a1 + angleStep * 0.15;
    const a3 = a1 + angleStep * 0.35;
    const a4 = a1 + angleStep * 0.5;
    const a5 = a1 + angleStep * 0.65;
    const a6 = a1 + angleStep * 0.85;
    const pts = [
      [cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR],
      [cx + Math.cos(a2) * innerR, cy + Math.sin(a2) * innerR],
      [cx + Math.cos(a3) * outerR, cy + Math.sin(a3) * outerR],
      [cx + Math.cos(a4) * outerR, cy + Math.sin(a4) * outerR],
      [cx + Math.cos(a5) * outerR, cy + Math.sin(a5) * outerR],
      [cx + Math.cos(a6) * innerR, cy + Math.sin(a6) * innerR],
    ];
    if (i === 0) d += `M ${pts[0][0]} ${pts[0][1]} `;
    pts.slice(1).forEach((p) => {
      d += `L ${p[0]} ${p[1]} `;
    });
  }
  return d + "Z";
}

export default function LoadingOverlay({ visible, text }: LoadingOverlayProps) {
  const [steam, setSteam] = useState<SteamParticle[]>([]);
  const [scale, setScale] = useState(1);
  const counterRef = useRef(0);

  const gearData = useMemo(
    () =>
      GEARS.map((g) => {
        const toothHeight = g.r * 0.2;
        const outerR = g.r + toothHeight;
        const svgSize = (outerR + 4) * 2;
        const cx = svgSize / 2;
        const cy = svgSize / 2;
        return {
          ...g,
          svgSize,
          cx,
          cy,
          holeR: g.r * 0.25,
          pathData: buildGearPath(g.r, g.teeth, cx, cy),
        };
      }),
    [],
  );

  const fitToWindow = useCallback(() => {
    const sx = window.innerWidth / BASE_W;
    const sy = window.innerHeight / BASE_H;
    setScale(Math.min(sx, sy, 3) * 0.85);
  }, []);

  useEffect(() => {
    if (!visible) return;
    fitToWindow();
    window.addEventListener("resize", fitToWindow);
    return () => window.removeEventListener("resize", fitToWindow);
  }, [visible, fitToWindow]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      const g = GEARS[Math.floor(Math.random() * GEARS.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = g.r * 0.6;
      const id = ++counterRef.current;
      const particle: SteamParticle = {
        id,
        left: g.x + Math.cos(angle) * dist,
        top: g.y + Math.sin(angle) * dist,
        drift: Math.random() * 30 - 15,
        duration: 1.5 + Math.random(),
        size: 2 + Math.random() * 3,
        alpha: 0.2 + Math.random() * 0.3,
      };
      setSteam((prev) => [...prev, particle]);
      setTimeout(
        () => setSteam((prev) => prev.filter((p) => p.id !== id)),
        2500,
      );
    }, 200);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="gear-system" style={{ transform: `scale(${scale})` }}>
        {gearData.map((g, i) => (
          <div
            key={i}
            className="gear-wrapper"
            style={{
              left: g.x - g.svgSize / 2,
              top: g.y - g.svgSize / 2,
              width: g.svgSize,
              height: g.svgSize,
              ["--gear-color" as string]: g.color,
            }}
          >
            <div
              className="gear-glow"
              style={{
                animation: `${g.dir === "cw" ? "rotateCW" : "rotateCCW"} ${g.speed}s linear infinite`,
                transformOrigin: "50% 50%",
              }}
            >
              <svg
                width={g.svgSize}
                height={g.svgSize}
                viewBox={`0 0 ${g.svgSize} ${g.svgSize}`}
              >
                <path
                  d={g.pathData}
                  fill="none"
                  stroke={g.color}
                  strokeWidth="2"
                  opacity="0.9"
                />
                <circle
                  cx={g.cx}
                  cy={g.cy}
                  r={g.holeR}
                  fill="none"
                  stroke={g.color}
                  strokeWidth="2"
                  opacity="0.7"
                />
                <circle
                  cx={g.cx}
                  cy={g.cy}
                  r={g.r * 0.08}
                  fill={g.color}
                  opacity="0.8"
                />
                {/* spokes */}
                <line
                  x1={g.cx}
                  y1={g.cy - g.holeR}
                  x2={g.cx}
                  y2={g.cy - g.r * 0.6}
                  stroke={g.color}
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1={g.cx}
                  y1={g.cy + g.holeR}
                  x2={g.cx}
                  y2={g.cy + g.r * 0.6}
                  stroke={g.color}
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1={g.cx - g.holeR}
                  y1={g.cy}
                  x2={g.cx - g.r * 0.6}
                  y2={g.cy}
                  stroke={g.color}
                  strokeWidth="1.5"
                  opacity="0.4"
                />
                <line
                  x1={g.cx + g.holeR}
                  y1={g.cy}
                  x2={g.cx + g.r * 0.6}
                  y2={g.cy}
                  stroke={g.color}
                  strokeWidth="1.5"
                  opacity="0.4"
                />
              </svg>
            </div>
          </div>
        ))}

        {steam.map((p) => (
          <div
            key={p.id}
            className="steam"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: `rgba(255,255,255,${p.alpha})`,
              animationDuration: `${p.duration}s`,
              ["--drift" as string]: `${p.drift}px`,
            }}
          />
        ))}

        <div className="loading-bar-container">
          <div className="loading-bar" />
        </div>

        <div className="loading-text">{text || "Processing"}</div>
      </div>
    </div>
  );
}
