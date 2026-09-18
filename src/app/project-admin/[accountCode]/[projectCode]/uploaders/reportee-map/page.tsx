"use client";

import { useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import { userReporteeMappingService } from "@/lib/api/user-reportee-mapping-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { MasterExportBanners } from "@/components/project-admin/uploaders/master-export-banners";
import { useMasterExport } from "@/hooks/use-master-export";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReporteeMapPage() {
  const { projectId } = useProjectContext();
  const masterExport = useMasterExport(projectId, "reportee-mapping");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    total: number;
    successCount: number;
    invalidCount: number;
    errors: { row: number | string; managerEmployeeId?: string; errors: string[] }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplate = async () => {
    if (!projectId) return;
    try {
      const blob = await userReporteeMappingService.downloadTemplate(projectId);
      downloadBlob(blob, "Reportee_Mapping_Template.xlsx");
    } catch {
      setError("Template download failed. Please try again.");
    }
  };

  const handleExport = () => {
    void masterExport.startExport();
  };

  const handleUpload = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result = await userReporteeMappingService.bulkUpload(projectId, file);
      setUploadResult(result);
      if (result.invalidCount > 0) {
        setError(
          `Upload completed: ${result.successCount} managers updated, ${result.invalidCount} rows had errors.`,
        );
      }
    } catch (err) {
      setError(formatApiError(err, "Reportee mapping upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }
    handleUpload(file);
  };

  return (
    <>
      <div className="pa-page-header">
        <div>
          <div className="pa-page-title">Reportee Mapping</div>
          <div className="pa-page-desc">
            Assign reportees to managers in bulk. Download the template, fill in
            manager and reportee employee IDs, then upload.
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
            {uploading ? "Uploading..." : "↑ Upload Mapping"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleFileChange}
            aria-label="Upload Excel file for reportee mapping"
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
      </div>

      <MasterExportBanners
        preparing={masterExport.preparing}
        job={masterExport.job}
        error={masterExport.error}
        onDownload={masterExport.downloadReady}
        onRetry={handleExport}
      />

      {/* Instructions */}
      <div
        className="pa-info-banner"
        style={{
          color: "var(--text-muted, #64748b)",
          background: "var(--bg-subtle, #f8fafc)",
          borderColor: "var(--border, #e2e8f0)",
          marginBottom: 16,
        }}
      >
        <strong>How it works:</strong>
        <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
          <li>Download the template — it lists all users in the project (active and inactive) with their employee IDs</li>
          <li>Fill in <code>managerEmployeeId</code> and <code>reporteeEmployeeId</code> — one manager→reportee pair per row (e.g. A→B on one row, A→C on the next)</li>
          <li>Upload the file — reportees will be assigned to managers after validation</li>
        </ol>
        <p style={{ margin: "8px 0 0", fontSize: 13 }}>
          Note: Do not put multiple reportees in one cell. Reportees must have a lower designation level than their manager.
          Each upload replaces existing reportees for the managers listed in the file.
          Users not in the file are left untouched.
          Inactive users are accepted and appear in red on Template and Export.
          Deactivating a user still clears their mapping. Live team reports still ignore inactive users.
        </p>
      </div>

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

      {uploadResult && uploadResult.successCount > 0 && !error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--green, #16a34a)",
            background: "var(--green-light, #f0fdf4)",
            borderColor: "var(--green-mid, #86efac)",
            marginBottom: 16,
          }}
        >
          Successfully updated reportees for {uploadResult.successCount} of{" "}
          {uploadResult.total} managers.
        </div>
      )}

      {uploadResult && uploadResult.errors.length > 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          <strong>
            Errors ({uploadResult.errors.length} rows):
          </strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.errors.slice(0, 15).map((err, i) => (
              <li key={i}>
                Row {err.row ?? i + 1}
                {err.managerEmployeeId ? ` (${err.managerEmployeeId})` : ""}:{" "}
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
