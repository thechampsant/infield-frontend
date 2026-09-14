"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Filter, Loader2, Play } from "lucide-react";
import { reportConfigService } from "@/lib/api/report-config-service";
import { ApiError } from "@/lib/api/api-client";
import { orientReportService } from "@/lib/api/orient-report-service";
import {
  isOrientProject,
  sourceKeyToOrientExportType,
  ORIENT_PROJECT_ID,
  defaultOrientLoadDateRange,
} from "@/lib/orient/orient-report.constants";
import { useProjectContext } from "@/lib/project-admin/project-context";
import type {
  ReportConfigDocument,
  ReportCalculatedField,
  ReportFilter,
  ReportSelectedColumn,
} from "@/lib/api/report-config-service";
import {
  formatExportDateRange,
  isExportJobInProgress,
  shouldAutoDownload,
  triggerSignedUrlDownload,
  type ReportExportJob,
} from "@/lib/reports/report-export-job";
import { ReportDataTable } from "./report-data-table";
import {
  REPORT_DATE_PRESETS,
  resolveReportDatePreset,
  type ReportDatePresetId,
} from "./report-date-presets";

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
  const { projectId: contextProjectId } = useProjectContext();

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

  // Global date range state — Orient defaults to last 7 days for fast Load
  const orientDefaults = isOrientProject(projectCode) ? defaultOrientLoadDateRange() : null;
  const [fromDate, setFromDate] = useState(orientDefaults?.fromDate ?? "");
  const [toDate, setToDate] = useState(orientDefaults?.toDate ?? "");
  const [activePreset, setActivePreset] = useState<ReportDatePresetId | null>(
    orientDefaults ? "last7" : null,
  );

  // Export job (async for every project)
  const [exportJob, setExportJob] = useState<ReportExportJob | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const sessionCreatedJobIds = useRef(new Set<string>());
  const autoDownloadedJobIds = useRef(new Set<string>());

  const applyPreset = useCallback((presetId: ReportDatePresetId) => {
    const range = resolveReportDatePreset(presetId);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setActivePreset(presetId);
  }, []);

  const handleFromDateChange = useCallback((value: string) => {
    setFromDate(value);
    setActivePreset(null);
  }, []);

  const handleToDateChange = useCallback((value: string) => {
    setToDate(value);
    setActivePreset(null);
  }, []);

  const clearDateRange = useCallback(() => {
    setFromDate("");
    setToDate("");
    setActivePreset(null);
  }, []);

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

  useEffect(() => {
    let mounted = true;
    async function restoreExportJob() {
      try {
        const latest = await reportConfigService.getLatestExportJob(reportId);
        if (!mounted || !latest) return;
        setExportJob(latest);
      } catch {
        /* no prior job */
      }
    }
    restoreExportJob();
    return () => {
      mounted = false;
    };
  }, [reportId]);

  useEffect(() => {
    if (!exportJob || !isExportJobInProgress(exportJob.status)) return;
    const timer = setInterval(async () => {
      try {
        const next = await reportConfigService.getExportJob(exportJob.jobId);
        setExportJob(next);
      } catch {
        /* keep last known status */
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [exportJob?.jobId, exportJob?.status]);

  useEffect(() => {
    if (!exportJob?.downloadUrl || exportJob.status !== "ready") return;
    if (
      !shouldAutoDownload({
        status: exportJob.status,
        jobId: exportJob.jobId,
        createdThisSession: sessionCreatedJobIds.current.has(exportJob.jobId),
        alreadyDownloaded: autoDownloadedJobIds.current.has(exportJob.jobId),
      })
    ) {
      return;
    }
    autoDownloadedJobIds.current.add(exportJob.jobId);
    triggerSignedUrlDownload(exportJob.downloadUrl, exportJob.fileName);
  }, [exportJob]);

  // Load data
  const handleLoadData = useCallback(
    async (requestedPage = page) => {
      if (!config) return;
      setLoadingData(true);
      setLoadError(null);

      const orientType = sourceKeyToOrientExportType(config.primarySource?.sourceKey);
      const useOrientApi = isOrientProject(projectCode) && !!orientType;
      const orientProjectId =
        contextProjectId || config.projectId || ORIENT_PROJECT_ID;

      const timeout = setTimeout(() => {
        setLoadError(
          "Still loading… large reports can take a few minutes. Keep waiting or narrow the date range.",
        );
      }, 45000);

      try {
        const result = useOrientApi
          ? await orientReportService.executeReport({
              exportType: orientType,
              projectId: orientProjectId,
              page: requestedPage,
              pageSize,
              fromDate: fromDate || undefined,
              toDate: toDate || undefined,
            })
          : await reportConfigService.executeReport({
              reportId,
              filters: filterValues,
              page: requestedPage,
              pageSize,
              fromDate: fromDate || undefined,
              toDate: toDate || undefined,
            });
        clearTimeout(timeout);
        setLoadError(null);
        setData(result.data || []);
        if (result.columns?.length) {
          setColumns(
            result.columns.map((c, i) => ({
              fieldKey: `orient-col-${i}`,
              sourceKey: config.primarySource?.sourceKey || "",
              headerName: c.key,
              order: i,
              fieldType: c.type as ReportSelectedColumn["fieldType"],
            })),
          );
        }
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
    [config, reportId, filterValues, page, pageSize, fromDate, toDate, projectCode, contextProjectId],
  );

  // Handle export — enqueue a job; poll + banner handle the rest
  const handleExport = useCallback(async () => {
    if (!config) return;
    setExportError(null);

    const projectId = contextProjectId || config.projectId || undefined;

    try {
      const queued = await reportConfigService.enqueueExportJob({
        reportId,
        filters: filterValues,
        format: config.outputSettings?.fileFormat || "xls",
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        projectId,
      });
      sessionCreatedJobIds.current.add(queued.jobId);
      setExportJob({
        jobId: queued.jobId,
        status: queued.status,
        reportId,
        format: config.outputSettings?.fileFormat || "xls",
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        progress: "Queued",
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const jobId =
          typeof err.details?.jobId === "string" ? err.details.jobId : undefined;
        if (jobId) {
          sessionCreatedJobIds.current.add(jobId);
          try {
            setExportJob(await reportConfigService.getExportJob(jobId));
            return;
          } catch {
            /* fall through */
          }
        }
      }
      setExportError(
        err instanceof Error ? err.message : "Failed to start export. Please try again.",
      );
    }
  }, [config, reportId, filterValues, fromDate, toDate, contextProjectId]);

  const handleDownloadReady = useCallback(() => {
    if (!exportJob?.downloadUrl) return;
    triggerSignedUrlDownload(exportJob.downloadUrl, exportJob.fileName);
  }, [exportJob]);

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
  const preparingExport = isExportJobInProgress(exportJob?.status);

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
        <div className="mb-3 flex flex-wrap gap-2">
          {REPORT_DATE_PRESETS.map((preset) => {
            const selected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={
                  selected
                    ? "rounded-md border border-[#1e5fa8] bg-[#1e5fa8] px-3 py-1.5 text-xs font-bold text-white"
                    : "rounded-md border border-[#c8d8eb] bg-white px-3 py-1.5 text-xs font-bold text-[#3a5272] hover:border-[#1e5fa8] hover:bg-[#f7fafd] hover:text-[#1e5fa8]"
                }
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-semibold text-[#3a5272]">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className="w-full rounded-md border border-[#c8d8eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-semibold text-[#3a5272]">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
              className="w-full rounded-md border border-[#c8d8eb] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ddeeff]"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                if (isOrientProject(projectCode)) {
                  const d = defaultOrientLoadDateRange();
                  setFromDate(d.fromDate);
                  setToDate(d.toDate);
                  setActivePreset("last7");
                } else {
                  clearDateRange();
                }
              }}
              className="rounded-md px-3 py-2 text-xs font-bold text-[#7a95b5] hover:bg-[#f7fafd] hover:text-[#3a5272]"
            >
              {isOrientProject(projectCode) ? "Reset (7 days)" : "Clear"}
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
          disabled={preparingExport || exportDisabled}
          className="inline-flex items-center gap-2 rounded-lg border border-[#c8d8eb] bg-white px-4 py-2 text-sm font-bold text-[#3a5272] hover:bg-[#f7fafd] disabled:opacity-50"
        >
          {preparingExport ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {preparingExport ? "Preparing Excel…" : "Export"}
        </button>
      </div>

      {preparingExport && (
        <div className="mb-4 rounded-lg border border-[#c8d8eb] bg-[#f0f6ff] p-3 text-sm text-[#1e5fa8]">
          <p className="font-bold">Preparing Excel…</p>
          <p className="mt-1 text-[#3a5272]">
            Date range: {formatExportDateRange(exportJob?.fromDate, exportJob?.toDate)}.
            You can keep using this page.
          </p>
        </div>
      )}

      {exportJob?.status === "ready" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#b7e4c7] bg-[#f0fdf4] p-3 text-sm text-[#166534]">
          <p className="font-bold">Excel is ready</p>
          <button
            type="button"
            onClick={handleDownloadReady}
            disabled={!exportJob.downloadUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-[#166534] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#14532d] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download Excel
          </button>
        </div>
      )}

      {exportJob?.status === "failed" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ffd5d3] bg-[#fff0ef] p-3 text-sm text-[#e8382d]">
          <p className="font-medium">{exportJob.error || "Export failed. Please try again."}</p>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-[#e8382d] bg-white px-3 py-1.5 text-xs font-bold text-[#e8382d] hover:bg-[#fff7f6]"
          >
            Retry
          </button>
        </div>
      )}

      {exportError && (
        <div className="mb-4 rounded-lg border border-[#ffd5d3] bg-[#fff0ef] p-3 text-sm font-medium text-[#e8382d]">
          {exportError}
        </div>
      )}

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
