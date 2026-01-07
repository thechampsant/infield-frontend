"use client";

import { Eye, Filter, Pencil, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";
import { Input } from "./input";

export type DataTableProps<T> = {
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  data: T[];
  columns: DataTableColumn<T>[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  className?: string;
};

export type DataTableColumn<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  title,
  description,
  searchPlaceholder = "Search...",
  data,
  columns,
  pagination,
  onSearch,
  onFilter,
  className,
}: DataTableProps<T>) {
  const startItem = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 1;
  const endItem = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : data.length;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--orca-border)] bg-[var(--orca-surface)]",
        className
      )}
    >
      {/* Header */}
      {(title || onSearch || onFilter) && (
        <div className="flex flex-col gap-4 border-b border-[var(--orca-border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          {(title || description) && (
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-[var(--orca-text)]">{title}</h3>
              )}
              {description && (
                <p className="mt-0.5 text-sm text-[var(--orca-text-3)]">{description}</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            {onSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--orca-text-3)]" />
                <Input
                  placeholder={searchPlaceholder}
                  className="w-[240px] pl-9"
                  onChange={(e) => onSearch(e.target.value)}
                />
              </div>
            )}
            {onFilter && (
              <Button variant="secondary" onClick={onFilter}>
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--orca-border)]">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--orca-border)] text-[var(--orca-brand)]"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]",
                    col.sortable && "cursor-pointer hover:text-[var(--orca-text)]",
                    col.className
                  )}
                >
                  {col.header}
                  {col.sortable && <span className="ml-1">↕</span>}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--orca-text-3)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-[var(--orca-border-light)] last:border-b-0 hover:bg-[var(--orca-surface-2)] transition-colors"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--orca-border)] text-[var(--orca-brand)]"
                  />
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-[var(--orca-text)]", col.className)}
                  >
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <ActionButton icon={Eye} label="View" />
                    <ActionButton icon={Pencil} label="Edit" />
                    <ActionButton icon={Trash2} label="Delete" variant="danger" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--orca-border)] px-5 py-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-[var(--orca-text-3)]">
            <span>Show</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="h-8 rounded-lg border border-[var(--orca-border)] bg-[var(--orca-surface)] px-2 text-sm text-[var(--orca-text)]"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>entries</span>
          </div>

          <div className="text-sm text-[var(--orca-text-3)]">
            Showing {startItem} to {endItem} of {pagination.total} entries
          </div>

          <div className="flex items-center gap-1">
            <PaginationBtn
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange?.(pagination.page - 1)}
            >
              Previous
            </PaginationBtn>
            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationBtn
                  key={pageNum}
                  active={pagination.page === pageNum}
                  onClick={() => pagination.onPageChange?.(pageNum)}
                >
                  {pageNum}
                </PaginationBtn>
              );
            })}
            <PaginationBtn
              disabled={pagination.page >= totalPages}
              onClick={() => pagination.onPageChange?.(pagination.page + 1)}
            >
              Next
            </PaginationBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  variant = "default",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "default" | "danger";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        variant === "default" &&
          "text-[var(--orca-text-3)] hover:bg-[var(--orca-surface-2)] hover:text-[var(--orca-text)]",
        variant === "danger" &&
          "text-[var(--orca-text-3)] hover:bg-[var(--orca-brand-4-light)] hover:text-[var(--orca-brand-4)]"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PaginationBtn({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--orca-brand)] text-white"
          : "text-[var(--orca-text-2)] hover:bg-[var(--orca-surface-2)]",
        disabled && "pointer-events-none opacity-50"
      )}
    >
      {children}
    </button>
  );
}

