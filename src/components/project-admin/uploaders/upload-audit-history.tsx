"use client";

import { useCallback, useEffect, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  DEFAULT_LIST_PAGE_SIZE,
  LIST_PAGE_SIZE_OPTIONS,
  type ListMeta,
} from "@/lib/api/pagination";
import {
  downloadBlob,
  UPLOAD_AUDIT_KIND_LABELS,
  uploadAuditService,
  type UploadAuditKind,
  type UploadAuditRow,
} from "@/lib/api/upload-audit-service";

export function UploadErrorLogButton({
  projectId,
  auditId,
  hasErrorLog,
  fileName,
}: {
  projectId: string;
  auditId?: string;
  hasErrorLog?: boolean;
  fileName?: string;
}) {
  const [busy, setBusy] = useState(false);
  if (!auditId || !hasErrorLog) return null;

  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const blob = await uploadAuditService.downloadErrorLog(auditId, projectId);
          downloadBlob(blob, fileName || "upload_errors.xlsx");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Downloading…" : "Download error log"}
    </button>
  );
}

export function UploadAuditHistory({
  projectId,
  kinds,
  refreshToken = 0,
  showKind = false,
}: {
  projectId: string;
  kinds: UploadAuditKind[];
  refreshToken?: number;
  showKind?: boolean;
}) {
  const [rows, setRows] = useState<UploadAuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [meta, setMeta] = useState<ListMeta>({
    page: 1,
    pageSize: DEFAULT_LIST_PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const kindKey = kinds.join(",");

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await uploadAuditService.list(projectId, kindKey.split(","), page, pageSize);
      setRows(result.data);
      setMeta(result.meta);
      if (page > result.meta.totalPages) {
        setPage(Math.max(1, result.meta.totalPages));
      }
    } catch (err) {
      setError(formatApiError(err, "Failed to load upload history"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, kindKey, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  async function handleDownload(row: UploadAuditRow, variant: "file" | "error-log") {
    setDownloadingId(`${row.id}:${variant}`);
    try {
      const blob =
        variant === "file"
          ? await uploadAuditService.downloadFile(row.id, projectId)
          : await uploadAuditService.downloadErrorLog(row.id, projectId);
      const suffix = variant === "error-log" ? "_errors.xlsx" : row.originalFileName;
      downloadBlob(
        blob,
        variant === "error-log"
          ? row.originalFileName.replace(/\.xlsx?$/i, "") + suffix
          : suffix,
      );
    } catch (err) {
      setError(formatApiError(err, "Failed to download file"));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className="data-table-wrap" style={{ marginTop: 24 }}>
      <div className="data-table-toolbar">
        <strong>Upload history</strong>
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
          All Project Admins on this project can see these files
        </span>
      </div>

      {error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            margin: 16,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>File</th>
              {showKind && <th style={thStyle}>Kind</th>}
              <th style={thStyle}>Uploaded by</th>
              <th style={thStyle}>When</th>
              <th style={thStyle}>Passed</th>
              <th style={thStyle}>Failed</th>
              <th style={thStyle}>File</th>
              <th style={thStyle}>Error log</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={showKind ? 8 : 7} style={tdStyle}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={showKind ? 8 : 7} style={tdStyle}>
                  No uploads stored yet
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td style={tdStyle}>{row.originalFileName}</td>
                  {showKind && (
                    <td style={tdStyle}>
                      {UPLOAD_AUDIT_KIND_LABELS[row.kind] || row.kind}
                    </td>
                  )}
                  <td style={tdStyle}>{row.uploadedByName}</td>
                  <td style={tdStyle}>
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </td>
                  <td style={tdStyle}>{formatCount(row.summary?.successCount)}</td>
                  <td style={tdStyle}>{formatCount(row.summary?.invalidCount)}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!row.canDownload || downloadingId === `${row.id}:file`}
                      onClick={() => void handleDownload(row, "file")}
                    >
                      {downloadingId === `${row.id}:file` ? "…" : "Download"}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!row.hasErrorLog || downloadingId === `${row.id}:error-log`}
                      onClick={() => void handleDownload(row, "error-log")}
                    >
                      {downloadingId === `${row.id}:error-log` ? "…" : "Download"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderTop: "1px solid var(--border)",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
          Show
          <select
            value={pageSize}
            aria-label="Upload history page size"
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{ marginLeft: 6, marginRight: 6 }}
          >
            {LIST_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          per page
        </label>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {meta.totalCount} upload{meta.totalCount === 1 ? "" : "s"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: 11, alignSelf: "center" }}>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= meta.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

function formatCount(value?: number) {
  return typeof value === "number" ? value : "—";
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "var(--text-muted)",
  borderBottom: "1px solid var(--border)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  borderBottom: "1px solid var(--border)",
};
