"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  productService,
  type ProductRecord,
  type BulkProductStoreMappingResult,
  type ProductStoreMapping,
} from "@/lib/api/product-service";
import { storeService, type StoreRecord } from "@/lib/api/store-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { ProductStoreMapTable } from "@/components/project-admin/uploaders/product-store-map/product-store-map-table";

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

  const [mappings, setMappings] = useState<ProductStoreMapping[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkProductStoreMappingResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [storeRows, productRows, mappingRows] = await Promise.all([
        storeService.listByProject(projectId),
        productService.listAllByProject(projectId),
        productService.listStoreMappings(projectId),
      ]);
      setStores(storeRows);
      setProducts(productRows);
      setMappings(mappingRows);
    } catch (err) {
      setError(formatApiError(err, "Failed to load product-store mappings"));
      setStores([]);
      setProducts([]);
      setMappings([]);
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
      const blob = await productService.downloadStoreMappingTemplate(projectId);
      downloadBlob(blob, "Product_Store_Mapping_Template.xlsx");
    } catch (err) {
      setError(formatApiError(err, "Template download failed"));
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    try {
      const blob = await productService.exportStoreMappings(projectId);
      downloadBlob(blob, "Product_Store_Mapping_Export.xlsx");
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
      const result = await productService.bulkUploadStoreMapping(projectId, file);
      setUploadResult(result);
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
          <button type="button" className="btn btn-secondary" onClick={handleExport}>
            ↓ Export
          </button>
        </div>
      </div>

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
        </div>
      )}

      {!loading && stores.length === 0 && (
        <div className="pa-info-banner" style={{ color: "var(--orange, #d97706)", background: "var(--orange-light, #fffbeb)", borderColor: "var(--orange-mid, #fcd34d)", marginBottom: 16 }}>
          <strong>No stores found.</strong> Add stores in the Stores Master tab before creating product-store mappings.
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="pa-info-banner" style={{ color: "var(--orange, #d97706)", background: "var(--orange-light, #fffbeb)", borderColor: "var(--orange-mid, #fcd34d)", marginBottom: 16 }}>
          <strong>No products found.</strong> Add products in the Products Master tab before creating product-store mappings.
        </div>
      )}

      <ProductStoreMapTable
        stores={stores}
        products={products}
        mappings={mappings}
        projectId={projectId}
        loading={loading}
        onRefresh={load}
      />
    </>
  );
}
