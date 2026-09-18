"use client";

import { useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { AssignProductsModal } from "./assign-products-modal";
import type { StoreMappingFilter, StoreMappingSummary } from "@/lib/api/product-service";
import { LIST_PAGE_SIZE_OPTIONS } from "@/lib/api/pagination";
import type { ServerPagination } from "@/components/project-admin/shared/data-table";

interface ProductStoreMapTableProps {
  rows: StoreMappingSummary[];
  projectId: string;
  loading: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  mappedFilter: StoreMappingFilter;
  onMappedFilterChange: (value: StoreMappingFilter) => void;
  mappedCount: number;
  unmappedCount: number;
  pagination: ServerPagination;
  onRefresh: () => void;
}

export function ProductStoreMapTable({
  rows,
  projectId,
  loading,
  searchValue,
  onSearchChange,
  mappedFilter,
  onMappedFilterChange,
  mappedCount,
  unmappedCount,
  pagination,
  onRefresh,
}: ProductStoreMapTableProps) {
  const [assignStore, setAssignStore] = useState<StoreMappingSummary | null>(null);
  const allCount = mappedCount + unmappedCount;
  const rangeStart =
    pagination.totalCount > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const rangeEnd = Math.min(pagination.page * pagination.pageSize, pagination.totalCount);

  const cellTruncate: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {(
          [
            { key: "all", label: "All Stores", count: allCount },
            { key: "mapped", label: "Mapped", count: mappedCount },
            { key: "unmapped", label: "Unmapped", count: unmappedCount },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => onMappedFilterChange(key)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: `2px solid ${mappedFilter === key ? "var(--blue)" : "var(--border)"}`,
              background: mappedFilter === key ? "var(--blue-pale)" : "var(--surface)",
              fontWeight: 700,
              fontSize: 12,
              color: mappedFilter === key ? "var(--blue)" : "var(--text-mid)",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {label}{" "}
            <span style={{ marginLeft: 6, background: mappedFilter === key ? "var(--blue)" : "var(--surface2)", color: mappedFilter === key ? "#fff" : "var(--text-muted)", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, maxWidth: 320 }}
            placeholder="Search stores by name or code..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
            {loading ? "Loading..." : `Showing ${rows.length} of ${pagination.totalCount} stores`}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 90px", gap: 12, padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", minWidth: 650 }}>
            <span>Store</span>
            <span>Mapped Products</span>
            <span>Product Codes</span>
            <span style={{ textAlign: "right" }}>Action</span>
          </div>

          {loading ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              {searchValue || mappedFilter !== "all"
                ? "No stores match the current filter."
                : "No stores found for this project."}
            </div>
          ) : (
            rows.map((store) => {
              const hasMapped = store.mappedCount > 0;

              return (
                <div
                  key={store.storeId || store.storeCode}
                  style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 90px", gap: 12, padding: "14px 20px", borderBottom: "1px solid var(--border)", alignItems: "center", minWidth: 650 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: hasMapped ? "var(--blue)" : "var(--surface2)", border: hasMapped ? "none" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: hasMapped ? "#fff" : "var(--text-muted)" }}>
                      {hasMapped ? <Link2 size={14} /> : <Link2Off size={14} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", ...cellTruncate }}>
                        {store.storeName}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", ...cellTruncate }}>
                        {store.storeCode}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-mid)", ...cellTruncate }}>
                    {hasMapped ? `${store.mappedCount} products` : "No products mapped"}
                  </div>

                  <div>
                    {hasMapped ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {store.sampleProductCodes.map((code) => (
                          <span key={`${store.storeId}-${code}`} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "var(--teal-light, #f0fdfa)", color: "var(--teal, #0d9488)", border: "1px solid var(--teal-mid, #99f6e4)", whiteSpace: "nowrap" }}>
                            {code}
                          </span>
                        ))}
                        {store.mappedCount > store.sampleProductCodes.length && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                            +{store.mappedCount - store.sampleProductCodes.length} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                        No products mapped
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAssignStore(store)}
                      style={{ fontSize: 11, whiteSpace: "nowrap" }}
                    >
                      {hasMapped ? "Edit" : "Assign"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border)", background: "var(--surface2)", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
            Show
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              aria-label="Rows of stores per page"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: 11, fontWeight: 600, padding: "4px 6px" }}
            >
              {(pagination.pageSizeOptions ?? LIST_PAGE_SIZE_OPTIONS).map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            per page
          </label>
          <span style={{ fontWeight: 500 }}>
            {pagination.totalCount > 0
              ? `Showing ${rangeStart}–${rangeEnd} of ${pagination.totalCount} stores`
              : "No stores"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Previous
            </button>
            <span style={{ fontWeight: 600 }}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {assignStore && (
        <AssignProductsModal
          store={assignStore}
          projectId={projectId}
          open={!!assignStore}
          onClose={() => setAssignStore(null)}
          onSuccess={() => {
            setAssignStore(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
