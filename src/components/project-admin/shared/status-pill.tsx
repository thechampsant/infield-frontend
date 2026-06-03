"use client";

import type { Status } from "@/types/project-admin";

interface StatusPillProps {
  status: Status | "coming";
}

const PILL_STYLES = {
  active: {
    bg: "var(--teal-light)",
    color: "var(--teal-dark)",
    dot: "var(--teal)",
    label: "Active",
  },
  inactive: {
    bg: "var(--red-light)",
    color: "var(--red)",
    dot: "var(--red)",
    label: "Inactive",
  },
  coming: {
    bg: "var(--amber-light)",
    color: "var(--amber-dark)",
    dot: "var(--amber)",
    label: "Coming Soon",
  },
};

export function StatusPill({ status }: StatusPillProps) {
  const s = PILL_STYLES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        padding: "4px 12px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}
