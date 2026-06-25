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
    return <span className="text-gray-400">-</span>;
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
          className="w-12 h-12 object-cover rounded"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            target.parentElement!.querySelector(".fallback-icon")?.classList.remove("hidden");
          }}
        />
        <ImageIcon className="fallback-icon hidden h-12 w-12 text-gray-300 p-2 border rounded" />
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
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
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
      <div className="text-center py-12">
        <p className="text-gray-500">No data available for the selected filters.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Total count */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          {totalCount.toLocaleString()} total record{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.fieldKey}
                  className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.headerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col.fieldKey}
                    className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
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
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onPageChange(num)}
                className={`w-8 h-8 text-sm rounded ${
                  num === page
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
