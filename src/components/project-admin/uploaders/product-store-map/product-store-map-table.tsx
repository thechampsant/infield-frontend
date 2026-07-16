"use client";

import { useMemo, useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { AssignProductsModal } from "./assign-products-modal";
import type { ProductRecord, ProductStoreMapping } from "@/lib/api/product-service";
import type { StoreRecord } from "@/lib/api/store-service";

interface ProductStoreMapTableProps {
  stores: StoreRecord[];
  products: ProductRecord[];
  mappings: ProductStoreMapping[];
  projectId: string;
  loading: boolean;
  onRefresh: () => void;
}

export function ProductStoreMapTable({
  stores,
  products,
  mappings,
  projectId,
  loading,
  onRefresh,
}: ProductStoreMapTableProps) {
  const [search, setSearch] = useState("");
  const [filterMapped, setFilterMapped] = useState<"all" | "mapped" | "unmapped">("all");
  const [assignStore, setAssignStore] = useState<StoreRecord | null>(null);

  const productsByStoreCode = useMemo(() => {
    const map = new Map<string, ProductStoreMapping[]>();
    mappings.forEach((mapping) => {
      const current = map.get(mapping.storeCode) ?? [];
      current.push(mapping);
      map.set(mapping.storeCode, current);
    });
    return map;
  }, [mappings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores
      .filter((store) => {
        const mappedCount = productsByStoreCode.get(store.storeCode)?.length ?? 0;
        if (filterMapped === "mapped") return mappedCount > 0;
        if (filterMapped === "unmapped") return mappedCount === 0;
        return true;
      })
      .filter((store) => {
        if (!q) return true;
        return (
          store.storeName.toLowerCase().includes(q) ||
          store.storeCode.toLowerCase().includes(q)
        );
      });
  }, [stores, productsByStoreCode, search, filterMapped]);

  const mappedCount = stores.filter((store) => (productsByStoreCode.get(store.storeCode)?.length ?? 0) > 0).length;
  const unmappedCount = stores.length - mappedCount;

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
            { key: "all", label: "All Stores", count: stores.length },
            { key: "mapped", label: "Mapped", count: mappedCount },
            { key: "unmapped", label: "Unmapped", count: unmappedCount },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterMapped(key)}
            style={{
              padding: "7px 16px",
              borderRadius: 20,
              border: `2px solid ${filterMapped === key ? "var(--blue)" : "var(--border)"}`,
              background: filterMapped === key ? "var(--blue-pale)" : "var(--surface)",
              fontWeight: 700,
              fontSize: 12,
              color: filterMapped === key ? "var(--blue)" : "var(--text-mid)",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {label}{" "}
            <span style={{ marginLeft: 6, background: filterMapped === key ? "var(--blue)" : "var(--surface2)", color: filterMapped === key ? "#fff" : "var(--text-muted)", borderRadius: 10, padding: "1px 7px", fontSize: 11 }}>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
            {loading ? "Loading..." : `Showing ${filtered.length} of ${stores.length} stores`}
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
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              {search || filterMapped !== "all"
                ? "No stores match the current filter."
                : "No stores found for this project."}
            </div>
          ) : (
            filtered.map((store) => {
              const storeMappings = productsByStoreCode.get(store.storeCode) ?? [];
              const hasMapped = storeMappings.length > 0;

              return (
                <div
                  key={store.backendId || store.storeCode}
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
                    {hasMapped ? `${storeMappings.length} products` : "No products mapped"}
                  </div>

                  <div>
                    {hasMapped ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {storeMappings.slice(0, 3).map((mapping) => (
                          <span key={mapping.backendId || `${store.storeCode}-${mapping.productCode}`} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "var(--teal-light, #f0fdfa)", color: "var(--teal, #0d9488)", border: "1px solid var(--teal-mid, #99f6e4)", whiteSpace: "nowrap" }}>
                            {mapping.productCode}
                          </span>
                        ))}
                        {storeMappings.length > 3 && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                            +{storeMappings.length - 3} more
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

        {!loading && filtered.length > 0 && (
          <div style={{ padding: "10px 20px", fontSize: 11, color: "var(--text-muted)", borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
            {mappedCount} of {stores.length} stores have product mappings
          </div>
        )}
      </div>

      {assignStore && (
        <AssignProductsModal
          store={assignStore}
          products={products.filter((product) => product.isActive)}
          mappings={mappings}
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
