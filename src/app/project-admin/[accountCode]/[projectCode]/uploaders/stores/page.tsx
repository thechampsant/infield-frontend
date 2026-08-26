"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import { DEFAULT_LIST_PAGE_SIZE, type ListMeta } from "@/lib/api/pagination";
import { storeService, type StoreRecord, type BulkStoreResult } from "@/lib/api/store-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { StoreTable } from "@/components/project-admin/uploaders/stores/store-table";
import { AddStoreModal } from "@/components/project-admin/uploaders/stores/add-store-modal";
import { UDFConfigModal } from "@/components/project-admin/udf/udf-config-modal";
import type { UDFField } from "@/types/project-admin";

const SEARCH_DEBOUNCE_MS = 300;

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

  const [addOpen, setAddOpen] = useState(false);
  const [udfOpen, setUdfOpen] = useState(false);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [udfFields, setUdfFields] = useState<UDFField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkStoreResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
      const [storeList, fields] = await Promise.all([
        storeService.listByProject(projectId, page, pageSize, debouncedSearch),
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
  }, [projectId, page, pageSize, debouncedSearch]);

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

  const handleTemplate = async () => {
    if (!projectId) return;
    try {
      const blob = await storeService.downloadTemplate(projectId);
      downloadBlob(blob, "Store_Bulk_Upload_Template.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Template download failed. Please try again."));
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    try {
      const blob = await storeService.exportStores(projectId);
      downloadBlob(blob, "Stores_Export.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Export failed. Please try again."));
    }
  };

  const handleBulkUpload = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result = await storeService.bulkUpload(projectId, file);
      setUploadResult(result);
      if (result.successCount > 0) {
        // Newest rows sort first, so jump back to page 1 to show them.
        if (page === 1) load();
        else setPage(1);
      }
      if (result.invalidCount > 0) {
        setError(
          `Upload completed: ${result.successCount} stores added, ${result.invalidCount} rows had errors.`,
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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
          >
            ↓ Export
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
          Successfully imported {uploadResult.successCount} of {uploadResult.total} stores.
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
        </div>
      )}

      {/* ── Main Table ── */}
      <StoreTable
        stores={stores}
        udfFields={udfFields}
        loading={loading}
        projectId={projectId}
        searchValue={search}
        onSearchChange={setSearch}
        pagination={{
          page: meta.page,
          pageSize,
          totalCount: meta.totalCount,
          totalPages: meta.totalPages,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        onOpenUDFConfig={() => setUdfOpen(true)}
        onRefresh={load}
        onExport={handleExport}
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
