"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Check, Search } from "lucide-react";
import {
  BLANK_FILTER_LABEL,
  filterValueKey,
  isInFilter,
  type MasterColumnFilter,
  type MasterFilterValue,
  type MasterFilterValueOption,
  type MasterFilterValuesResult,
  type MasterSortOrder,
} from "@/lib/master-list-query";

const POPOVER_WIDTH = 300;
const VALUE_SEARCH_DEBOUNCE_MS = 250;

interface ColumnFilterPopoverProps {
  anchor: HTMLElement;
  columnLabel: string;
  sortable: boolean;
  /** Current sort direction when this column is the sorted one. */
  sortOrder: MasterSortOrder | null;
  onSort: (order: MasterSortOrder) => void;
  filter: MasterColumnFilter | undefined;
  loadValues: (valueSearch: string) => Promise<MasterFilterValuesResult>;
  onApply: (filter: MasterColumnFilter | null) => void;
  onClose: () => void;
}

type Selection = Map<string, { value: MasterFilterValue; label: string }>;

function initialSelection(filter: MasterColumnFilter | undefined): Selection {
  const selection: Selection = new Map();
  if (isInFilter(filter)) {
    filter.in.forEach((value, index) => {
      const label = filter.labels?.[index] ?? (value === null ? BLANK_FILTER_LABEL : String(value));
      selection.set(filterValueKey(value), { value, label });
    });
  }
  return selection;
}

/**
 * Excel-style column menu: sort A→Z / Z→A, search the column's values, pick
 * several with their record counts, then Apply. Rendered in a portal so the
 * table's overflow can't clip it; it stays inside `.pa-shell` for the theme.
 */
export function ColumnFilterPopover({
  anchor,
  columnLabel,
  sortable,
  sortOrder,
  onSort,
  filter,
  loadValues,
  onApply,
  onClose,
}: ColumnFilterPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [valueSearch, setValueSearch] = useState("");
  const [result, setResult] = useState<MasterFilterValuesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(() => initialSelection(filter));

  const portalTarget = useMemo(
    () => (anchor.closest(".pa-shell") as HTMLElement | null) ?? document.body,
    [anchor],
  );

  useLayoutEffect(() => {
    function place() {
      const rect = anchor.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.right - POPOVER_WIDTH),
        window.innerWidth - POPOVER_WIDTH - 8,
      );
      setPosition({ top: rect.bottom + 6, left: Math.max(8, left) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchor.contains(target)) return;
      onClose();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(
      () => {
        setLoading(true);
        setError(null);
        loadValues(valueSearch.trim())
          .then((next) => {
            if (!cancelled) setResult(next);
          })
          .catch((err: unknown) => {
            if (!cancelled) setError(err instanceof Error ? err.message : "Could not load values");
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      },
      valueSearch ? VALUE_SEARCH_DEBOUNCE_MS : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [loadValues, valueSearch]);

  const options = result?.values ?? [];
  const allVisibleSelected =
    options.length > 0 && options.every((option) => selection.has(filterValueKey(option.value)));

  function toggle(option: MasterFilterValueOption) {
    setSelection((prev) => {
      const next = new Map(prev);
      const key = filterValueKey(option.value);
      if (next.has(key)) next.delete(key);
      else next.set(key, { value: option.value, label: option.label });
      return next;
    });
  }

  function toggleAllVisible() {
    setSelection((prev) => {
      const next = new Map(prev);
      for (const option of options) {
        const key = filterValueKey(option.value);
        if (allVisibleSelected) next.delete(key);
        else next.set(key, { value: option.value, label: option.label });
      }
      return next;
    });
  }

  function apply() {
    const picked = [...selection.values()];
    // Every value of the column picked means no filter at all.
    const everything =
      !valueSearch.trim() &&
      result &&
      !result.truncated &&
      result.values.length > 0 &&
      picked.length === result.values.length &&
      result.values.every((option) => selection.has(filterValueKey(option.value)));
    if (picked.length === 0 || everything) {
      onApply(null);
    } else {
      onApply({ in: picked.map((p) => p.value), labels: picked.map((p) => p.label) });
    }
    onClose();
  }

  if (!position) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Filter ${columnLabel}`}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: POPOVER_WIDTH,
        zIndex: 1000,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "var(--shadow-lg)",
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      {sortable && (
        <>
          <SectionLabel>Sort</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <SortButton active={sortOrder === "asc"} onClick={() => onSort("asc")}>
              <ArrowUp size={12} /> A → Z
            </SortButton>
            <SortButton active={sortOrder === "desc"} onClick={() => onSort("desc")}>
              <ArrowDown size={12} /> Z → A
            </SortButton>
          </div>
        </>
      )}

      <SectionLabel>Filter values</SectionLabel>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "0 10px",
          minHeight: 34,
        }}
      >
        <Search size={12} color="var(--text-muted)" />
        <input
          type="text"
          value={valueSearch}
          onChange={(e) => setValueSearch(e.target.value)}
          placeholder="Search values…"
          aria-label={`Search ${columnLabel} values`}
          autoFocus
          style={{
            border: "none",
            background: "transparent",
            fontSize: 12,
            color: "var(--text)",
            width: "100%",
            outline: "none",
          }}
        />
      </div>

      <div
        role="listbox"
        aria-multiselectable="true"
        style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 2 }}
      >
        {loading && !result ? (
          <Muted>Loading values…</Muted>
        ) : error ? (
          <Muted color="var(--red)">{error}</Muted>
        ) : options.length === 0 ? (
          <Muted>No values found</Muted>
        ) : (
          <>
            <CheckRow
              checked={allVisibleSelected}
              label={valueSearch.trim() ? "Select all shown" : "Select all"}
              onClick={toggleAllVisible}
            />
            {options.map((option) => (
              <CheckRow
                key={filterValueKey(option.value)}
                checked={selection.has(filterValueKey(option.value))}
                label={option.label}
                italic={option.value === null}
                count={option.count}
                onClick={() => toggle(option)}
              />
            ))}
            {result?.truncated && (
              <Muted>Showing the first {options.length} values. Search to narrow.</Muted>
            )}
          </>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          borderTop: "1px solid var(--border)",
          paddingTop: 10,
        }}
      >
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelection(new Map())}>
          Clear
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={apply}>
          Apply
        </button>
      </div>
    </div>,
    portalTarget,
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "7px 8px",
        borderRadius: 8,
        border: `1px solid ${active ? "var(--blue)" : "var(--border)"}`,
        background: active ? "var(--blue-pale)" : "var(--surface)",
        color: active ? "var(--blue)" : "var(--text)",
        fontSize: 11,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function CheckRow({
  checked,
  label,
  count,
  italic,
  onClick,
}: {
  checked: boolean;
  label: string;
  count?: number;
  italic?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 4px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: 6,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          flexShrink: 0,
          border: `1.5px solid ${checked ? "var(--blue)" : "var(--border2)"}`,
          background: checked ? "var(--blue)" : "var(--surface)",
          display: "grid",
          placeItems: "center",
          color: "#fff",
        }}
      >
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12,
          color: "var(--text)",
          fontStyle: italic ? "italic" : undefined,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {count}
        </span>
      )}
    </button>
  );
}

function Muted({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontSize: 11, color: color ?? "var(--text-muted)", padding: "6px 4px" }}>{children}</div>
  );
}
