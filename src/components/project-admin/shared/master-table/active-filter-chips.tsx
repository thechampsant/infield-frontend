"use client";

import { X } from "lucide-react";
import { describeFilter } from "@/lib/master-list-query";
import { STATUS_LABELS, type MasterTableControls } from "./types";

interface ActiveFilterChipsProps {
  controls: MasterTableControls;
  /** Column key → header label, for chip text. */
  labels: Record<string, string>;
}

/** One removable chip per applied filter, the status and the sort, plus "Clear all". */
export function ActiveFilterChips({ controls, labels }: ActiveFilterChipsProps) {
  const chips: Array<{ key: string; name: string; value: string; onRemove: () => void }> = [];

  for (const [key, filter] of Object.entries(controls.filters)) {
    chips.push({
      key: `filter-${key}`,
      name: labels[key] ?? key,
      value: describeFilter(filter),
      onRemove: () => controls.onFilterChange(key, null),
    });
  }

  const defaultStatus = controls.defaultStatus ?? "all";
  if (controls.status && controls.status !== defaultStatus && controls.onStatusChange) {
    chips.push({
      key: "status",
      name: "Status",
      value: STATUS_LABELS[controls.status],
      onRemove: () => controls.onStatusChange?.(defaultStatus),
    });
  }

  if (controls.sort) {
    chips.push({
      key: "sort",
      name: "Sort",
      value: `${labels[controls.sort.key] ?? controls.sort.key} ${controls.sort.order === "asc" ? "A→Z" : "Z→A"}`,
      onRemove: () => controls.onSetSort(null),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 20px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        Active filters
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            maxWidth: 320,
            padding: "4px 6px 4px 12px",
            borderRadius: 999,
            background: "var(--blue)",
            color: "#fff",
            fontSize: 11,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <strong>{chip.name}:</strong> {chip.value}
          </span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.name} filter`}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "none",
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.22)",
              color: "#fff",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={11} strokeWidth={3} />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={controls.onClearAll}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--red)",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          padding: "4px 2px",
        }}
      >
        Clear all
      </button>
    </div>
  );
}
