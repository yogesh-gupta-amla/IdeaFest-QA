import React from "react";
import InsightsLogo from "./InsightsLogo";
import { ShieldOff, ExternalLink } from "lucide-react";
import { ALLOWED_REFERRER_ORIGINS } from "../../config/accessConfig";

// Display as URLs with trailing slash
const ALLOWED_URLS = ALLOWED_REFERRER_ORIGINS.map((o) =>
  o.endsWith("/") ? o : `${o}/`,
);

export default function AccessDenied() {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-5 py-10"
      style={{
        background:
          "linear-gradient(135deg, #050510 0%, #0d0621 35%, #0a0a1a 65%, #050510 100%)",
      }}
    >
      {/* background grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(239,68,68,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(239,68,68,0.8) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* glow orbs */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div
        className="relative w-full max-w-[440px] rounded-2xl flex flex-col items-center gap-6 p-8 text-center"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(239,68,68,0.25)",
          backdropFilter: "blur(20px)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* logo */}
        <InsightsLogo size={56} />

        {/* icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <ShieldOff size={26} style={{ color: "#ef4444" }} />
        </div>

        {/* heading */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: "#f1f5f9" }}
          >
            Access Restricted
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
            This application can only be accessed when embedded from an
            authorized portal. Direct access is not allowed.
          </p>
        </div>

        {/* divider */}
        <div
          className="w-full h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)",
          }}
        />

        {/* instructions */}
        <div className="flex flex-col gap-3 w-full">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#64748b" }}
          >
            Access via
          </p>
          {ALLOWED_URLS.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all duration-200 group"
              style={{
                background: "rgba(139,92,246,0.07)",
                border: "1px solid rgba(139,92,246,0.2)",
                color: "#a78bfa",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139,92,246,0.14)";
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(139,92,246,0.07)";
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)";
              }}
            >
              <span className="text-sm font-medium truncate">{url}</span>
              <ExternalLink size={14} style={{ flexShrink: 0 }} />
            </a>
          ))}
        </div>

        <p className="text-[11px]" style={{ color: "#475569" }}>
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
}
