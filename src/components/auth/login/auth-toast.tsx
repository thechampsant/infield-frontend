"use client";

import { useEffect } from "react";

export type ToastState = {
  message: string;
  type?: "ok" | "er";
} | null;

export function AuthToast({
  toast,
  onDismiss,
  duration = 2400,
}: {
  toast: ToastState;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [toast, duration, onDismiss]);

  return (
    <div
      className={`toast${toast ? ` show ${toast.type ?? ""}` : ""}`}
      role="status"
    >
      {toast?.message ?? ""}
    </div>
  );
}
