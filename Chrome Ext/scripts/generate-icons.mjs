/**
 * Generates InSights Ai branded PNG icons using Node.js + Canvas API via
 * the built-in OffscreenCanvas (Node 18+) or falls back to a pure-JS approach.
 *
 * Run: node scripts/generate-icons.mjs
 */

import { createCanvas } from "canvas";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  // ── Background gradient ──────────────────────────────────
  const bgGrad = ctx.createRadialGradient(cx * 0.8, cy * 0.7, 0, cx, cy, r);
  bgGrad.addColorStop(0, "#60a5fa");
  bgGrad.addColorStop(0.55, "#6366f1");
  bgGrad.addColorStop(1, "#7c3aed");

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = bgGrad;
  ctx.shadowColor = "#6366f1";
  ctx.shadowBlur = size * 0.1;
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Inner dark vignette ──────────────────────────────────
  const vigGrad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  vigGrad.addColorStop(0, "rgba(0,0,0,0)");
  vigGrad.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = vigGrad;
  ctx.fill();

  // ── Neural hexagon ───────────────────────────────────────
  const hexR = r * 0.85;
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return { x: cx + hexR * Math.cos(a), y: cy + hexR * Math.sin(a) };
  });

  ctx.strokeStyle = "rgba(199,210,254,0.35)";
  ctx.lineWidth = size * 0.008;
  ctx.beginPath();
  nodes.forEach((n, i) =>
    i === 0 ? ctx.moveTo(n.x, n.y) : ctx.lineTo(n.x, n.y),
  );
  ctx.closePath();
  ctx.stroke();

  // Spoke lines to center
  nodes.forEach((n) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(n.x, n.y);
    ctx.strokeStyle = "rgba(199,210,254,0.18)";
    ctx.lineWidth = size * 0.005;
    ctx.stroke();
  });

  // Node dots
  nodes.forEach((n, i) => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, size * 0.028, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "#bae6fd" : "#a5b4fc";
    ctx.fill();
  });

  // ── Eye shape ────────────────────────────────────────────
  const eyeW = r * 0.75;
  const eyeH = r * 0.38;

  ctx.save();
  ctx.beginPath();
  // Upper arc
  ctx.moveTo(cx - eyeW, cy);
  ctx.bezierCurveTo(
    cx - eyeW * 0.4,
    cy - eyeH * 2,
    cx + eyeW * 0.4,
    cy - eyeH * 2,
    cx + eyeW,
    cy,
  );
  // Lower arc
  ctx.bezierCurveTo(
    cx + eyeW * 0.4,
    cy + eyeH * 2,
    cx - eyeW * 0.4,
    cy + eyeH * 2,
    cx - eyeW,
    cy,
  );
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = size * 0.012;
  ctx.stroke();
  ctx.restore();

  // Iris
  const irisGrad = ctx.createRadialGradient(cx, cy * 0.97, 0, cx, cy, r * 0.28);
  irisGrad.addColorStop(0, "#e0f2fe");
  irisGrad.addColorStop(1, "#7dd3fc");
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = irisGrad;
  ctx.shadowColor = "#7dd3fc";
  ctx.shadowBlur = size * 0.06;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Pupil
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.165, 0, Math.PI * 2);
  ctx.fillStyle = "#1e1b4b";
  ctx.fill();

  // Highlight
  ctx.beginPath();
  ctx.arc(cx - r * 0.06, cy - r * 0.06, r * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();

  // ── Sparkle cross ────────────────────────────────────────
  if (size >= 48) {
    const sp = r * 0.55;
    const spLen = r * 0.12;
    const lines = [
      [cx, cy - sp, cx, cy - sp - spLen],
      [cx, cy + sp, cx, cy + sp + spLen],
      [cx - sp, cy, cx - sp - spLen, cy],
      [cx + sp, cy, cx + sp + spLen, cy],
      [
        cx - sp * 0.7,
        cy - sp * 0.7,
        cx - sp * 0.7 - spLen * 0.7,
        cy - sp * 0.7 - spLen * 0.7,
      ],
      [
        cx + sp * 0.7,
        cy + sp * 0.7,
        cx + sp * 0.7 + spLen * 0.7,
        cy + sp * 0.7 + spLen * 0.7,
      ],
      [
        cx + sp * 0.7,
        cy - sp * 0.7,
        cx + sp * 0.7 + spLen * 0.7,
        cy - sp * 0.7 - spLen * 0.7,
      ],
      [
        cx - sp * 0.7,
        cy + sp * 0.7,
        cx - sp * 0.7 - spLen * 0.7,
        cy + sp * 0.7 + spLen * 0.7,
      ],
    ];
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = size * 0.015;
    ctx.lineCap = "round";
    lines.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  }

  return canvas;
}

// Determine output directories
const sizes = [16, 48, 128];
const outDirs = [
  join(__dirname, "../icons"),
  join(__dirname, "../public/icons"),
];

outDirs.forEach((d) => mkdirSync(d, { recursive: true }));

let canvasAvailable = true;
try {
  // Try creating a test canvas to confirm dependency is available
  createCanvas(1, 1);
} catch {
  canvasAvailable = false;
}

if (!canvasAvailable) {
  console.error("❌  'canvas' package not found. Run: npm i -D canvas");
  process.exit(1);
}

sizes.forEach((size) => {
  const canvas = drawIcon(size);
  const buf = canvas.toBuffer("image/png");
  outDirs.forEach((dir) => {
    const dest = join(dir, `icon${size}.png`);
    writeFileSync(dest, buf);
    console.log(`✅  Written ${dest}`);
  });
});

console.log(
  "\n✨  Icons generated! Reload the extension in chrome://extensions",
);
