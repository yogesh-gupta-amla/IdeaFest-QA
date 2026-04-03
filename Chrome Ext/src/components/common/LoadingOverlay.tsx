import React from "react";

interface LoadingOverlayProps {
  visible: boolean;
  text: string;
}

export default function LoadingOverlay({ visible, text }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="loading-overlay">
      {/* Outer glow ring */}
      <div
        className="absolute w-20 h-20 rounded-full"
        style={{
          background: "transparent",
          border: "2px solid rgba(139,92,246,0.2)",
          animation: "breathe 2s ease-in-out infinite",
        }}
      />
      <div className="spinner" />
      <p className="loading-text">{text}</p>
    </div>
  );
}
