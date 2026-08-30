"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  productService,
  type BulkProductResult,
  type ProductRecord,
} from "@/lib/api/product-service";
import { DEFAULT_LIST_PAGE_SIZE, type ListMeta } from "@/lib/api/pagination";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { ProductTable } from "@/components/project-admin/uploaders/products/product-table";
import { AddProductModal } from "@/components/project-admin/uploaders/products/add-product-modal";
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

export default function ProductsMasterPage() {
  const { projectId } = useProjectContext();

  const [addOpen, setAddOpen] = useState(false);
  const [udfOpen, setUdfOpen] = useState(false);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [udfFields, setUdfFields] = useState<UDFField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkProductResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
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
      const [productList, fields] = await Promise.all([
        productService.listByProject(projectId, page, pageSize),
        productService.getFormFields(projectId),
      ]);
      setProducts(productList.data);
      setMeta(productList.meta);
      setUdfFields(fields);
      // Deleting the last row of the final page can leave us past the end.
      if (page > productList.meta.totalPages) {
        setPage(productList.meta.totalPages);
      }
    } catch (err) {
      setError(formatApiError(err, "Failed to load products"));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTemplate = async () => {
    if (!projectId) return;
    try {
      const blob = await productService.downloadTemplate(projectId);
      downloadBlob(blob, "Product_Bulk_Upload_Template.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Template download failed. Please try again."));
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    try {
      const blob = await productService.exportProducts(projectId);
      downloadBlob(blob, "Products_Export.xlsx");
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
      const result = await productService.bulkUpload(projectId, file);
      setUploadResult(result);
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
          <div className="pa-page-title">Products Master</div>
          <div className="pa-page-desc">
            Manage product codes, categories, focus flags, and product-level UDF fields for this project
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
            aria-label="Upload Excel file for bulk product import"
          />
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            ↓ Export
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
            + Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="pa-info-banner" style={{ color: "var(--red)", background: "var(--red-light)", borderColor: "var(--red-mid)", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {uploadResult && uploadResult.successCount > 0 && !error && (
        <div className="pa-info-banner" style={{ color: "var(--green, #16a34a)", background: "var(--green-light, #f0fdf4)", borderColor: "var(--green-mid, #86efac)", marginBottom: 16 }}>
          Successfully upserted {uploadResult.successCount} of {uploadResult.total} products
          {` (${uploadResult.createdCount ?? 0} created, ${uploadResult.updatedCount ?? 0} updated)`}.
          Existing product codes are updated; new codes are created.
        </div>
      )}

      {uploadResult && uploadResult.errors.length > 0 && (
        <div className="pa-info-banner" style={{ color: "var(--orange, #d97706)", background: "var(--orange-light, #fffbeb)", borderColor: "var(--orange-mid, #fcd34d)", marginBottom: 16, maxHeight: 200, overflow: "auto" }}>
          <strong>Upload Errors ({uploadResult.errors.length} rows):</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            {uploadResult.errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                Row {err.row ?? i + 1}
                {err.productCode ? ` (${err.productCode})` : ""}: {err.errors.join(", ")}
              </li>
            ))}
            {uploadResult.errors.length > 10 && (
              <li>...and {uploadResult.errors.length - 10} more errors</li>
            )}
          </ul>
        </div>
      )}

      <ProductTable
        products={products}
        udfFields={udfFields}
        loading={loading}
        projectId={projectId}
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

      <AddProductModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        udfFields={udfFields}
        projectId={projectId}
        onSuccess={() => {
          setAddOpen(false);
          load();
        }}
      />

      <UDFConfigModal
        open={udfOpen}
        onClose={() => setUdfOpen(false)}
        scope="product"
        projectId={projectId}
        onSuccess={load}
      />
    </>
  );
}
