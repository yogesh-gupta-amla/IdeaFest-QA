import React from "react";

interface LoadingOverlayProps {
  visible: boolean;
  text: string;
}

export default function LoadingOverlay({ visible, text }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="loading-overlay">
      <div className="spinner" />
      <p className="loading-text">{text}</p>
    </div>
  );
}
