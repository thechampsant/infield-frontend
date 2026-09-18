"use client";

import { useState } from "react";
import { CheckCircle, Link2, Link2Off, Users, XCircle } from "lucide-react";
import { AssignReporteesModal } from "./assign-reportees-modal";
import { StatCard } from "@/components/project-admin/shared/stat-card";
import { StatusPill } from "@/components/project-admin/shared/status-pill";
import type {
  UserListStatus,
  UserReporteeMappingFilter,
  UserReporteeMappingSummary,
} from "@/lib/api/user-reportee-mapping-service";
import { LIST_PAGE_SIZE_OPTIONS } from "@/lib/api/pagination";
import type { ServerPagination } from "@/components/project-admin/shared/data-table";

interface ReporteeMapTableProps {
  users: UserReporteeMappingSummary[];
  loading: boolean;
  projectId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  mappedFilter: UserReporteeMappingFilter;
  onMappedFilterChange: (value: UserReporteeMappingFilter) => void;
  mappedCount: number;
  unmappedCount: number;
  statusFilter: UserListStatus;
  onStatusFilterChange: (value: UserListStatus) => void;
  activeCount: number;
  inactiveCount: number;
  pagination: ServerPagination;
  onRefresh: () => void;
}

const GRID = "120px 1.6fr 140px 90px 90px 1fr 90px";

export function ReporteeMapTable({
  users,
  loading,
  projectId,
  searchValue,
  onSearchChange,
  mappedFilter,
  onMappedFilterChange,
  mappedCount,
  unmappedCount,
  statusFilter,
  onStatusFilterChange,
  activeCount,
  inactiveCount,
  pagination,
  onRefresh,
}: ReporteeMapTableProps) {
  const [assignUser, setAssignUser] = useState<UserReporteeMappingSummary | null>(null);
  const allCount = activeCount + inactiveCount;
  const mappedPillCount = mappedCount + unmappedCount;
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
      <div className="stat-grid">
        <StatCard
          value={allCount}
          label="Total Users"
          color="blue"
          icon={<Users size={20} />}
          selected={statusFilter === "all"}
          onClick={() => onStatusFilterChange("all")}
        />
        <StatCard
          value={activeCount}
          label="Active Users"
          color="teal"
          icon={<CheckCircle size={20} />}
          selected={statusFilter === "active"}
          onClick={() => onStatusFilterChange("active")}
        />
        <StatCard
          value={inactiveCount}
          label="Inactive Users"
          color="red"
          icon={<XCircle size={20} />}
          selected={statusFilter === "inactive"}
          onClick={() => onStatusFilterChange("inactive")}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {(
          [
            { key: "all", label: "All Users", count: mappedPillCount },
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
            <span
              style={{
                marginLeft: 6,
                background: mappedFilter === key ? "var(--blue)" : "var(--surface2)",
                color: mappedFilter === key ? "#fff" : "var(--text-muted)",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface2)",
          }}
        >
          <input
            type="text"
            className="form-input"
            style={{ flex: 1, maxWidth: 320 }}
            placeholder="Search users by name, email, ID…"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
            {loading ? "Loading…" : `Showing ${users.length} of ${pagination.totalCount} users`}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID,
            gap: 12,
            padding: "10px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface2)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            minWidth: 820,
          }}
        >
          <span>Employee ID</span>
          <span>User</span>
          <span>Designation</span>
          <span>Status</span>
          <span>Mapped</span>
          <span>Reportees</span>
          <span style={{ textAlign: "right" }}>Action</span>
        </div>

        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading…
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {searchValue || mappedFilter !== "all" || statusFilter !== "all"
              ? "No users match the current filter."
              : "No users found for this project."}
          </div>
        ) : (
          users.map((row, idx) => {
            const hasMapped = row.mappedCount > 0;
            const inactive = !row.isActive;

            return (
              <div
                key={`${row.userId}-${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  gap: 12,
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                  minWidth: 820,
                  background: inactive ? "var(--red-light)" : undefined,
                  opacity: inactive ? 0.9 : 1,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-mid)", ...cellTruncate }}>
                  {row.employeeId || "—"}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: hasMapped ? "var(--blue)" : "var(--surface2)",
                      border: hasMapped ? "none" : "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: hasMapped ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    {hasMapped ? <Link2 size={14} /> : <Link2Off size={14} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: inactive ? "var(--red)" : "var(--navy)",
                        ...cellTruncate,
                      }}
                    >
                      {row.name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", ...cellTruncate }}>
                      {row.email}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-mid)", ...cellTruncate }}>
                  {row.designation || "—"}
                </div>

                <div>
                  <StatusPill status={inactive ? "inactive" : "active"} />
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>
                  {row.mappedCount}
                </div>

                <div>
                  {hasMapped ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {row.sampleReporteeNames.map((name) => (
                        <span
                          key={`${row.userId}-${name}`}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "var(--teal-light, #f0fdfa)",
                            color: "var(--teal, #0d9488)",
                            border: "1px solid var(--teal-mid, #99f6e4)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {name}
                        </span>
                      ))}
                      {row.mappedCount > row.sampleReporteeNames.length && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "var(--surface2)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          +{row.mappedCount - row.sampleReporteeNames.length} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                      No reportees mapped
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAssignUser(row)}
                    style={{ fontSize: 11, whiteSpace: "nowrap" }}
                  >
                    {hasMapped ? "Edit" : "Assign"}
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            fontSize: 11,
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border)",
            background: "var(--surface2)",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
            Show
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              aria-label="Rows of users per page"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text)",
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 6px",
              }}
            >
              {(pagination.pageSizeOptions ?? LIST_PAGE_SIZE_OPTIONS).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            per page
          </label>
          <span style={{ fontWeight: 500 }}>
            {pagination.totalCount > 0
              ? `Showing ${rangeStart}–${rangeEnd} of ${pagination.totalCount} users`
              : "No users"}
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

      {assignUser && (
        <AssignReporteesModal
          user={assignUser}
          projectId={projectId}
          open={!!assignUser}
          onClose={() => setAssignUser(null)}
          onSuccess={() => {
            setAssignUser(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
