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
