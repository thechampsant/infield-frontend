"use client";

import { useCallback, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  leaveBalanceUploadService,
  type LeaveBalanceUploadResult,
} from "@/lib/api/leave-balance-upload-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { MasterExportBanners } from "@/components/project-admin/uploaders/master-export-banners";
import {
  UploadAuditHistoryButton,
  UploadErrorLogButton,
} from "@/components/project-admin/uploaders/upload-audit-history";
import { useLeaveModuleEnabled } from "@/hooks/use-leave-module-enabled";
import { useMasterExport } from "@/hooks/use-master-export";

const MAX_LISTED_ROWS = 15;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function resultSummary(result: LeaveBalanceUploadResult): string {
  const cells = `${result.updatedCells} balance${result.updatedCells === 1 ? "" : "s"} updated, ${result.unchangedCells} unchanged`;
  if (result.invalidCount === 0) {
    return `Processed ${result.total} employee row${result.total === 1 ? "" : "s"}: ${cells}.`;
  }
  return `Processed ${result.total} rows: ${cells}. ${result.invalidCount} row${result.invalidCount === 1 ? "" : "s"} had errors (see below).`;
}

export default function LeaveBalanceUploadPage() {
  const { projectId } = useProjectContext();
  const leaveEnabled = useLeaveModuleEnabled(projectId);
  const masterExport = useMasterExport(projectId, "leave-balance");

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<LeaveBalanceUploadResult | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplate = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      const blob = await leaveBalanceUploadService.downloadTemplate(projectId);
      downloadBlob(blob, "Leave_Balance_Template.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Template download failed"));
    }
  }, [projectId]);

  const handleExport = useCallback(() => {
    void masterExport.startExport();
  }, [masterExport]);

  const handleBulkUpload = useCallback(
    async (file: File) => {
      if (!projectId) return;
      setUploading(true);
      setError(null);
      setSuccess(null);
      setUploadResult(null);
      try {
        const result = await leaveBalanceUploadService.bulkUpload(projectId, file);
        setUploadResult(result);
        setHistoryRefresh((n) => n + 1);
        if (result.updatedCells > 0 || result.unchangedCells > 0) {
          setSuccess(resultSummary(result));
        }
      } catch (err) {
        setError(formatApiError(err, "Upload failed"));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [projectId],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const confirmed = window.confirm(
      "Each filled cell replaces the employee's current balance for that leave type (it is not added). Blank cells are left unchanged. Continue?",
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    handleBulkUpload(file);
  };

  return (
    <>
      {/* Page header */}
      <div className="pa-page-header">
        <div>
          <div className="pa-page-title">Leave Balance</div>
          <div className="pa-page-desc">
            Set employee leave balances in bulk for the leave types in Leave Configuration
          </div>
        </div>
        {leaveEnabled && (
          <div className="pa-actions">
            <button type="button" className="btn btn-secondary" onClick={handleTemplate}>
              ↓ Template
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading..." : "↑ Bulk Upload"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFileChange}
              aria-label="Upload Excel file for Leave Balance bulk upload"
            />
            <UploadAuditHistoryButton
              projectId={projectId}
              kinds={["leave-balance"]}
              refreshToken={historyRefresh}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleExport}
              disabled={masterExport.preparing}
            >
              {masterExport.preparing ? "Preparing Excel…" : "↓ Export Current"}
            </button>
          </div>
        )}
      </div>

      {leaveEnabled === false && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
          }}
        >
          <strong>Leave is not enabled for this project.</strong> Activate Leave from Modules to use the Leave Balance uploader.
        </div>
      )}

      {leaveEnabled && (
        <>
          <MasterExportBanners
            preparing={masterExport.preparing}
            job={masterExport.job}
            error={masterExport.error}
            onDownload={masterExport.downloadReady}
            onRetry={handleExport}
          />

          {/* Info banner */}
          <div className="pa-info-banner" style={{ marginBottom: 16 }}>
            <strong>How it works:</strong> Download the template → it has{" "}
            <code>employeeId</code> plus one column per leave type short code configured in Leave
            Configuration → enter each employee&apos;s balances → upload. Use{" "}
            <strong>Export Current</strong> to start from today&apos;s balances.
            <br />
            <br />
            <strong>Replace mode:</strong> an uploaded value replaces the employee&apos;s current
            balance for that leave type; it is not added to it. Blank cells are left unchanged. Use 0
            or a positive number with up to 2 decimals. A value is applied only if that leave type is
            in the employee&apos;s leave policy.
          </div>
        </>
      )}

      {/* Error banner */}
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

      {/* Success banner */}
      {success && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--green, #16a34a)",
            background: "var(--green-light, #f0fdf4)",
            borderColor: "var(--green-mid, #86efac)",
            marginBottom: 16,
          }}
        >
          {success}
        </div>
      )}

      {/* Warnings: applied, but worth a look */}
      {uploadResult && uploadResult.warnings.length > 0 && (
        <div
          className="pa-info-banner"
          style={{ marginBottom: 16, maxHeight: 220, overflow: "auto" }}
        >
          <strong>Warnings ({uploadResult.warnings.length} rows) — balances were updated:</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.warnings.slice(0, MAX_LISTED_ROWS).map((warning, i) => (
              <li key={i}>
                Row {warning.row}
                {warning.employeeId ? ` (${warning.employeeId})` : ""}:{" "}
                {(warning.warnings ?? []).join(" ")}
              </li>
            ))}
            {uploadResult.warnings.length > MAX_LISTED_ROWS && (
              <li>...and {uploadResult.warnings.length - MAX_LISTED_ROWS} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Upload error details */}
      {uploadResult && uploadResult.errors.length > 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          <strong>
            Row Errors ({uploadResult.invalidCount} of {uploadResult.total} rows):
          </strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.errors.slice(0, MAX_LISTED_ROWS).map((err, i) => (
              <li key={i}>
                Row {err.row}
                {err.employeeId ? ` (${err.employeeId})` : ""}:{" "}
                {(err.errors ?? []).join(" ")}
              </li>
            ))}
            {uploadResult.errors.length > MAX_LISTED_ROWS && (
              <li>...and {uploadResult.errors.length - MAX_LISTED_ROWS} more errors</li>
            )}
          </ul>
          <div style={{ marginTop: 8 }}>
            <UploadErrorLogButton
              projectId={projectId}
              auditId={uploadResult.auditId}
              hasErrorLog={uploadResult.hasErrorLog}
            />
          </div>
        </div>
      )}
    </>
  );
}
