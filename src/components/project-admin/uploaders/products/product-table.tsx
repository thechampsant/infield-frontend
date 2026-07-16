"use client";

import { useState } from "react";
import { CheckCircle, Package, Star, XCircle } from "lucide-react";
import { DataTable } from "@/components/project-admin/shared/data-table";
import { StatCard } from "@/components/project-admin/shared/stat-card";
import { StatusPill } from "@/components/project-admin/shared/status-pill";
import { ActionButtons } from "@/components/project-admin/shared/action-buttons";
import { AuditHistoryModal } from "@/components/project-admin/shared/audit-history-modal";
import { productService, type ProductRecord } from "@/lib/api/product-service";
import { EditProductModal } from "./edit-product-modal";
import type { UDFField } from "@/types/project-admin";

interface ProductTableProps {
  products: ProductRecord[];
  udfFields: UDFField[];
  loading: boolean;
  projectId: string;
  onOpenUDFConfig: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

const CORE_GRID = "1.5fr 130px 140px 90px 80px 100px";

export function ProductTable({
  products,
  udfFields,
  loading,
  projectId,
  onOpenUDFConfig,
  onRefresh,
  onExport,
}: ProductTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "focus">("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const status = (product: ProductRecord) =>
    (product.isActive ? "active" : "inactive") as "active" | "inactive";

  const filtered = products
    .filter((product) => {
      if (filter === "focus") return product.isFocusProduct;
      return filter === "all" || status(product) === filter;
    })
    .filter((product) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        product.productName.toLowerCase().includes(q) ||
        product.productCode.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q)
      );
    });

  const total = products.length;
  const activeCount = products.filter((product) => product.isActive).length;
  const focusCount = products.filter((product) => product.isFocusProduct).length;
  const grid = udfFields.length > 0
    ? `${CORE_GRID} ${udfFields.map(() => "140px").join(" ")}`
    : CORE_GRID;

  const cellTruncate: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const renderUdfValue = (product: ProductRecord, field: UDFField) => {
    const value = product.udfs[field.fieldKey];
    if (Array.isArray(value)) return value.join(", ");
    return value ?? "—";
  };

  const rows = filtered.map((product, index) => {
    const rowKey = `${product.backendId}-${index}`;
    const initials = product.productName.slice(0, 2).toUpperCase();

    return (
      <div
        key={rowKey}
        style={{
          display: "grid",
          gridTemplateColumns: grid,
          gap: 12,
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          alignItems: "center",
          minHeight: 60,
          minWidth: udfFields.length > 0 ? 960 + udfFields.length * 140 : 720,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "var(--blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials || "PR"}
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", ...cellTruncate }}>
              {product.productName}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", ...cellTruncate }}>
              {product.productCode}
            </div>
          </div>
        </div>

        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", background: "var(--surface2)", border: "1px solid var(--border)", padding: "4px 8px", borderRadius: 6, display: "inline-block", maxWidth: "100%", ...cellTruncate }}>
            {product.productCode}
          </span>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-mid)", minWidth: 0, ...cellTruncate }}>
          {product.category}
        </div>

        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: product.isFocusProduct ? "var(--blue)" : "var(--text-muted)" }}>
            {product.isFocusProduct ? "Yes" : "No"}
          </span>
        </div>

        <div>
          <StatusPill status={status(product)} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionButtons
            status={status(product)}
            entityType="products"
            entityId={product.backendId}
            projectId={projectId}
            onEdit={() => setEditId(product.backendId)}
            onAudit={() => setAuditId(product.backendId)}
            onRefresh={onRefresh}
            onDeactivate={async () => {
              await productService.delete(product.backendId);
            }}
          />
        </div>

        {udfFields.map((field) => (
          <div key={`${product.backendId}-${field.fieldKey}`} style={{ fontSize: 12, color: "var(--text-mid)", minWidth: 0, ...cellTruncate }}>
            {renderUdfValue(product, field)}
          </div>
        ))}
      </div>
    );
  });

  const editingProduct = editId
    ? products.find((product) => product.backendId === editId)
    : undefined;

  return (
    <>
      <div className="stat-grid">
        <StatCard
          value={total}
          label="Total Products"
          color="blue"
          icon={<Package size={20} />}
          selected={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <StatCard
          value={activeCount}
          label="Active Products"
          color="teal"
          icon={<CheckCircle size={20} />}
          selected={filter === "active"}
          onClick={() => setFilter("active")}
        />
        <StatCard
          value={total - activeCount}
          label="Inactive Products"
          color="red"
          icon={<XCircle size={20} />}
          selected={filter === "inactive"}
          onClick={() => setFilter("inactive")}
        />
        <StatCard
          value={focusCount}
          label="Focus Products"
          color="blue"
          icon={<Star size={20} />}
          selected={filter === "focus"}
          onClick={() => setFilter("focus")}
        />
      </div>

      <DataTable
        columns={[
          { key: "product", label: "Product", width: "1.5fr" },
          { key: "code", label: "Code", width: 130 },
          { key: "category", label: "Category", width: 140 },
          { key: "focus", label: "Focus", width: 90 },
          { key: "status", label: "Status", width: 80 },
          { key: "actions", label: "Actions", align: "right", width: 100 },
          ...udfFields.map((field) => ({
            key: field.fieldKey,
            label: field.name,
            width: 140,
          })),
        ]}
        rows={rows}
        total={total}
        filtered={filtered.length}
        entityLabel="products"
        searchValue={search}
        onSearchChange={setSearch}
        loading={loading}
        toolbarRight={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenUDFConfig}>
              ⚙ UDF Config
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onExport}>
              ↓ Export
            </button>
          </>
        }
      />

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          open={!!editId}
          onClose={() => setEditId(null)}
          udfFields={udfFields}
          projectId={projectId}
          onSuccess={() => {
            setEditId(null);
            onRefresh();
          }}
        />
      )}

      {auditId && (
        <AuditHistoryModal
          open={!!auditId}
          onClose={() => setAuditId(null)}
          entityType="Product"
          entityId={auditId}
          entries={[]}
        />
      )}
    </>
  );
}
