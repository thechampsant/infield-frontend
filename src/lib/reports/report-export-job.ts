export type ReportExportJobStatus = "queued" | "running" | "ready" | "failed";

export interface ReportExportJob {
  jobId: string;
  status: ReportExportJobStatus;
  reportId: string;
  format: "xls" | "csv";
  fromDate?: string;
  toDate?: string;
  fileName?: string;
  error?: string;
  progress?: string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function isExportJobInProgress(
  status?: ReportExportJobStatus | null,
): boolean {
  return status === "queued" || status === "running";
}

export function shouldAutoDownload(opts: {
  status: ReportExportJobStatus;
  jobId: string;
  createdThisSession: boolean;
  alreadyDownloaded: boolean;
}): boolean {
  return (
    opts.status === "ready" &&
    opts.createdThisSession &&
    !opts.alreadyDownloaded
  );
}

export function triggerSignedUrlDownload(url: string, fileName?: string): void {
  const a = document.createElement("a");
  a.href = url;
  if (fileName) a.download = fileName;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function formatExportDateRange(fromDate?: string, toDate?: string): string {
  if (fromDate && toDate) return `${fromDate} – ${toDate}`;
  if (fromDate) return `from ${fromDate}`;
  if (toDate) return `until ${toDate}`;
  return "the selected range";
}

/** Parse "Generating Excel… 50 / 800" (or similar) into numbers for the progress bar. */
export function parseExcelProgress(
  progress?: string | null,
): { written: number; total: number; percent: number } | null {
  if (!progress) return null;
  const match = progress.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  const written = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(written) || !Number.isFinite(total) || total <= 0) return null;
  return {
    written,
    total,
    percent: Math.min(100, Math.max(0, Math.round((written / total) * 100))),
  };
}
