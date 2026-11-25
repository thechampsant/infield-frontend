"use client";

import { useEffect } from "react";

export interface ToastState {
  message: string;
  type: "success" | "error";
}

export type ToastPosition =
  | "bottom-right"
  | "top-center"
  | "bottom-center"
  | "center";

export interface If2ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
  position?: ToastPosition;
  className?: string;
  style?: React.CSSProperties;
}

const positionStyles: Record<ToastPosition, React.CSSProperties> = {
  "bottom-right": {},
  "center": {
    top: "24px",
    bottom: "auto",
    left: "50%",
    right: "auto",
    transform: "translateX(-50%)",
    zIndex: 100,
    maxWidth: "calc(100vw - 32px)",
  },
  "top-center": {
    top: "24px",
    bottom: "auto",
    left: "50%",
    right: "auto",
    transform: "translateX(-50%)",
    zIndex: 100,
    maxWidth: "calc(100vw - 32px)",
  },
  "bottom-center": {
    bottom: "24px",
    top: "auto",
    left: "50%",
    right: "auto",
    transform: "translateX(-50%)",
    zIndex: 100,
    maxWidth: "calc(100vw - 32px)",
  },
};

export function If2Toast({
  toast,
  onDismiss,
  position = "bottom-right",
  className = "",
  style,
}: If2ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const posClass = position !== "bottom-right" ? ` ${position}` : "";
  const extraClass = className ? ` ${className}` : "";
  const mergedStyle: React.CSSProperties = {
    ...positionStyles[position],
    ...style,
  };

  return (
    <div
      className={`if2-toast ${toast.type}${posClass}${extraClass}`}
      style={mergedStyle}
      role="status"
    >
      {toast.type === "success" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
      {toast.message}
    </div>
  );
}
