"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { reportConfigService } from "@/lib/api/report-config-service";
import type {
  ReportConfigDocument,
  ReportFilter,
  ReportSelectedColumn,
  ExecuteReportResponse,
} from "@/lib/api/report-config-service";
import { ReportDataTable } from "./report-data-table";

interface ReportViewPageProps {
  accountCode: string;
  projectCode: string;
  reportId: string;
}

export function ReportViewPage({
  accountCode,
  projectCode,
  reportId,
}: ReportViewPageProps) {
  const router = useRouter();
  const baseUrl = `/project-admin/${accountCode}/${projectCode}/reports`;

  const [config, setConfig] = useState<ReportConfigDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<ReportSelectedColumn[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter state
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});

  // Global date range state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Export state
  const [exporting, setExporting] = useState(false);

  // Load config
  useEffect(() => {
    let mounted = true;
    async function loadConfig() {
      try {
        setLoading(true);
        const cfg = await reportConfigService.getConfig(reportId);
        if (!mounted) return;
        setConfig(cfg);
        setColumns(cfg.selectedColumns || []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadConfig();
    return () => {
      mounted = false;
    };
  }, [reportId]);

  // Load data
  const handleLoadData = useCallback(
    async (requestedPage = page) => {
      if (!config) return;
      setLoadingData(true);
      setLoadError(null);

      const timeout = setTimeout(() => {
        setLoadingData(false);
        setLoadError("Request timed out. Please try again.");
      }, 60000);

      try {
        const result = await reportConfigService.executeReport({
          reportId,
          filters: filterValues,
          page: requestedPage,
          pageSize,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        clearTimeout(timeout);
        setData(result.data || []);
        setTotalCount((result as any).meta?.totalCount ?? result.totalCount ?? 0);
        setPage(requestedPage);
        setDataLoaded(true);
      } catch (err) {
        clearTimeout(timeout);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load report data",
        );
      } finally {
        setLoadingData(false);
      }
    },
    [config, reportId, filterValues, page, pageSize, fromDate, toDate],
  );

  // Handle export
  const handleExport = useCallback(async () => {
    if (!config) return;
    setExporting(true);

    const timeout = setTimeout(() => {
      setExporting(false);
      setLoadError("Export timed out. Please apply filters to reduce the dataset.");
    }, 120000);

    try {
      const blob = await reportConfigService.exportReport({
        reportId,
        filters: filterValues,
        format: config.outputSettings?.fileFormat || "xls",
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      clearTimeout(timeout);

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${config.reportName || "report"}.${config.outputSettings?.fileFormat === "csv" ? "csv" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      clearTimeout(timeout);
      setLoadError(
        err instanceof Error ? err.message : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }, [config, reportId, filterValues, fromDate, toDate]);

  // Handle page change
  const handlePageChange = useCallback(
    (newPage: number) => {
      handleLoadData(newPage);
    },
    [handleLoadData],
  );

  // Update filter value
  const handleFilterChange = useCallback(
    (fieldKey: string, value: unknown) => {
      setFilterValues((prev) => ({ ...prev, [fieldKey]: value }));
    },
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-red-600 mb-4">{error || "Report not found"}</p>
        <button
          type="button"
          onClick={() => router.push(baseUrl)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  const isDirectExport = config.outputSettings?.exportBehaviour === "direct";
  const exportDisabled = !isDirectExport && !dataLoaded;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push(baseUrl)}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{config.reportName}</h1>
        {config.description && (
          <p className="text-sm text-gray-500 mt-1">{config.description}</p>
        )}
      </div>

      {/* Global Date Range — always visible */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Date Range</h3>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-gray-400 mt-4">→</span>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => { setFromDate(""); setToDate(""); }}
              className="mt-4 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {config.filters && config.filters.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {config.filters.map((filter) => (
              <FilterControl
                key={filter.fieldKey}
                filter={filter}
                value={filterValues[filter.fieldKey]}
                onChange={(val) => handleFilterChange(filter.fieldKey, val)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        {!isDirectExport && (
          <button
            type="button"
            onClick={() => handleLoadData(1)}
            disabled={loadingData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingData && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingData ? "Loading..." : "Load"}
          </button>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || exportDisabled}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Exporting..." : "Export"}
        </button>
      </div>

      {/* Error */}
      {loadError && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Data Table */}
      {dataLoaded && (
        <ReportDataTable
          columns={columns}
          data={data}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

// ─── Filter Control Component ─────────────────────────────────────────────────

function FilterControl({
  filter,
  value,
  onChange,
}: {
  filter: ReportFilter;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (filter.controlType) {
    case "date-range":
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {filter.fieldKey}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={(value as Record<string, string>)?.start || ""}
              onChange={(e) =>
                onChange({ ...(value as Record<string, string>), start: e.target.value })
              }
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="date"
              value={(value as Record<string, string>)?.end || ""}
              onChange={(e) =>
                onChange({ ...(value as Record<string, string>), end: e.target.value })
              }
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      );

    case "numeric-range":
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {filter.fieldKey}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={(value as Record<string, number>)?.min ?? ""}
              onChange={(e) =>
                onChange({
                  ...(value as Record<string, number>),
                  min: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={(value as Record<string, number>)?.max ?? ""}
              onChange={(e) =>
                onChange({
                  ...(value as Record<string, number>),
                  max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      );

    case "toggle":
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {filter.fieldKey}
          </label>
          <select
            value={value === undefined || value === null ? "all" : String(value)}
            onChange={(e) => {
              if (e.target.value === "all") onChange(undefined);
              else onChange(e.target.value === "true");
            }}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      );

    case "text-search":
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {filter.fieldKey}
          </label>
          <input
            type="text"
            placeholder="Search..."
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      );

    case "dropdown":
    default:
      return (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {filter.fieldKey}
          </label>
          <input
            type="text"
            placeholder="Enter values (comma-separated)"
            value={Array.isArray(value) ? (value as string[]).join(", ") : (value as string) || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (!val.trim()) {
                onChange(undefined);
              } else {
                onChange(val.split(",").map((v) => v.trim()).filter(Boolean));
              }
            }}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      );
  }
}
