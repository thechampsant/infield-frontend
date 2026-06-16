"use client";

import { useState } from "react";
import { Store, CheckCircle, XCircle } from "lucide-react";
import { DataTable } from "@/components/project-admin/shared/data-table";
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
  onOpenUDFConfig: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

const GRID = "1.5fr 130px 150px 80px 100px";

export function StoreTable({
  stores,
  udfFields,
  loading,
  projectId,
  onOpenUDFConfig,
  onRefresh,
  onExport,
}: StoreTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const status = (s: StoreRecord) => (s.isActive ? "active" : "inactive") as "active" | "inactive";

  const filtered = stores
    .filter((s) => filter === "all" || status(s) === filter)
    .filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.storeName.toLowerCase().includes(q) ||
        s.storeCode.toLowerCase().includes(q)
      );
    });

  const total = stores.length;
  const activeCount = stores.filter((s) => s.isActive).length;

  const cellTruncate: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const rows = filtered.map((s, index) => {
    const rowKey = `${s.backendId}-${index}`;
    const initials = s.storeName.slice(0, 2).toUpperCase();

    return (
      <div
        key={rowKey}
        style={{
          display: "grid",
          gridTemplateColumns: GRID,
          gap: 12,
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          alignItems: "center",
          minHeight: 60,
          minWidth: 680,
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

        {/* Actions */}
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
          { key: "actions", label: "Actions", align: "right", width: 100 },
        ]}
        rows={rows}
        total={total}
        filtered={filtered.length}
        entityLabel="stores"
        searchValue={search}
        onSearchChange={setSearch}
        loading={loading}
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
            >
              ↓ Export
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
