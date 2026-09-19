"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  productService,
  type BulkProductStoreMappingResult,
  type StoreMappingFilter,
  type StoreMappingSummary,
} from "@/lib/api/product-service";
import { DEFAULT_LIST_PAGE_SIZE, type ListMeta } from "@/lib/api/pagination";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { ProductStoreMapTable } from "@/components/project-admin/uploaders/product-store-map/product-store-map-table";
import { MasterExportBanners } from "@/components/project-admin/uploaders/master-export-banners";
import {
  UploadAuditHistoryButton,
  UploadErrorLogButton,
} from "@/components/project-admin/uploaders/upload-audit-history";
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

export default function ProductStoreMapPage() {
  const { projectId } = useProjectContext();
  const masterExport = useMasterExport(projectId, "product-store-mapping");

  const [rows, setRows] = useState<StoreMappingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkProductStoreMappingResult | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mappedFilter, setMappedFilter] = useState<StoreMappingFilter>("all");
  const [meta, setMeta] = useState<ListMeta & { mappedCount: number; unmappedCount: number }>({
    page: 1,
    pageSize: DEFAULT_LIST_PAGE_SIZE,
    totalCount: 0,
    totalPages: 1,
    mappedCount: 0,
    unmappedCount: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await productService.listStoreMappingPage(
        projectId,
        page,
        pageSize,
        debouncedSearch,
        mappedFilter,
      );
      setRows(result.data);
      setMeta(result.meta);
      if (page > result.meta.totalPages) {
        setPage(Math.max(1, result.meta.totalPages));
      }
    } catch (err) {
      setError(formatApiError(err, "Failed to load product-store mappings"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, debouncedSearch, mappedFilter]);

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

  const handleMappedFilterChange = (next: StoreMappingFilter) => {
    setMappedFilter(next);
    setPage(1);
  };

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  const handleTemplate = async () => {
    if (!projectId) return;
    try {
      const blob = await productService.downloadStoreMappingTemplate(projectId);
      downloadBlob(blob, "Product_Store_Mapping_Template.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Template download failed"));
    }
  };

  const handleExport = () => {
    void masterExport.startExport();
  };

  const handleBulkUpload = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);
    try {
      const result = await productService.bulkUploadStoreMapping(projectId, file);
      setUploadResult(result);
      setHistoryRefresh((n) => n + 1);
      if (result.successCount > 0) {
        load();
      }
      if (result.invalidCount > 0) {
        setError(
          `Upload completed: ${result.successCount} mappings added, ${result.invalidCount} rows had errors.`,
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

  return (
    <>
      <div className="pa-page-header">
        <div>
          <div className="pa-page-title">Product–Store Mapping</div>
          <div className="pa-page-desc">
            Map active products to active stores for modules that enable product-store filtering
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
            aria-label="Upload Excel file for bulk product-store mapping"
          />
          <UploadAuditHistoryButton
            projectId={projectId}
            kinds={["product-store-map"]}
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
        </div>
      </div>

      <MasterExportBanners
        preparing={masterExport.preparing}
        job={masterExport.job}
        error={masterExport.error}
        onDownload={masterExport.downloadReady}
        onRetry={handleExport}
      />

      <div className="pa-info-banner" style={{ marginBottom: 16 }}>
        <strong>How it works:</strong> Select a store, then assign one or more active products.
        Bulk upload still accepts one row per <em>storeCode + productCode</em> pair.
      </div>

      {error && (
        <div className="pa-info-banner" style={{ color: "var(--red)", background: "var(--red-light)", borderColor: "var(--red-mid)", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {uploadResult && uploadResult.successCount > 0 && !error && (
        <div className="pa-info-banner" style={{ color: "var(--green, #16a34a)", background: "var(--green-light, #f0fdf4)", borderColor: "var(--green-mid, #86efac)", marginBottom: 16 }}>
          Successfully imported {uploadResult.successCount} of {uploadResult.total} mappings.
        </div>
      )}

      {uploadResult && uploadResult.errors.length > 0 && (
        <div className="pa-info-banner" style={{ color: "var(--orange, #d97706)", background: "var(--orange-light, #fffbeb)", borderColor: "var(--orange-mid, #fcd34d)", marginBottom: 16, maxHeight: 200, overflow: "auto" }}>
          <strong>Upload Errors ({uploadResult.errors.length} rows):</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                Row {err.row ?? i + 1}
                {err.storeCode || err.productCode
                  ? ` (${[err.storeCode, err.productCode].filter(Boolean).join(" / ")})`
                  : ""}
                : {err.errors.join(", ")}
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

      {!loading && meta.totalCount === 0 && mappedFilter === "all" && !debouncedSearch && (
        <div className="pa-info-banner" style={{ color: "var(--orange, #d97706)", background: "var(--orange-light, #fffbeb)", borderColor: "var(--orange-mid, #fcd34d)", marginBottom: 16 }}>
          <strong>No stores found.</strong> Add stores in the Stores Master tab before creating product-store mappings.
        </div>
      )}

      <ProductStoreMapTable
        rows={rows}
        projectId={projectId}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        mappedFilter={mappedFilter}
        onMappedFilterChange={handleMappedFilterChange}
        mappedCount={meta.mappedCount}
        unmappedCount={meta.unmappedCount}
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
