"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SortBy, SortDirection } from "@/lib/api/inbox-service";

export interface DateRange {
  from: string;
  to: string;
}

export function InboxToolbar({
  sortBy,
  sortDirection,
  onSort,
  dateRange,
  onApplyDate,
  onClearDate,
  resultCount,
}: {
  sortBy: SortBy;
  sortDirection: SortDirection;
  onSort: (by: SortBy) => void;
  dateRange: DateRange | null;
  onApplyDate: (range: DateRange) => void;
  onClearDate: () => void;
  resultCount: number;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [from, setFrom] = useState(dateRange?.from ?? "");
  const [to, setTo] = useState(dateRange?.to ?? "");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFilterOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  function dateArrow(by: SortBy): string {
    if (sortBy !== by) return "";
    if (by === "date") return sortDirection === "desc" ? "↓" : "↑";
    return sortDirection === "asc" ? "A-Z" : "Z-A";
  }

  return (
    <div className="inbox-toolbar">
      <span className="inbox-toolbar-label">Sort</span>

      <button
        type="button"
        className={cn("inbox-tool-btn", sortBy === "date" && "active")}
        onClick={() => onSort("date")}
        aria-pressed={sortBy === "date"}
      >
        Date
        {sortBy === "date" && <span className="inbox-sort-arrow">{dateArrow("date")}</span>}
      </button>

      <button
        type="button"
        className={cn("inbox-tool-btn", sortBy === "name" && "active")}
        onClick={() => onSort("name")}
        aria-pressed={sortBy === "name"}
      >
        Name
        {sortBy === "name" && <span className="inbox-sort-arrow">{dateArrow("name")}</span>}
      </button>

      <div className="inbox-filter-wrap" ref={wrapRef}>
        <button
          type="button"
          className={cn("inbox-tool-btn", dateRange && "has-filter")}
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          aria-haspopup="dialog"
        >
          <CalendarDays aria-hidden="true" />
          Date Filter
          {dateRange && <span className="inbox-sort-arrow">•</span>}
        </button>

        {filterOpen && (
          <div className="inbox-filter-panel" role="dialog" aria-label="Date filter">
            <div className="inbox-filter-field">
              <label htmlFor="ibxFrom">From</label>
              <input
                id="ibxFrom"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="inbox-filter-field">
              <label htmlFor="ibxTo">To</label>
              <input
                id="ibxTo"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="inbox-filter-actions">
              <button
                type="button"
                className="ibx-btn ibx-btn-ghost"
                style={{ flex: 1 }}
                onClick={() => {
                  setFrom("");
                  setTo("");
                  onClearDate();
                  setFilterOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="ibx-btn ibx-btn-primary"
                style={{ flex: 1 }}
                disabled={!from && !to}
                onClick={() => {
                  onApplyDate({ from, to });
                  setFilterOpen(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <span className="inbox-result-count">
        {resultCount} {resultCount === 1 ? "request" : "requests"}
      </span>
    </div>
  );
}
