"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Filter, Loader2, Play } from "lucide-react";
import { reportConfigService } from "@/lib/api/report-config-service";
import type {
  ReportConfigDocument,
  ReportCalculatedField,
  ReportFilter,
  ReportSelectedColumn,
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

        // Build full column list: selected source columns + calculated fields
        const calcColumns = (cfg.calculatedFields || []).map((cf: ReportCalculatedField) => ({
          fieldKey: cf.fieldName,
          sourceKey: 'calculated',
          headerName: cf.fieldName,
          order: (cfg.selectedColumns?.length || 0) + cf.order,
          fieldType:
            cf.dataType === 'number' ? 'NUM'
            : cf.dataType === 'date' ? 'DATE'
            : cf.dataType === 'boolean' ? 'BOOL'
            : 'TXT',
        }));
        setColumns([...(cfg.selectedColumns || []), ...calcColumns]);
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
        const meta = "meta" in result ? result.meta : undefined;
        setTotalCount(meta?.totalCount ?? result.totalCount ?? 0);
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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-[#ffd5d3] bg-[#fff0ef] p-8 text-center">
        <p className="mb-4 text-sm font-medium text-[#e8382d]">{error || "Report not found"}</p>
        <button
          type="button"
          onClick={() => router.push(baseUrl)}
          className="rounded-lg bg-[#1e5fa8] px-4 py-2 text-sm font-bold text-white hover:bg-[#174d88]"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  const isDirectExport = config.outputSettings?.exportBehaviour === "direct";
  const exportDisabled = !isDirectExport && !dataLoaded;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push(baseUrl)}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#3a5272] hover:text-[#1e5fa8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1e5fa8]">Report Viewer</p>
        <h1 className="mt-1 text-2xl font-bold text-[#0c1929]">{config.reportName}</h1>
        {config.description && (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#3a5272]">{config.description}</p>
        )}
      </div>

      <section className="mb-4 rounded-lg border border-[#dde6f0] bg-white p-4 shadow-[0_2px_8px_rgba(30,95,168,0.08)]">
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#1e5fa8]" />
          <h3 className="text-sm font-bold text-[#0c1929]">Date Range</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-semibold text-[#3a5272]">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-md border border-[#c8d8eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-semibold text-[#3a5272]">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-md border border-[#c8d8eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => { setFromDate(""); setToDate(""); }}
              className="rounded-md px-3 py-2 text-xs font-bold text-[#7a95b5] hover:bg-[#f7fafd] hover:text-[#3a5272]"
            >
              Clear
            </button>
          )}
        </div>
      </section>

      {/* Filters */}
      {config.filters && config.filters.length > 0 && (
        <section className="mb-6 rounded-lg border border-[#dde6f0] bg-white p-4 shadow-[0_2px_8px_rgba(30,95,168,0.08)]">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#1e5fa8]" />
            <h3 className="text-sm font-bold text-[#0c1929]">Filters</h3>
          </div>
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
        </section>
      )}

      {/* Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {!isDirectExport && (
          <button
            type="button"
            onClick={() => handleLoadData(1)}
            disabled={loadingData}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fa8] px-4 py-2 text-sm font-bold text-white hover:bg-[#174d88] disabled:opacity-50"
          >
            {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loadingData ? "Loading..." : "Load"}
          </button>
        )}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || exportDisabled}
          className="inline-flex items-center gap-2 rounded-lg border border-[#c8d8eb] bg-white px-4 py-2 text-sm font-bold text-[#3a5272] hover:bg-[#f7fafd] disabled:opacity-50"
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
        <div className="mb-4 rounded-lg border border-[#ffd5d3] bg-[#fff0ef] p-3 text-sm font-medium text-[#e8382d]">
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
          <label className="mb-1 block text-xs font-semibold text-[#3a5272]">
            {filter.fieldKey}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={(value as Record<string, string>)?.start || ""}
              onChange={(e) =>
                onChange({ ...(value as Record<string, string>), start: e.target.value })
              }
              className="rounded-md border border-[#c8d8eb] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
            />
            <input
              type="date"
              value={(value as Record<string, string>)?.end || ""}
              onChange={(e) =>
                onChange({ ...(value as Record<string, string>), end: e.target.value })
              }
              className="rounded-md border border-[#c8d8eb] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
            />
          </div>
        </div>
      );

    case "numeric-range":
      return (
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#3a5272]">
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
              className="rounded-md border border-[#c8d8eb] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
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
              className="rounded-md border border-[#c8d8eb] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
            />
          </div>
        </div>
      );

    case "toggle":
      return (
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#3a5272]">
            {filter.fieldKey}
          </label>
          <select
            value={value === undefined || value === null ? "all" : String(value)}
            onChange={(e) => {
              if (e.target.value === "all") onChange(undefined);
              else onChange(e.target.value === "true");
            }}
            className="w-full rounded-md border border-[#c8d8eb] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
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
          <label className="mb-1 block text-xs font-semibold text-[#3a5272]">
            {filter.fieldKey}
          </label>
          <input
            type="text"
            placeholder="Search..."
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="w-full rounded-md border border-[#c8d8eb] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
          />
        </div>
      );

    case "dropdown":
    default:
      return (
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#3a5272]">
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
            className="w-full rounded-md border border-[#c8d8eb] px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
          />
        </div>
      );
  }
}
