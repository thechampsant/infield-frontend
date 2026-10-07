"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import { DEFAULT_LIST_PAGE_SIZE, type ListMeta } from "@/lib/api/pagination";
import type { MasterExportQuery } from "@/lib/master-list-query";
import { storeService, type StoreRecord, type BulkStoreResult } from "@/lib/api/store-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { MasterExportBanners } from "@/components/project-admin/uploaders/master-export-banners";
import {
  UploadAuditHistoryButton,
  UploadErrorLogButton,
} from "@/components/project-admin/uploaders/upload-audit-history";
import { StoreTable } from "@/components/project-admin/uploaders/stores/store-table";
import { useMasterExport } from "@/hooks/use-master-export";
import { useMasterListQuery } from "@/hooks/use-master-list-query";
import { AddStoreModal } from "@/components/project-admin/uploaders/stores/add-store-modal";
import { UDFConfigModal } from "@/components/project-admin/udf/udf-config-modal";
import type { UDFField } from "@/types/project-admin";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StoresMasterPage() {
  const { projectId } = useProjectContext();
  const masterExport = useMasterExport(projectId, "stores");
  // Stores Master opens on all stores; the API's own default stays active-only.
  const query = useMasterListQuery({ defaultStatus: "all" });
  const { page, pageSize, setPage, listParams } = query;
  /** Last export started from this page, so the banner's Retry repeats it. */
  const lastExportQuery = useRef<MasterExportQuery | undefined>(undefined);

  const [addOpen, setAddOpen] = useState(false);
  const [udfOpen, setUdfOpen] = useState(false);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [udfFields, setUdfFields] = useState<UDFField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [uploadResult, setUploadResult] = useState<BulkStoreResult | null>(null);
  const [meta, setMeta] = useState<ListMeta>({
    page: 1,
    pageSize: DEFAULT_LIST_PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const { search, ...options } = listParams;
      const [storeList, fields] = await Promise.all([
        storeService.listByProject(projectId, page, pageSize, search, options),
        storeService.getFormFields(projectId),
      ]);
      setStores(storeList.data);
      setMeta(storeList.meta);
      setUdfFields(fields);
      // Deleting the last row of the final page can leave us past the end.
      if (page > storeList.meta.totalPages) {
        setPage(Math.max(1, storeList.meta.totalPages));
      }
    } catch (err) {
      setError(formatApiError(err, "Failed to load stores"));
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, listParams, setPage]);

  // Column values for the filter popover: same status, search and filters,
  // but not the sort, so changing the sort doesn't reload an open popover.
  const facetStatus = listParams.status;
  const facetSearch = listParams.search;
  const facetFilters = listParams.filters;
  const facetParams = useMemo(
    () => ({ status: facetStatus, search: facetSearch, filters: facetFilters }),
    [facetStatus, facetSearch, facetFilters],
  );
  const loadFilterValues = useCallback(
    (column: string, valueSearch: string) =>
      storeService.getFilterValues(projectId, column, { ...facetParams, valueSearch }),
    [projectId, facetParams],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleTemplate = async () => {
    if (!projectId) return;
    try {
      const blob = await storeService.downloadTemplate(projectId);
      downloadBlob(blob, "Store_Bulk_Upload_Template.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Template download failed. Please try again."));
    }
  };

  /** Page-header Export: the full stores export, unchanged. */
  const handleExport = () => {
    lastExportQuery.current = undefined;
    void masterExport.startExport();
  };

  /** Table Export: only the rows the table shows, in its sort order. */
  const handleFilteredExport = () => {
    lastExportQuery.current = query.exportQuery;
    void masterExport.startExport(undefined, query.exportQuery);
  };

  const retryExport = () => {
    void masterExport.startExport(undefined, lastExportQuery.current);
  };

  const handleBulkUpload = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result = await storeService.bulkUpload(projectId, file);
      setUploadResult(result);
      setHistoryRefresh((n) => n + 1);
      if (result.successCount > 0) {
        // Newest rows sort first, so jump back to page 1 to show them.
        if (page === 1) load();
        else setPage(1);
      }
      if (result.invalidCount > 0) {
        setError(
          `Upload completed: ${result.createdCount ?? 0} created, ${result.updatedCount ?? 0} updated, ${result.invalidCount} rows had errors.`,
        );
      }
    } catch (err) {
      setError(formatApiError(err, "Bulk upload failed"));
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
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }
    handleBulkUpload(file);
  };

  return (
    <>
      {/* ── Page Header ── */}
      <div className="pa-page-header">
        <div>
          <div className="pa-page-title">Stores Master</div>
          <div className="pa-page-desc">
            Manage store codes, GPS coordinates, and store-level UDF fields for this project
          </div>
        </div>
        <div className="pa-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTemplate}
          >
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
            aria-label="Upload Excel file for bulk store import"
          />
          <UploadAuditHistoryButton
            projectId={projectId}
            kinds={["stores"]}
            refreshToken={historyRefresh}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={masterExport.preparing}
          >
            {masterExport.preparing ? "Preparing Excel…" : "↓ Export"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAddOpen(true)}
          >
            + Add Store
          </button>
        </div>
      </div>

      <MasterExportBanners
        preparing={masterExport.preparing}
        job={masterExport.job}
        error={masterExport.error}
        onDownload={masterExport.downloadReady}
        onRetry={retryExport}
      />

      {/* ── Error Banner ── */}
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

      {/* ── Upload Success Banner ── */}
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
          Successfully upserted {uploadResult.successCount} of {uploadResult.total} stores
          {` (${uploadResult.createdCount ?? 0} created, ${uploadResult.updatedCount ?? 0} updated)`}.
          Existing store codes are updated; new codes are created.
        </div>
      )}

      {/* ── Upload Error Detail ── */}
      {uploadResult && uploadResult.errors.length > 0 && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--orange, #d97706)",
            background: "var(--orange-light, #fffbeb)",
            borderColor: "var(--orange-mid, #fcd34d)",
            marginBottom: 16,
            maxHeight: 200,
            overflow: "auto",
          }}
        >
          <strong>Upload Errors ({uploadResult.errors.length} rows):</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                Row {err.row ?? i + 1}: {err.errors.join(", ")}
              </li>
            ))}
            {uploadResult.errors.length > 10 && (
              <li>...and {uploadResult.errors.length - 10} more errors</li>
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

      {/* ── Main Table ── */}
      <StoreTable
        stores={stores}
        udfFields={udfFields}
        loading={loading}
        projectId={projectId}
        meta={meta}
        query={query}
        loadFilterValues={loadFilterValues}
        pagination={{
          page: meta.page,
          pageSize,
          totalCount: meta.totalCount,
          totalPages: meta.totalPages,
          onPageChange: setPage,
          onPageSizeChange: query.setPageSize,
        }}
        onOpenUDFConfig={() => setUdfOpen(true)}
        onRefresh={load}
        onExportFiltered={handleFilteredExport}
        exportPreparing={masterExport.preparing}
      />

      {/* ── Add Store Modal ── */}
      <AddStoreModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        udfFields={udfFields}
        projectId={projectId}
        onSuccess={() => {
          setAddOpen(false);
          load();
        }}
      />

      {/* ── UDF Config Modal ── */}
      <UDFConfigModal
        open={udfOpen}
        onClose={() => setUdfOpen(false)}
        scope="store"
        projectId={projectId}
        onSuccess={load}
      />

    </>
  );
}
