"use client";

import { useState } from "react";
import { Store, CheckCircle, XCircle } from "lucide-react";
import {
  DataTable,
  type ServerPagination,
} from "@/components/project-admin/shared/data-table";
import { StatCard } from "@/components/project-admin/shared/stat-card";
import { StatusPill } from "@/components/project-admin/shared/status-pill";
import { ActionButtons } from "@/components/project-admin/shared/action-buttons";
import { EditStoreModal } from "./edit-store-modal";
import { AuditHistoryModal } from "@/components/project-admin/shared/audit-history-modal";
import { storeService, type StoreRecord } from "@/lib/api/store-service";
import type { UDFField } from "@/types/project-admin";

interface StoreTableProps {
  stores: StoreRecord[];
  udfFields: UDFField[];
  loading: boolean;
  projectId: string;
  /** `stores` holds only the current page; counts come from here. */
  pagination: ServerPagination;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onOpenUDFConfig: () => void;
  onRefresh: () => void;
  onExport: () => void;
  exportPreparing?: boolean;
}

const CORE_GRID = "1.5fr 130px 150px 80px 100px";
const MASTER_TABLE_TYPES = new Set<UDFField["type"]>([
  "alphanumeric",
  "numeric",
  "dropdown",
  "boolean",
  "date",
]);
const STATIC_MASTER_FIELD_KEYS = new Set(["storeCode", "storeName", "status", "actions"]);

export function StoreTable({
  stores,
  udfFields,
  loading,
  projectId,
  pagination,
  searchValue,
  onSearchChange,
  onOpenUDFConfig,
  onRefresh,
  onExport,
  exportPreparing,
}: StoreTableProps) {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const status = (s: StoreRecord) => (s.isActive ? "active" : "inactive") as "active" | "inactive";

  const filtered = stores.filter((s) => filter === "all" || status(s) === filter);

  // The list API returns active stores only, so every row on every page is active.
  const total = pagination.totalCount;
  const activeCount = total;
  const visibleUdfFields = udfFields.filter(
    (field) =>
      field.status !== false &&
      field.showInMasterTable &&
      !STATIC_MASTER_FIELD_KEYS.has(field.fieldKey) &&
      MASTER_TABLE_TYPES.has(field.type),
  );
  const grid = visibleUdfFields.length > 0
    ? `${CORE_GRID} ${visibleUdfFields.map(() => "140px").join(" ")}`
    : CORE_GRID;

  const cellTruncate: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const renderUdfValue = (store: StoreRecord, field: UDFField) => {
    const value = store.udfs[field.fieldKey];
    if (value === undefined || value === null || value === "") return "—";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const rows = filtered.map((s, index) => {
    const rowKey = `${s.backendId}-${index}`;
    const initials = s.storeName.slice(0, 2).toUpperCase();

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
          minWidth: visibleUdfFields.length > 0 ? 680 + visibleUdfFields.length * 140 : 680,
        }}
      >
        {/* Store Name + Code */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "var(--teal, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials || "ST"}
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", ...cellTruncate }}>
              {s.storeName}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", ...cellTruncate }}>
              {s.storeCode}
            </div>
          </div>
        </div>

        {/* Store Code badge */}
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              padding: "4px 8px",
              borderRadius: 6,
              display: "inline-block",
              maxWidth: "100%",
              ...cellTruncate,
            }}
          >
            {s.storeCode}
          </span>
        </div>

        {/* Coordinates */}
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: "var(--text-mid)", ...cellTruncate }}>
            {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
          </div>
        </div>

        {/* Status */}
        <div>
          <StatusPill status={status(s)} />
        </div>

        {visibleUdfFields.map((field) => (
          <div
            key={`${s.backendId}-${field.fieldKey}`}
            style={{ fontSize: 12, color: "var(--text-mid)", minWidth: 0, ...cellTruncate }}
          >
            {renderUdfValue(s, field)}
          </div>
        ))}

        {/* Actions always remain the final column. */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionButtons
            status={status(s)}
            entityType="stores"
            entityId={s.backendId}
            projectId={projectId}
            onEdit={() => setEditId(s.backendId)}
            onAudit={() => setAuditId(s.backendId)}
            onRefresh={onRefresh}
            onDeactivate={async () => {
              await storeService.delete(s.backendId);
            }}
          />
        </div>
      </div>
    );
  });

  const editingStore = editId ? stores.find((s) => s.backendId === editId) : undefined;

  return (
    <>
      <div className="stat-grid">
        <StatCard
          value={total}
          label="Total Stores"
          color="blue"
          icon={<Store size={20} />}
          selected={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <StatCard
          value={activeCount}
          label="Active Stores"
          color="teal"
          icon={<CheckCircle size={20} />}
          selected={filter === "active"}
          onClick={() => setFilter("active")}
        />
        <StatCard
          value={total - activeCount}
          label="Inactive Stores"
          color="red"
          icon={<XCircle size={20} />}
          selected={filter === "inactive"}
          onClick={() => setFilter("inactive")}
        />
      </div>

      <DataTable
        columns={[
          { key: "store", label: "Store", width: "1.5fr" },
          { key: "code", label: "Code", width: 130 },
          { key: "location", label: "Coordinates", width: 150 },
          { key: "status", label: "Status", width: 80 },
          ...visibleUdfFields.map((field) => ({
            key: `udf-${field.fieldKey}`,
            label: field.name,
            width: 140,
          })),
          { key: "actions", label: "Actions", align: "right", width: 100 },
        ]}
        rows={rows}
        total={total}
        filtered={filtered.length}
        entityLabel="stores"
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        loading={loading}
        serverPagination={pagination}
        toolbarRight={
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onOpenUDFConfig}
            >
              ⚙ UDF Config
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onExport}
              disabled={exportPreparing}
            >
              {exportPreparing ? "Preparing Excel…" : "↓ Export"}
            </button>
          </>
        }
      />

      {editingStore && (
        <EditStoreModal
          store={editingStore}
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
          entityType="Store"
          entityId={auditId}
          entries={[]}
        />
      )}
    </>
  );
}
