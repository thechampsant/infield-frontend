"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { productService, type ProductRecord, type ProductStoreMapping } from "@/lib/api/product-service";
import { formatApiError } from "@/lib/api";
import type { StoreRecord } from "@/lib/api/store-service";

interface AssignProductsModalProps {
  store: StoreRecord;
  products: ProductRecord[];
  mappings: ProductStoreMapping[];
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignProductsModal({
  store,
  products,
  mappings,
  projectId,
  open,
  onClose,
  onSuccess,
}: AssignProductsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingProductCodes = useMemo(
    () =>
      new Set(
        mappings
          .filter((mapping) => mapping.storeCode === store.storeCode)
          .map((mapping) => mapping.productCode),
      ),
    [mappings, store.storeCode],
  );
  const existingMappingByProductCode = useMemo(() => {
    const map = new Map<string, ProductStoreMapping>();
    mappings
      .filter((mapping) => mapping.storeCode === store.storeCode)
      .forEach((mapping) => {
        map.set(mapping.productCode, mapping);
      });
    return map;
  }, [mappings, store.storeCode]);

  useEffect(() => {
    if (open) {
      setSelected(new Set(existingProductCodes));
      setSearch("");
      setError(null);
    }
  }, [open, existingProductCodes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.productName.toLowerCase().includes(q) ||
        product.productCode.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q),
    );
  }, [products, search]);

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
      filtered.forEach((product) => next.add(product.productCode));
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
    const removedMappings = Array.from(existingProductCodes)
      .filter((productCode) => !selected.has(productCode))
      .map((productCode) => existingMappingByProductCode.get(productCode))
      .filter((mapping): mapping is ProductStoreMapping => Boolean(mapping?.backendId));

    if (newProductCodes.length === 0 && removedMappings.length === 0) {
      onClose();
      return;
    }

    if (
      removedMappings.length > 0 &&
      !confirm(`Unmap ${removedMappings.length} product${removedMappings.length === 1 ? "" : "s"} from this store?`)
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
          ...removedMappings.map((mapping) =>
            productService.deleteStoreMapping(mapping.backendId),
          ),
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
            disabled={submitting}
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
          {selectedCount} / {products.length} products selected
        </div>
      </div>

      <div className="pa-info-banner" style={{ marginBottom: 12 }}>
        Checked products are mapped to this store. Uncheck an assigned product to unmap it.
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
          disabled={filtered.length === 0}
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
        {products.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No active products found for this project. Add products first.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No products match &quot;{search}&quot;
          </div>
        ) : (
          filtered.map((product, idx) => {
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
                  borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
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
