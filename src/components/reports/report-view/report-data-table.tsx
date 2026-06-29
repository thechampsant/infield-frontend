"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, MapPin } from "lucide-react";
import type { ReportSelectedColumn } from "@/lib/api/report-config-service";

interface ReportDataTableProps {
  columns: ReportSelectedColumn[];
  data: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function formatCellValue(value: unknown, fieldType: string): React.ReactNode {
  // Null/missing → dash
  if (value === null || value === undefined || value === "") {
    return <span className="text-[#7a95b5]">-</span>;
  }

  // Numeric → 2 decimal places
  if (fieldType === "NUM" && typeof value === "number") {
    return value.toFixed(2);
  }

  // Image → thumbnail
  if (fieldType === "IMAGE" && typeof value === "string") {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-block">
        <img
          src={value}
          alt=""
          className="h-12 w-12 rounded-md object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            target.parentElement!.querySelector(".fallback-icon")?.classList.remove("hidden");
          }}
        />
        <ImageIcon className="fallback-icon hidden h-12 w-12 rounded-md border border-[#dde6f0] p-2 text-[#7a95b5]" />
      </a>
    );
  }

  // Location → map link
  if (fieldType === "LOCATION" && typeof value === "string") {
    return (
      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(value)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-[#1e5fa8] hover:text-[#174d88]"
      >
        <MapPin className="h-3.5 w-3.5" />
        <span className="text-sm">View Map</span>
      </a>
    );
  }

  // Boolean
  if (fieldType === "BOOL") {
    return value ? "Yes" : "No";
  }

  // Date
  if (fieldType === "DATE" && value) {
    try {
      return new Date(value as string).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return String(value);
    }
  }

  // Object type — dynamically extract best readable representation
  // Handles ISTDateInfo and any future nested object fields
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // ISTDateInfo pattern: has full_iso (local datetime string)
    if (typeof obj.full_iso === 'string') {
      // Show date only: "2026-03-27"
      return obj.full_iso.split('T')[0];
    }

    // Has a datejs ISO string (UTC date)
    if (typeof obj.datejs === 'string') {
      try {
        return new Date(obj.datejs).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return obj.datejs;
      }
    }

    // Has a datetime timestamp
    if (typeof obj.datetime === 'number') {
      try {
        return new Date(obj.datetime).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return String(obj.datetime);
      }
    }

    // Has a name field (generic named object)
    if (typeof obj.name === 'string') return obj.name;

    // Fallback: join key-value pairs
    const entries = Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .slice(0, 3) // show max 3 fields
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return entries || JSON.stringify(obj);
  }

  return String(value);
}

export function ReportDataTable({
  columns,
  data,
  totalCount,
  page,
  pageSize,
  onPageChange,
}: ReportDataTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  // Generate page numbers to show
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[#c8d8eb] bg-white py-12 text-center">
        <p className="text-sm text-[#3a5272]">No data available for the selected filters.</p>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-[#dde6f0] bg-white p-4 shadow-[0_2px_8px_rgba(30,95,168,0.08)]">
      <div className="mb-3">
        <p className="text-sm font-semibold text-[#3a5272]">
          {totalCount.toLocaleString()} total record{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[#dde6f0]">
        <table className="min-w-full divide-y divide-[#dde6f0]">
          <thead className="bg-[#f7fafd]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.fieldKey}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-[#3a5272]"
                >
                  {col.headerName}
                  {col.sourceKey === 'calculated' && (
                    <span className="ml-1 font-normal normal-case text-[#7c3aed]" title="Calculated field">
                      ƒ
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dde6f0] bg-white">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-[#f7fafd]">
                {columns.map((col) => (
                  <td
                    key={col.fieldKey}
                    className="whitespace-nowrap px-4 py-3 text-sm text-[#3a5272]"
                  >
                    {formatCellValue(row[col.headerName], col.fieldType)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-[#7a95b5]">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-md p-2 text-[#3a5272] hover:bg-[#f7fafd] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onPageChange(num)}
                className={`h-8 w-8 rounded-md text-sm font-bold ${
                  num === page
                    ? "bg-[#1e5fa8] text-white"
                    : "text-[#3a5272] hover:bg-[#f7fafd]"
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md p-2 text-[#3a5272] hover:bg-[#f7fafd] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
