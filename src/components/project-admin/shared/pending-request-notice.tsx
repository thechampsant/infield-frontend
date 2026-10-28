"use client";

import { AlertTriangle } from "lucide-react";
import { splitNoticeLines } from "@/lib/project-admin/pending-request-notice";

export type PendingRequestNoticeTone = "warning" | "danger";

const TONES: Record<PendingRequestNoticeTone, { background: string; border: string; text: string; strong: string }> = {
  warning: {
    background: "var(--amber-light)",
    border: "var(--amber)",
    text: "var(--amber-dark)",
    strong: "var(--amber-dark)",
  },
  danger: {
    background: "var(--red-light)",
    border: "var(--red-mid)",
    text: "var(--red)",
    strong: "var(--red)",
  },
};

/**
 * Pending-request message from the backend, one sentence per line, with a red warning
 * icon. "warning" when the action can go ahead, "danger" when it is blocked.
 */
export function PendingRequestNotice({
  message,
  tone,
  style,
}: {
  message: string;
  tone: PendingRequestNoticeTone;
  style?: React.CSSProperties;
}) {
  const colors = TONES[tone];
  const lines = splitNoticeLines(message);

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 10,
        background: colors.background,
        border: `1px solid ${colors.border}`,
        ...style,
      }}
    >
      <AlertTriangle size={18} color="var(--red)" aria-hidden style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        {lines.map((line, index) => (
          <span
            key={index}
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: line.isOutcome ? colors.strong : colors.text,
              fontWeight: line.isHeadline || line.isOutcome ? 600 : 400,
            }}
          >
            {line.text}
          </span>
        ))}
      </div>
    </div>
  );
}
