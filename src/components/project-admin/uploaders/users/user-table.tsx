"use client";

import { useState } from "react";
import { Users, CheckCircle, XCircle } from "lucide-react";
import { DataTable } from "@/components/project-admin/shared/data-table";
import { StatCard } from "@/components/project-admin/shared/stat-card";
import { StatusPill } from "@/components/project-admin/shared/status-pill";
import { ActionButtons } from "@/components/project-admin/shared/action-buttons";
import { EditUserModal } from "./edit-user-modal";
import { AuditHistoryModal } from "@/components/project-admin/shared/audit-history-modal";
import type { ProjectUser, UDFField, Status } from "@/types/project-admin";

interface UserTableProps {
  users: ProjectUser[];
  udfFields: UDFField[];
  loading: boolean;
  projectId: string;
  onOpenUDFConfig: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

const GRID = "1.5fr 140px 140px 120px 80px 100px";

export function UserTable({
  users,
  udfFields,
  loading,
  projectId,
  onOpenUDFConfig,
  onRefresh,
  onExport,
}: UserTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);

  const filtered = users
    .filter((u) => filter === "all" || u.status === filter)
    .filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });

  const total = users.length;
  const activeCount = users.filter((u) => u.status === "active").length;

  const cellTruncate: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const rows = filtered.map((u, index) => {
    const rowKey = `${u.backendId || u.id}-${index}`;
    const initials = u.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2);
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
          minWidth: 720,
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
            {initials || "?"}
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--navy)",
                ...cellTruncate,
              }}
            >
              {u.name}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", ...cellTruncate }}>
              {u.email}
            </div>
          </div>
        </div>

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
            {u.id}
          </span>
        </div>

        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", ...cellTruncate }}>
            {u.designation}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", ...cellTruncate }}>{u.role}</div>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-mid)", minWidth: 0, ...cellTruncate }}>
          {u.mobile}
        </div>

        <div>
          <StatusPill status={u.status} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ActionButtons
            status={u.status}
            entityType="users"
            entityId={u.backendId || u.id}
            projectId={projectId}
            onEdit={() => setEditId(u.backendId || u.id)}
            onAudit={() => setAuditId(u.backendId || u.id)}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    );
  });

  const editingUser = editId
    ? users.find((u) => (u.backendId || u.id) === editId)
    : undefined;

  return (
    <>
      <div className="stat-grid">
        <StatCard
          value={total}
          label="Total Users"
          color="blue"
          icon={<Users size={20} />}
          selected={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <StatCard
          value={activeCount}
          label="Active Users"
          color="teal"
          icon={<CheckCircle size={20} />}
          selected={filter === "active"}
          onClick={() => setFilter("active")}
        />
        <StatCard
          value={total - activeCount}
          label="Inactive Users"
          color="red"
          icon={<XCircle size={20} />}
          selected={filter === "inactive"}
          onClick={() => setFilter("inactive")}
        />
      </div>

      <DataTable
        columns={[
          { key: "user", label: "User", width: "1.5fr" },
          { key: "loginId", label: "Login ID", width: 140 },
          { key: "designation", label: "Designation", width: 140 },
          { key: "mobile", label: "Mobile", width: 120 },
          { key: "status", label: "Status", width: 80 },
          { key: "actions", label: "Actions", align: "right", width: 100 },
        ]}
        rows={rows}
        total={total}
        filtered={filtered.length}
        entityLabel="users"
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
            <button type="button" className="btn btn-secondary btn-sm" onClick={onExport}>
              ↓ Export
            </button>
          </>
        }
      />

      {editingUser && (
        <EditUserModal
          user={editingUser}
          backendUserId={editingUser.backendId || editingUser.id}
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
          entityType="User"
          entityId={auditId}
          entries={[]}
        />
      )}
    </>
  );
}
