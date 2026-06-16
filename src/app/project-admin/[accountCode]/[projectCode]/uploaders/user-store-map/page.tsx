"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  userStoreMappingService,
  type MappedUser,
  type BulkMappingResult,
} from "@/lib/api/user-store-mapping-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { UserStoreMapTable } from "@/components/project-admin/uploaders/user-store-map/user-store-map-table";
import type { StoreRecord } from "@/lib/api/store-service";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function UserStoreMapPage() {
  const { projectId } = useProjectContext();

  const [users, setUsers] = useState<MappedUser[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkMappingResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [userList, storeList] = await Promise.all([
        userStoreMappingService.listUsersWithMapping(projectId),
        userStoreMappingService.listStores(projectId),
      ]);
      setUsers(userList);
      setStores(storeList);
    } catch (err) {
      setError(formatApiError(err, "Failed to load user-store mapping data"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTemplate = async () => {
    if (!projectId) return;
    try {
      const blob = await userStoreMappingService.downloadTemplate(projectId);
      downloadBlob(blob, "UserStore_Mapping_Template.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Template download failed"));
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    try {
      const blob = await userStoreMappingService.exportMapping(projectId);
      downloadBlob(blob, "UserStore_Mapping_Export.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Export failed"));
    }
  };

  const handleBulkUpload = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result = await userStoreMappingService.bulkUpload(projectId, file);
      setUploadResult(result);
      if (result.successCount > 0) {
        load();
      }
      if (result.invalidCount > 0) {
        setError(
          `Upload completed: ${result.successCount} mappings updated, ${result.invalidCount} rows had errors.`,
        );
      }
    } catch (err) {
      setError(formatApiError(err, "Bulk upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }
    handleBulkUpload(file);
  };

  const mappedCount = users.filter((u) => u.mappedStoreIds.length > 0).length;

  return (
    <>
      {/* Page header */}
      <div className="pa-page-header">
        <div>
          <div className="pa-page-title">User–Store Mapping</div>
          <div className="pa-page-desc">
            Assign stores directly to users for <em>direct_store</em> visit mode
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
            aria-label="Upload Excel file for bulk user-store mapping"
          />
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            ↓ Export
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="pa-info-banner" style={{ marginBottom: 16 }}>
        <strong>How it works:</strong> Assign one or more stores to each user. In{" "}
        <em>direct_store</em> mode, users only see their assigned stores during visits.
        Currently <strong>{mappedCount} of {users.length}</strong> users have store
        mappings. Use <em>Template</em> → fill storeCodes (comma-separated) → <em>Bulk Upload</em> for mass assignment.
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

      {/* Upload success banner */}
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
          Successfully updated {uploadResult.successCount} of {uploadResult.total} user mappings.
        </div>
      )}

      {/* Upload error detail */}
      {uploadResult && uploadResult.errors.length > 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
            maxHeight: 180,
            overflow: "auto",
          }}
        >
          <strong>Upload Errors ({uploadResult.errors.length} rows):</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                Row {err.row ?? i + 2}
                {err.employeeId ? ` (${err.employeeId})` : ""}: {err.errors.join(", ")}
              </li>
            ))}
            {uploadResult.errors.length > 10 && (
              <li>...and {uploadResult.errors.length - 10} more errors</li>
            )}
          </ul>
        </div>
      )}

      {/* No stores guard */}
      {!loading && stores.length === 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
          }}
        >
          <strong>No stores found.</strong> Add stores in the Stores Master tab before
          creating user-store mappings.
        </div>
      )}

      {/* Main table */}
      <UserStoreMapTable
        users={users}
        stores={stores}
        loading={loading}
        onRefresh={load}
      />
    </>
  );
}
