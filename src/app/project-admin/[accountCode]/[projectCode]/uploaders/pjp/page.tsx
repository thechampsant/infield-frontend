"use client";

import { useCallback, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  pjpUploadService,
  type PjpUploadResult,
} from "@/lib/api/pjp-upload-service";
import { useProjectContext } from "@/lib/project-admin/project-context";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PjpUploadPage() {
  const { projectId } = useProjectContext();

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<PjpUploadResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplate = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      const blob = await pjpUploadService.downloadTemplate(projectId);
      downloadBlob(blob, "PJP_Upload_Template.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Template download failed"));
    }
  }, [projectId]);

  const handleExport = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      const blob = await pjpUploadService.exportPjp(projectId);
      downloadBlob(blob, "PJP_Export.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Export failed"));
    }
  }, [projectId]);

  const handleBulkUpload = useCallback(
    async (file: File) => {
      if (!projectId) return;
      setUploading(true);
      setError(null);
      setSuccess(null);
      setUploadResult(null);
      try {
        const result = await pjpUploadService.bulkUpload(projectId, file);
        setUploadResult(result);
        if (result.inserted > 0 && result.rejected === 0) {
          setSuccess(
            `Successfully uploaded ${result.inserted} PJP entries.`,
          );
        } else if (result.inserted > 0 && result.rejected > 0) {
          setSuccess(
            `Uploaded ${result.inserted} entries. ${result.rejected} rows had errors (see below).`,
          );
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
      return;
    }
    handleBulkUpload(file);
  };

  return (
    <>
      {/* Page header */}
      <div className="pa-page-header">
        <div>
          <div className="pa-page-title">PJP Upload</div>
          <div className="pa-page-desc">
            Upload daily store visit plans (Permanent Journey Plan) for field users
          </div>
        </div>
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
            aria-label="Upload Excel file for PJP bulk upload"
          />
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            ↓ Export Current
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="pa-info-banner" style={{ marginBottom: 16 }}>
        <strong>How it works:</strong> Download the template → fill in{" "}
        <code>employeeId</code>, <code>storeCode</code>, and{" "}
        <code>date</code> (YYYY-MM-DD) → upload. Each row represents one
        planned store visit for a user on a given date. You can have multiple
        stores per user per day.
        <br />
        <br />
        <strong>Replace mode:</strong> Uploading PJP for the same user + date
        will replace all existing entries for that user on that date.
      </div>

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
            Row Errors ({uploadResult.rejected} of {uploadResult.total} rows):
          </strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.errors.slice(0, 15).map((err, i) => (
              <li key={i}>
                Row {err.row}
                {err.employeeId ? ` (${err.employeeId})` : ""}
                {err.storeCode ? ` / ${err.storeCode}` : ""}:{" "}
                {err.errors.join(", ")}
              </li>
            ))}
            {uploadResult.errors.length > 15 && (
              <li>...and {uploadResult.errors.length - 15} more errors</li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
