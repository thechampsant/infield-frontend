"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActiveFilterChips } from "./master-table/active-filter-chips";
import { ColumnHeader } from "./master-table/column-header";
import { InlineColumnFilter } from "./master-table/inline-column-filter";
import type { MasterColumnFilterType, MasterTableControls } from "./master-table/types";

export interface Column {
  key: string;
  label: string;
  width?: string | number;
  align?: "left" | "right" | "center";
  /** Only used when `masterQuery` is passed. */
  sortable?: boolean;
  /** Only used when `masterQuery` is passed. */
  filter?: MasterColumnFilterType;
}

const GRID_GAP = 12;
const GRID_PADDING_X = 20;

/**
 * Grid template for a column list. Screens that render their own rows should
 * build the row grid with this from the same `columns` they pass to the table,
 * so header and row cells can't drift apart.
 */
export function gridTemplateFor(columns: Column[]): string {
  return columns
    .map((c) => (typeof c.width === "number" ? `${c.width}px` : (c.width ?? "1fr")))
    .join(" ");
}

/** Minimum pixels of one track: `140`, `"140px"`, `"minmax(120px, 1fr)"`, else `flexMin`. */
function trackMinPx(width: Column["width"], flexMin: number): number {
  if (typeof width === "number") return width;
  const match = width?.match(/^(?:minmax\(\s*)?(\d+(?:\.\d+)?)px/);
  return match ? Number(match[1]) : flexMin;
}

/**
 * Smallest width at which every column keeps its minimum size: fixed widths,
 * `minmax()` minimums, gaps and side padding, plus `flexMin` for each bare
 * `fr` column. Pass the same value as the rows' `minWidth` and the table's
 * `minWidth`; below it the table scrolls sideways.
 */
export function gridMinWidthFor(columns: Column[], flexMin = 200): number {
  const tracks = columns.reduce((sum, c) => sum + trackMinPx(c.width, flexMin), 0);
  return tracks + GRID_GAP * Math.max(columns.length - 1, 0) + GRID_PADDING_X * 2;
}

/**
 * Server-driven pagination. `rows` then holds only the current page, so the
 * footer is built from the API's `meta` instead of the loaded array length.
 */
export interface ServerPagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

interface DataTableProps {
  columns: Column[];
  rows: React.ReactNode[];
  total: number;
  filtered: number;
  entityLabel: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  /** Enable scroll pagination — show this many rows initially, load more on scroll */
  pageSize?: number;
  /** Page through the API instead of slicing an already-loaded array. */
  serverPagination?: ServerPagination;
  /**
   * Turns on sortable headers, column filters, filter chips and the
   * "no records match" state. Leave out for the plain table.
   */
  masterQuery?: MasterTableControls;
  /** Minimum width of the header rows; match the rows' own minWidth. */
  minWidth?: number;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function DataTable({
  columns,
  rows,
  total,
  filtered,
  entityLabel,
  searchValue,
  onSearchChange,
  toolbarLeft,
  toolbarRight,
  loading,
  emptyMessage,
  pageSize,
  serverPagination,
  masterQuery,
  minWidth = 720,
}: DataTableProps) {
  // Scroll paging only makes sense when the whole dataset is already loaded.
  const scrollPageSize = serverPagination ? undefined : pageSize;
  const [visibleCount, setVisibleCount] = useState(scrollPageSize ?? rows.length);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset visible count when rows change (e.g. search/filter) or pageSize changes
  useEffect(() => {
    setVisibleCount(scrollPageSize ?? rows.length);
  }, [scrollPageSize, rows.length, searchValue]);

  const handleScroll = useCallback(() => {
    if (!scrollPageSize) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Load more when user is within 100px of the bottom
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setVisibleCount((prev) => {
        const next = prev + scrollPageSize;
        return next > rows.length ? rows.length : next;
      });
    }
  }, [scrollPageSize, rows.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !scrollPageSize) return;
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll, scrollPageSize]);

  const displayedRows = scrollPageSize ? rows.slice(0, visibleCount) : rows;
  const hasMore = scrollPageSize ? visibleCount < rows.length : false;
  const gridCols = gridTemplateFor(columns);

  const rangeStart =
    serverPagination && serverPagination.totalCount > 0
      ? (serverPagination.page - 1) * serverPagination.pageSize + 1
      : 0;
  const rangeEnd = serverPagination
    ? Math.min(
        serverPagination.page * serverPagination.pageSize,
        serverPagination.totalCount,
      )
    : 0;
  const shownCount = serverPagination ? serverPagination.totalCount : filtered;
  const filteredView = Boolean(masterQuery?.filtersActive);
  const showFilterRow = Boolean(masterQuery && columns.some((c) => c.filter));
  const columnLabels = Object.fromEntries(columns.map((c) => [c.key, c.label]));

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0 12px",
              minHeight: 40,
              flex: 1,
              maxWidth: 320,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search ${entityLabel}…`}
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

          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            {filteredView && masterQuery?.unfilteredTotal !== undefined
              ? `${shownCount} of ${masterQuery.unfilteredTotal} ${entityLabel}`
              : `${shownCount} ${entityLabel}`}
          </span>

          {toolbarLeft}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {toolbarRight}
        </div>
      </div>

      {masterQuery && <ActiveFilterChips controls={masterQuery} labels={columnLabels} />}

      <div ref={scrollContainerRef} style={{ overflowX: "auto", overflowY: scrollPageSize ? "auto" : undefined, maxHeight: scrollPageSize ? 640 : undefined }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: 12,
            padding: "12px 20px",
            background: "var(--surface2)",
            borderBottom: showFilterRow ? "none" : "1px solid var(--border)",
            alignItems: "center",
            minWidth,
          }}
        >
          {columns.map((col) =>
            masterQuery ? (
              <ColumnHeader
                key={col.key}
                columnKey={col.key}
                label={col.label}
                align={col.align}
                sortable={col.sortable}
                filter={col.filter}
                controls={masterQuery}
              />
            ) : (
              <span
                key={col.key}
                style={{
                  display: "block",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  textAlign: col.align ?? "left",
                  whiteSpace: "nowrap",
                  wordBreak: "normal",
                  overflowWrap: "normal",
                  writingMode: "horizontal-tb",
                  textOrientation: "mixed",
                }}
              >
                {col.label}
              </span>
            ),
          )}
        </div>

        {showFilterRow && masterQuery && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              gap: 12,
              padding: "0 20px 12px",
              background: "var(--surface2)",
              borderBottom: "1px solid var(--border)",
              alignItems: "center",
              minWidth,
            }}
          >
            {columns.map((col) => (
              <InlineColumnFilter
                key={col.key}
                columnKey={col.key}
                label={col.label}
                filter={col.filter}
                sortable={col.sortable}
                controls={masterQuery}
              />
            ))}
          </div>
        )}

        {loading ? (
          <div className="pa-loading">Loading…</div>
        ) : displayedRows.length === 0 && masterQuery?.anyActive ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              No records match your filters
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={masterQuery.onClearAll}
            >
              Clear filters
            </button>
          </div>
        ) : displayedRows.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-muted)",
                marginBottom: 4,
              }}
            >
              {emptyMessage ?? `No ${entityLabel} found`}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Adjust your search or filter.
            </div>
          </div>
        ) : (
          <>
            {displayedRows}
            {hasMore && (
              <div
                style={{
                  padding: "12px 20px",
                  textAlign: "center",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                Scroll down for more…
              </div>
            )}
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderTop: "1px solid var(--border)",
          background: "var(--surface2)",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {serverPagination ? (
          <>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Show
              <select
                value={serverPagination.pageSize}
                onChange={(e) =>
                  serverPagination.onPageSizeChange(Number(e.target.value))
                }
                aria-label={`Rows of ${entityLabel} per page`}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text)",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 6px",
                }}
              >
                {(serverPagination.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS).map(
                  (size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ),
                )}
              </select>
              per page
            </label>

            <span
              style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}
            >
              {`Showing ${rangeStart}–${rangeEnd} of ${serverPagination.totalCount} ${filteredView ? "filtered " : ""}${entityLabel}`}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PagerButton
                disabled={serverPagination.page <= 1 || loading}
                onClick={() => serverPagination.onPageChange(serverPagination.page - 1)}
              >
                Previous
              </PagerButton>
              <span
                style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}
              >
                Page {serverPagination.page} of {serverPagination.totalPages}
              </span>
              <PagerButton
                disabled={
                  serverPagination.page >= serverPagination.totalPages || loading
                }
                onClick={() => serverPagination.onPageChange(serverPagination.page + 1)}
              >
                Next
              </PagerButton>
            </div>
          </>
        ) : (
          <span
            style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}
          >
            Showing {scrollPageSize ? `${displayedRows.length} of ${filtered}` : `${filtered} of ${total}`}
          </span>
        )}
      </div>
    </div>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        color: "var(--text)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 11,
        fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
        padding: "5px 10px",
      }}
    >
      {children}
    </button>
  );
}
