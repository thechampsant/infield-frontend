"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  userReporteeMappingService,
  type ReporteeBulkMappingResult,
  type UserListStatus,
  type UserReporteeMappingFilter,
  type UserReporteeMappingSummary,
} from "@/lib/api/user-reportee-mapping-service";
import { DEFAULT_LIST_PAGE_SIZE, type ListMeta } from "@/lib/api/pagination";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { MasterExportBanners } from "@/components/project-admin/uploaders/master-export-banners";
import { ReporteeMapTable } from "@/components/project-admin/uploaders/reportee-map/reportee-map-table";
import { useMasterExport } from "@/hooks/use-master-export";

const SEARCH_DEBOUNCE_MS = 300;

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
  const [users, setUsers] = useState<UserReporteeMappingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<ReporteeBulkMappingResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mappedFilter, setMappedFilter] = useState<UserReporteeMappingFilter>("all");
  const [statusFilter, setStatusFilter] = useState<UserListStatus>("all");
  const [meta, setMeta] = useState<
    ListMeta & { mappedCount: number; unmappedCount: number; activeCount: number; inactiveCount: number }
  >({
    page: 1,
    pageSize: DEFAULT_LIST_PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
    mappedCount: 0,
    unmappedCount: 0,
    activeCount: 0,
    inactiveCount: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await userReporteeMappingService.listPage(
        projectId,
        page,
        pageSize,
        debouncedSearch,
        mappedFilter,
        statusFilter,
      );
      setUsers(result.data);
      setMeta(result.meta);
      if (page > result.meta.totalPages) {
        setPage(Math.max(1, result.meta.totalPages));
      }
    } catch (err) {
      setError(formatApiError(err, "Failed to load reportee mapping data"));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, debouncedSearch, mappedFilter, statusFilter]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch((prev) => {
        if (prev !== next) {
          setPage(1);
        }
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMappedFilterChange = (next: UserReporteeMappingFilter) => {
    setMappedFilter(next);
    setPage(1);
  };

  const handleStatusFilterChange = (next: UserListStatus) => {
    setStatusFilter(next);
    setPage(1);
  };

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

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
      if (result.successCount > 0) {
        load();
      }
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
            Assign reportees to managers on-screen or in bulk. Download the template, fill in
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
          <li>Use Assign to map reportees on-screen, or download the template for bulk edits</li>
          <li>Fill in <code>managerEmployeeId</code> and <code>reporteeEmployeeId</code> — one manager→reportee pair per row (e.g. A→B on one row, A→C on the next)</li>
          <li>Upload the file — reportees will be assigned to managers after validation</li>
        </ol>
        <p style={{ margin: "8px 0 0", fontSize: 13 }}>
          Note: Do not put multiple reportees in one cell. Reportees must have a lower designation level than their manager.
          Each upload replaces existing reportees for the managers listed in the file.
          Users not in the file are left untouched.
          Inactive users are accepted and appear in red on Template, Export, and this table.
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

      <ReporteeMapTable
        users={users}
        loading={loading}
        projectId={projectId}
        searchValue={search}
        onSearchChange={setSearch}
        mappedFilter={mappedFilter}
        onMappedFilterChange={handleMappedFilterChange}
        mappedCount={meta.mappedCount}
        unmappedCount={meta.unmappedCount}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        activeCount={meta.activeCount}
        inactiveCount={meta.inactiveCount}
        pagination={{
          page,
          pageSize,
          totalCount: meta.totalCount,
          totalPages: meta.totalPages,
          onPageChange: setPage,
          onPageSizeChange: handlePageSizeChange,
        }}
        onRefresh={load}
      />
    </>
  );
}
