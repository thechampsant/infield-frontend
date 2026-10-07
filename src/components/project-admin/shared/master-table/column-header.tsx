"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
import { ColumnFilterPopover } from "./column-filter-popover";
import type { MasterColumnFilterType, MasterTableControls } from "./types";

interface ColumnHeaderProps {
  columnKey: string;
  label: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  filter?: MasterColumnFilterType;
  controls: MasterTableControls;
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

/** Long labels shorten with "…" so icons stay inside the column. */
const LABEL_TEXT_STYLE: React.CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

/**
 * Header cell with a sort toggle (ASC → DESC → none) and, for text and list
 * columns, a caret that opens the column's filter popover.
 */
export function ColumnHeader({ columnKey, label, align, sortable, filter, controls }: ColumnHeaderProps) {
  const [caret, setCaret] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const sortOrder = controls.sort?.key === columnKey ? controls.sort.order : null;
  const filtered = Boolean(controls.filters[columnKey]);
  const hasPopover = filter === "text" || filter === "list";
  const { loadFilterValues } = controls;

  const loadValues = useCallback(
    (valueSearch: string) => loadFilterValues(columnKey, valueSearch),
    [loadFilterValues, columnKey],
  );
  const close = useCallback(() => setOpen(false), []);

  const SortIcon = sortOrder === "asc" ? ArrowUp : sortOrder === "desc" ? ArrowDown : ArrowUpDown;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
        minWidth: 0,
      }}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => controls.onToggleSort(columnKey)}
          title={
            sortOrder === "asc"
              ? `Sorted A→Z by ${label}. Click for Z→A.`
              : sortOrder === "desc"
                ? `Sorted Z→A by ${label}. Click to clear.`
                : `Sort by ${label}`
          }
          aria-label={`Sort by ${label}`}
          style={{
            ...LABEL_STYLE,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            minWidth: 0,
            maxWidth: "100%",
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            color: sortOrder ? "var(--blue)" : "var(--text-muted)",
          }}
        >
          <span style={LABEL_TEXT_STYLE}>{label}</span>
          <SortIcon
            size={11}
            strokeWidth={2.5}
            style={{ opacity: sortOrder ? 1 : 0.5, flexShrink: 0 }}
          />
        </button>
      ) : (
        <span title={label} style={{ ...LABEL_STYLE, ...LABEL_TEXT_STYLE, color: "var(--text-muted)" }}>
          {label}
        </span>
      )}

      {hasPopover && (
        <button
          ref={setCaret}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Filter ${label}`}
          title={`Filter ${label}`}
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "none",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            background: filtered || open ? "var(--blue)" : "transparent",
            color: filtered || open ? "#fff" : "var(--text-muted)",
          }}
        >
          <ChevronDown size={13} strokeWidth={2.5} />
        </button>
      )}

      {open && caret && (
        <ColumnFilterPopover
          anchor={caret}
          columnLabel={label}
          sortable={Boolean(sortable)}
          sortOrder={sortOrder}
          onSort={(order) => controls.onSetSort({ key: columnKey, order })}
          filter={controls.filters[columnKey]}
          loadValues={loadValues}
          onApply={(next) => controls.onFilterChange(columnKey, next)}
          onClose={close}
        />
      )}
    </div>
  );
}
