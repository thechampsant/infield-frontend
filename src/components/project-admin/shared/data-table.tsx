"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Column {
  key: string;
  label: string;
  width?: string | number;
  align?: "left" | "right" | "center";
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
  const gridCols = columns
    .map((c) =>
      typeof c.width === "number" ? `${c.width}px` : (c.width ?? "1fr"),
    )
    .join(" ");

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
            {serverPagination ? serverPagination.totalCount : filtered} {entityLabel}
          </span>

          {toolbarLeft}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {toolbarRight}
        </div>
      </div>

      <div ref={scrollContainerRef} style={{ overflowX: "auto", overflowY: scrollPageSize ? "auto" : undefined, maxHeight: scrollPageSize ? 640 : undefined }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridCols,
            gap: 12,
            padding: "12px 20px",
            background: "var(--surface2)",
            borderBottom: "1px solid var(--border)",
            alignItems: "center",
            minWidth: 720,
          }}
        >
          {columns.map((col) => (
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
          ))}
        </div>

        {loading ? (
          <div className="pa-loading">Loading…</div>
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
              {`Showing ${rangeStart}–${rangeEnd} of ${serverPagination.totalCount} ${entityLabel}`}
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
