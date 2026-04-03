/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gaming: {
          black: "#050510",
          dark: "#0a0a1a",
          deeper: "#080814",
          "purple-deep": "#1a0532",
          "purple-neon": "#bf5af2",
          "cyan-neon": "#00fff7",
          "cyan-default": "#00d4ff",
          "accent-primary": "#8b5cf6",
          "accent-secondary": "#6366f1",
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "neon-flicker": "neon-flicker 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.4,0,0.2,1) both",
        "slide-in-right": "slideInRight 0.35s ease both",
        "health-pulse-green": "health-pulse-green 2s ease-in-out infinite",
        "health-pulse-yellow": "health-pulse-yellow 2s ease-in-out infinite",
        "health-pulse-red": "health-pulse-red 1.5s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        breathe: "breathe 4s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "particle-rise": "particle-rise 6s ease-in-out infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%,100%": {
            boxShadow:
              "0 0 20px rgba(139,92,246,0.4),0 0 40px rgba(139,92,246,0.2)",
          },
          "50%": {
            boxShadow:
              "0 0 40px rgba(139,92,246,0.8),0 0 80px rgba(139,92,246,0.4)",
          },
        },
        "neon-flicker": {
          "0%,93%,100%": { opacity: "1" },
          "94%": { opacity: "0.8" },
          "96%": { opacity: "0.6" },
          "98%": { opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "health-pulse-green": {
          "0%,100%": {
            boxShadow: "0 0 16px #10b981,0 0 40px rgba(16,185,129,0.2)",
          },
          "50%": {
            boxShadow: "0 0 28px #10b981,0 0 60px rgba(16,185,129,0.35)",
          },
        },
        "health-pulse-yellow": {
          "0%,100%": {
            boxShadow: "0 0 16px #f59e0b,0 0 40px rgba(245,158,11,0.2)",
          },
          "50%": {
            boxShadow: "0 0 28px #f59e0b,0 0 60px rgba(245,158,11,0.35)",
          },
        },
        "health-pulse-red": {
          "0%,100%": {
            boxShadow: "0 0 16px #ef4444,0 0 40px rgba(239,68,68,0.2)",
          },
          "50%": {
            boxShadow: "0 0 28px #ef4444,0 0 60px rgba(239,68,68,0.45)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        breathe: {
          "0%,100%": { transform: "scale(1)", opacity: "0.8" },
          "50%": { transform: "scale(1.05)", opacity: "1" },
        },
        "border-glow": {
          "0%,100%": { borderColor: "rgba(139,92,246,0.3)" },
          "50%": { borderColor: "rgba(139,92,246,0.8)" },
        },
        "particle-rise": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "10%": { opacity: "0.6" },
          "90%": { opacity: "0.2" },
          "100%": { transform: "translateY(-120px) scale(0.5)", opacity: "0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow-purple":
          "0 0 20px rgba(139,92,246,0.4),0 0 40px rgba(139,92,246,0.2)",
        "glow-purple-lg":
          "0 0 40px rgba(139,92,246,0.6),0 0 80px rgba(139,92,246,0.3)",
        "glow-cyan":
          "0 0 20px rgba(0,212,255,0.4),0 0 40px rgba(0,212,255,0.2)",
        "glow-green": "0 0 16px #10b981,0 0 40px rgba(16,185,129,0.2)",
        "glow-yellow": "0 0 16px #f59e0b,0 0 40px rgba(245,158,11,0.2)",
        "glow-red": "0 0 16px #ef4444,0 0 40px rgba(239,68,68,0.2)",
        card: "0 8px 32px rgba(0,0,0,0.4)",
        "card-hover": "0 12px 48px rgba(0,0,0,0.6)",
        glass:
          "0 8px 32px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      backgroundImage: {
        "gaming-gradient":
          "linear-gradient(135deg,#050510 0%,#0d0621 40%,#0a0a1a 70%,#050510 100%)",
        "gaming-gradient-2":
          "linear-gradient(135deg,#0a0a1a 0%,#130a2e 50%,#0a0a1a 100%)",
        "purple-glow":
          "radial-gradient(ellipse at 50% 0%,rgba(139,92,246,0.15) 0%,transparent 70%)",
        "cyan-glow":
          "radial-gradient(ellipse at 100% 100%,rgba(0,212,255,0.1) 0%,transparent 60%)",
        "shimmer-gradient":
          "linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)",
        "card-gradient":
          "linear-gradient(135deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.02) 100%)",
      },
      transitionDuration: {
        400: "400ms",
        600: "600ms",
      },
      fontFamily: {
        gaming: [
          "Segoe UI",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["Cascadia Code", "Fira Code", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
