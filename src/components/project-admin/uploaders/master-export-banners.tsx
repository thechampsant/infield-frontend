"use client";

import type { MasterExportJob } from "@/lib/api/master-export-service";

interface MasterExportBannersProps {
  preparing: boolean;
  job: MasterExportJob | null;
  error: string | null;
  onDownload: () => void;
  onRetry: () => void;
}

export function MasterExportBanners({
  preparing,
  job,
  error,
  onDownload,
  onRetry,
}: MasterExportBannersProps) {
  return (
    <>
      {preparing && (
        <div className="pa-info-banner" style={{ marginBottom: 16 }}>
          <strong>Preparing Excel…</strong> You can keep using this page. The file will download
          automatically when it is ready.
        </div>
      )}

      {job?.status === "ready" && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--green, #16a34a)",
            background: "var(--green-light, #f0fdf4)",
            borderColor: "var(--green-mid, #86efac)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <strong>Excel is ready</strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onDownload}
            disabled={!job.downloadUrl}
          >
            Download Excel
          </button>
        </div>
      )}

      {job?.status === "failed" && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{job.error || "Export failed. Please try again."}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
    </>
  );
}
