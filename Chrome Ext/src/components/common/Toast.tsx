import React from "react";
import type { ToastType } from "../../types";

interface ToastProps {
  toast: { id: number; message: string; type: ToastType } | null;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  return (
    <div className={`toast visible toast-${toast.type}`}>{toast.message}</div>
  );
}
