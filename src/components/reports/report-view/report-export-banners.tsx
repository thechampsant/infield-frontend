"use client";

import { Download, Loader2 } from "lucide-react";
import {
  formatExportDateRange,
  parseExcelProgress,
  type ReportExportJob,
} from "@/lib/reports/report-export-job";

interface ReportExportBannersProps {
  preparing: boolean;
  job: ReportExportJob | null;
  error: string | null;
  onDownload: () => void;
  onRetry: () => void;
}

export function ReportExportBanners({
  preparing,
  job,
  error,
  onDownload,
  onRetry,
}: ReportExportBannersProps) {
  const parsed = parseExcelProgress(job?.progress);
  const progressLabel = job?.progress || "Queued";

  return (
    <>
      {preparing && (
        <div className="mb-4 rounded-lg border border-[#c8d8eb] bg-[#f0f6ff] p-4 text-sm text-[#1e5fa8]">
          <div className="mb-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <p className="font-bold">Preparing Excel…</p>
          </div>

          <p className="mb-2 font-medium text-[#0c1929]">
            {parsed
              ? `Generating Excel… ${parsed.written.toLocaleString()} / ${parsed.total.toLocaleString()}`
              : progressLabel}
            {parsed ? ` (${parsed.percent}%)` : null}
          </p>

          <div
            className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-[#dbe7f5]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={parsed?.percent ?? (job?.status === "queued" ? 0 : undefined)}
            aria-label={progressLabel}
          >
            <div
              className="h-full rounded-full bg-[#1e5fa8] transition-[width] duration-300 ease-out"
              style={{
                width: parsed
                  ? `${parsed.percent}%`
                  : job?.status === "running"
                    ? "35%"
                    : "8%",
                ...(parsed
                  ? {}
                  : {
                      animation: "report-export-pulse 1.2s ease-in-out infinite",
                    }),
              }}
            />
          </div>

          <p className="text-[#3a5272]">
            Date range: {formatExportDateRange(job?.fromDate, job?.toDate)}.
            You can switch tabs. The file will download automatically when it is ready.
          </p>

          <style jsx>{`
            @keyframes report-export-pulse {
              0%,
              100% {
                opacity: 0.55;
              }
              50% {
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}

      {job?.status === "ready" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#b7e4c7] bg-[#f0fdf4] p-3 text-sm text-[#166534]">
          <p className="font-bold">Excel is ready</p>
          <button
            type="button"
            onClick={onDownload}
            disabled={!job.downloadUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-[#166534] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#14532d] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download Excel
          </button>
        </div>
      )}

      {job?.status === "failed" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ffd5d3] bg-[#fff0ef] p-3 text-sm text-[#e8382d]">
          <p className="font-medium">{job.error || "Export failed. Please try again."}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-[#e8382d] bg-white px-3 py-1.5 text-xs font-bold text-[#e8382d] hover:bg-[#fff7f6]"
          >
            Retry
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-[#ffd5d3] bg-[#fff0ef] p-3 text-sm font-medium text-[#e8382d]">
          {error}
        </div>
      )}
    </>
  );
}
