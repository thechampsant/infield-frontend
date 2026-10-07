"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  describeFilter,
  isContainsFilter,
  type MasterListStatus,
} from "@/lib/master-list-query";
import { ColumnFilterPopover } from "./column-filter-popover";
import { STATUS_LABELS, type MasterColumnFilterType, type MasterTableControls } from "./types";

const TEXT_DEBOUNCE_MS = 350;

const FIELD_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  minWidth: 0,
  minHeight: 32,
  padding: "0 10px",
  borderRadius: 8,
  fontSize: 11,
  background: "var(--surface)",
  color: "var(--text)",
};

function fieldBorder(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? "var(--blue)" : "var(--border)"}`,
    background: active ? "var(--blue-pale)" : "var(--surface)",
  };
}

interface InlineColumnFilterProps {
  columnKey: string;
  label: string;
  filter?: MasterColumnFilterType;
  sortable?: boolean;
  controls: MasterTableControls;
}

/** The filter cell under a column header: text box, value picker or status select. */
export function InlineColumnFilter({ columnKey, label, filter, sortable, controls }: InlineColumnFilterProps) {
  if (filter === "text") return <TextFilter columnKey={columnKey} label={label} controls={controls} />;
  if (filter === "list") {
    return <ListFilter columnKey={columnKey} label={label} sortable={sortable} controls={controls} />;
  }
  if (filter === "status" && controls.onStatusChange) {
    return <StatusFilter label={label} controls={controls} />;
  }
  return <span />;
}

function TextFilter({
  columnKey,
  label,
  controls,
}: {
  columnKey: string;
  label: string;
  controls: MasterTableControls;
}) {
  const current = controls.filters[columnKey];
  const applied = isContainsFilter(current) ? current.contains : "";
  const [text, setText] = useState(applied);
  const [lastApplied, setLastApplied] = useState(applied);
  const { onFilterChange } = controls;

  // Follow outside changes (chip removed, Clear all, a value list applied).
  if (applied !== lastApplied) {
    setLastApplied(applied);
    setText(applied);
  }

  useEffect(() => {
    if (text.trim() === applied.trim()) return;
    const handle = window.setTimeout(() => {
      onFilterChange(columnKey, text.trim() ? { contains: text.trim() } : null);
    }, TEXT_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [text, applied, columnKey, onFilterChange]);

  // A value-list filter on a text column shows as a summary instead of the box.
  if (current && !isContainsFilter(current)) {
    return (
      <div style={{ ...FIELD_STYLE, ...fieldBorder(true), fontWeight: 700, color: "var(--blue)" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {describeFilter(current)}
        </span>
      </div>
    );
  }

  return (
    <label style={{ ...FIELD_STYLE, ...fieldBorder(Boolean(applied)) }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}…`}
        aria-label={`Filter ${label} by text`}
        maxLength={100}
        style={{
          border: "none",
          background: "transparent",
          fontSize: 11,
          color: "var(--text)",
          width: "100%",
          minWidth: 0,
          outline: "none",
        }}
      />
      <Search size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
    </label>
  );
}

function ListFilter({
  columnKey,
  label,
  sortable,
  controls,
}: {
  columnKey: string;
  label: string;
  sortable?: boolean;
  controls: MasterTableControls;
}) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const current = controls.filters[columnKey];
  const sortOrder = controls.sort?.key === columnKey ? controls.sort.order : null;
  const { loadFilterValues } = controls;
  const loadValues = useCallback(
    (valueSearch: string) => loadFilterValues(columnKey, valueSearch),
    [loadFilterValues, columnKey],
  );
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Choose ${label} values`}
        style={{
          ...FIELD_STYLE,
          ...fieldBorder(Boolean(current)),
          cursor: "pointer",
          justifyContent: "space-between",
          fontWeight: current ? 700 : 500,
          color: current ? "var(--blue)" : "var(--text-muted)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current ? describeFilter(current) : "All"}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0 }} />
      </button>
      {open && anchor && (
        <ColumnFilterPopover
          anchor={anchor}
          columnLabel={label}
          sortable={Boolean(sortable)}
          sortOrder={sortOrder}
          onSort={(order) => controls.onSetSort({ key: columnKey, order })}
          filter={current}
          loadValues={loadValues}
          onApply={(next) => controls.onFilterChange(columnKey, next)}
          onClose={close}
        />
      )}
    </>
  );
}

function StatusFilter({ label, controls }: { label: string; controls: MasterTableControls }) {
  const value = controls.status ?? "all";
  const active = value !== (controls.defaultStatus ?? "all");
  return (
    <select
      value={value}
      onChange={(e) => controls.onStatusChange?.(e.target.value as MasterListStatus)}
      aria-label={`Filter ${label}`}
      style={{
        ...FIELD_STYLE,
        ...fieldBorder(active),
        fontWeight: active ? 700 : 500,
        color: active ? "var(--blue)" : "var(--text-muted)",
        cursor: "pointer",
      }}
    >
      {(["all", "active", "inactive"] as const).map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
