"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import {
  productService,
  type MappedProductLookup,
  type ProductRecord,
  type StoreMappingSummary,
} from "@/lib/api/product-service";
import { formatApiError } from "@/lib/api";
import { MAX_LIST_PAGE_SIZE } from "@/lib/api/pagination";

const SEARCH_DEBOUNCE_MS = 300;

interface AssignProductsModalProps {
  store: Pick<StoreMappingSummary, "storeId" | "storeCode" | "storeName">;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignProductsModal({
  store,
  projectId,
  open,
  onClose,
  onSuccess,
}: AssignProductsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [mappedByCode, setMappedByCode] = useState<Map<string, MappedProductLookup>>(new Map());
  const [existingProductCodes, setExistingProductCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebouncedSearch("");
    setError(null);
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const mapped = await productService.lookupMappedProducts(projectId, {
          storeId: store.storeId,
          storeCode: store.storeCode,
        });
        if (cancelled) return;
        const byCode = new Map(mapped.map((product) => [product.productCode, product]));
        setMappedByCode(byCode);
        setExistingProductCodes(new Set(byCode.keys()));
        setSelected(new Set(byCode.keys()));
      } catch (e) {
        if (!cancelled) {
          setError(formatApiError(e, "Failed to load mapped products"));
          setMappedByCode(new Map());
          setExistingProductCodes(new Set());
          setSelected(new Set());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, store.storeId, store.storeCode]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const result = await productService.listByProject(
          projectId,
          1,
          MAX_LIST_PAGE_SIZE,
          debouncedSearch || undefined,
        );
        if (!cancelled) setProducts(result.data);
      } catch (e) {
        if (!cancelled) {
          setError(formatApiError(e, "Failed to search products"));
          setProducts([]);
        }
      }
    };

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, debouncedSearch]);

  const toggleProduct = (productCode: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productCode)) {
        next.delete(productCode);
      } else {
        next.add(productCode);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      products.forEach((product) => next.add(product.productCode));
      return next;
    });
  };

  const clearNew = () => {
    setSelected(new Set(existingProductCodes));
  };

  const handleSave = async () => {
    const newProductCodes = Array.from(selected).filter(
      (productCode) => !existingProductCodes.has(productCode),
    );
    const removed = Array.from(existingProductCodes)
      .filter((productCode) => !selected.has(productCode))
      .map((productCode) => mappedByCode.get(productCode))
      .filter((mapping): mapping is MappedProductLookup => Boolean(mapping?.mappingId));

    if (newProductCodes.length === 0 && removed.length === 0) {
      onClose();
      return;
    }

    if (
      removed.length > 0 &&
      !confirm(`Unmap ${removed.length} product${removed.length === 1 ? "" : "s"} from this store?`)
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        [
          ...newProductCodes.map((productCode) =>
            productService.createStoreMapping({
              projectId,
              storeCode: store.storeCode,
              productCode,
            }),
          ),
          ...removed.map((mapping) => productService.deleteStoreMapping(mapping.mappingId!)),
        ],
      );
      onSuccess();
    } catch (e) {
      setError(formatApiError(e, "Failed to update product mapping"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = selected.size;
  const newSelectionCount = Array.from(selected).filter(
    (productCode) => !existingProductCodes.has(productCode),
  ).length;
  const removedSelectionCount = Array.from(existingProductCodes).filter(
    (productCode) => !selected.has(productCode),
  ).length;
  const loadedCount = useMemo(() => products.length, [products.length]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign Products — ${store.storeName || store.storeCode}`}
      width={640}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={submitting || loading}
          >
            {submitting
              ? "Saving..."
              : `Save Mapping (${newSelectionCount} new, ${removedSelectionCount} removed)`}
          </button>
        </>
      }
    >
      <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--border)", marginBottom: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{store.storeName}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{store.storeCode}</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
          {selectedCount} selected · {loadedCount} on this page
        </div>
      </div>

      <div className="pa-info-banner" style={{ marginBottom: 12 }}>
        Search loads up to {MAX_LIST_PAGE_SIZE} products. Select All applies to this page only, not the whole catalog.
      </div>

      {error && (
        <div className="pa-info-banner" style={{ color: "var(--red)", background: "var(--red-light)", borderColor: "var(--red-mid)", marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="Search products by name, code, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={selectAll}
          disabled={products.length === 0}
        >
          Select All
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={clearNew}
          disabled={newSelectionCount === 0}
        >
          Clear New
        </button>
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", maxHeight: 360, overflowY: "auto" }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading mapped products...
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {debouncedSearch
              ? `No products match "${debouncedSearch}"`
              : "No active products found for this project. Add products first."}
          </div>
        ) : (
          products.map((product, idx) => {
            const isExisting = existingProductCodes.has(product.productCode);
            const isChecked = selected.has(product.productCode);
            return (
              <label
                key={product.backendId || product.productCode}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  borderBottom: idx < products.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                  background: isChecked ? "var(--blue-pale)" : "var(--surface)",
                  transition: "background .1s",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleProduct(product.productCode)}
                  style={{ width: 16, height: 16, flexShrink: 0, accentColor: "var(--blue)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {product.productName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {product.productCode} · {product.category}
                  </div>
                </div>
                {isChecked && (
                  <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: isExisting ? "var(--surface2)" : "var(--blue)", color: isExisting ? "var(--text-muted)" : "#fff", border: isExisting ? "1px solid var(--border)" : "none", flexShrink: 0 }}>
                    {isExisting ? "Assigned" : "New"}
                  </div>
                )}
                {isExisting && !isChecked && (
                  <div style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "var(--red-light)", color: "var(--red)", border: "1px solid var(--red-mid)", flexShrink: 0 }}>
                    Unmap
                  </div>
                )}
              </label>
            );
          })
        )}
      </div>
    </Modal>
  );
}
