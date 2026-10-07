"use client";

import { useState } from "react";
import { Store, CheckCircle, XCircle } from "lucide-react";
import {
  DataTable,
  type ServerPagination,
} from "@/components/project-admin/shared/data-table";
import type { MasterTableControls } from "@/components/project-admin/shared/master-table/types";
import { StatCard } from "@/components/project-admin/shared/stat-card";
import { StatusPill } from "@/components/project-admin/shared/status-pill";
import { ActionButtons } from "@/components/project-admin/shared/action-buttons";
import { EditStoreModal } from "./edit-store-modal";
import { AuditHistoryModal } from "@/components/project-admin/shared/audit-history-modal";
import { storeService, type StoreRecord } from "@/lib/api/store-service";
import type { ListMeta } from "@/lib/api/pagination";
import type { MasterFilterValuesResult } from "@/lib/master-list-query";
import type { MasterListQueryControls } from "@/hooks/use-master-list-query";
import type { UDFField } from "@/types/project-admin";

interface StoreTableProps {
  stores: StoreRecord[];
  udfFields: UDFField[];
  loading: boolean;
  projectId: string;
  /** `stores` holds only the current page; counts come from here. */
  pagination: ServerPagination;
  /** List meta with filter-aware and project-wide counts. */
  meta: ListMeta;
  /** Search, status, column filters and sort. */
  query: MasterListQueryControls;
  loadFilterValues: (column: string, valueSearch: string) => Promise<MasterFilterValuesResult>;
  onOpenUDFConfig: () => void;
  onRefresh: () => void;
  /** Exports the rows the table currently shows (filters, status, sort). */
  onExportFiltered: () => void;
  exportPreparing?: boolean;
}

const CORE_GRID = "1.5fr 130px 100px 100px";
const UDF_COLUMN_WIDTH = 140;
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
  meta,
  query,
  loadFilterValues,
  onOpenUDFConfig,
  onRefresh,
  onExportFiltered,
  exportPreparing,
}: StoreTableProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const status = (s: StoreRecord) => (s.isActive ? "active" : "inactive") as "active" | "inactive";

  // Cards count search + column filters across every page, whatever the status.
  const activeCount = meta.activeCount ?? pagination.totalCount;
  const inactiveCount = meta.inactiveCount ?? 0;
  const total = activeCount + inactiveCount;
  const projectActive = meta.projectActiveCount ?? activeCount;
  const projectInactive = meta.projectInactiveCount ?? inactiveCount;
  const projectTotal = meta.projectTotalCount ?? projectActive + projectInactive;
  const unfilteredTotal =
    query.status === "active" ? projectActive : query.status === "inactive" ? projectInactive : projectTotal;

  const visibleUdfFields = udfFields.filter(
    (field) =>
      field.status !== false &&
      field.showInMasterTable &&
      !STATIC_MASTER_FIELD_KEYS.has(field.fieldKey) &&
      MASTER_TABLE_TYPES.has(field.type),
  );
  const grid = visibleUdfFields.length > 0
    ? `${CORE_GRID} ${visibleUdfFields.map(() => `${UDF_COLUMN_WIDTH}px`).join(" ")}`
    : CORE_GRID;
  const minWidth = 700 + visibleUdfFields.length * UDF_COLUMN_WIDTH;

  const masterQuery: MasterTableControls = {
    sort: query.sort,
    onToggleSort: query.toggleSort,
    onSetSort: query.setSort,
    filters: query.filters,
    onFilterChange: query.setColumnFilter,
    loadFilterValues,
    status: query.status,
    defaultStatus: query.defaultStatus,
    onStatusChange: query.setStatus,
    filtersActive: query.filtersActive,
    anyActive: query.anyActive,
    onClearAll: query.clearAll,
    unfilteredTotal,
  };

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

  const rows = stores.map((s, index) => {
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
          minWidth,
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

        {/* Actions always remain the final column. Inactive stores can't be edited or reactivated. */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {s.isActive ? (
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
          ) : (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }} title="Inactive stores are read-only">
              —
            </span>
          )}
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
          ofTotal={projectTotal}
          filtered={query.filtersActive}
          label="Total Stores"
          color="blue"
          icon={<Store size={20} />}
          selected={query.status === "all"}
          onClick={() => query.setStatus("all")}
        />
        <StatCard
          value={activeCount}
          ofTotal={projectActive}
          filtered={query.filtersActive}
          label="Active Stores"
          color="teal"
          icon={<CheckCircle size={20} />}
          selected={query.status === "active"}
          onClick={() => query.setStatus("active")}
        />
        <StatCard
          value={inactiveCount}
          ofTotal={projectInactive}
          filtered={query.filtersActive}
          label="Inactive Stores"
          color="red"
          icon={<XCircle size={20} />}
          selected={query.status === "inactive"}
          onClick={() => query.setStatus("inactive")}
        />
      </div>

      <DataTable
        columns={[
          { key: "storeName", label: "Store", width: "1.5fr", sortable: true, filter: "text" },
          { key: "storeCode", label: "Code", width: 130, sortable: true, filter: "text" },
          { key: "status", label: "Status", width: 100, sortable: true, filter: "status" },
          ...visibleUdfFields.map((field) => ({
            key: field.fieldKey,
            label: field.name,
            width: UDF_COLUMN_WIDTH,
            sortable: true,
            filter: field.type === "alphanumeric" ? ("text" as const) : ("list" as const),
          })),
          { key: "actions", label: "Actions", align: "right", width: 100 },
        ]}
        rows={rows}
        total={total}
        filtered={stores.length}
        entityLabel="stores"
        searchValue={query.searchInput}
        onSearchChange={query.setSearchInput}
        loading={loading}
        serverPagination={pagination}
        masterQuery={masterQuery}
        minWidth={minWidth}
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
              onClick={onExportFiltered}
              disabled={exportPreparing}
              title="Download the stores shown in the table, with the current filters and sort"
            >
              {exportPreparing ? "Preparing Excel…" : "↓ Export (filtered)"}
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
