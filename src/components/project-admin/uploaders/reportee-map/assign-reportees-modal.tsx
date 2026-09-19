"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import {
  userReporteeMappingService,
  type UserReporteeMappingSummary,
} from "@/lib/api/user-reportee-mapping-service";
import { formatApiError } from "@/lib/api";
import { formatUserNameWithCode } from "@/lib/project-admin/user-display";
import { MAX_LIST_PAGE_SIZE } from "@/lib/api/pagination";
import type { ProjectUser } from "@/types/project-admin";

const SEARCH_DEBOUNCE_MS = 300;

interface AssignReporteesModalProps {
  user: UserReporteeMappingSummary;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignReporteesModal({
  user,
  projectId,
  open,
  onClose,
  onSuccess,
}: AssignReporteesModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [users, setUsers] = useState<ProjectUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = search.trim();
      setDebouncedSearch((prev) => {
        if (prev !== next) {
          setPage(1);
        }
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
    setError(null);
    let cancelled = false;

    const loadMapped = async () => {
      setLoading(true);
      try {
        const reporteeIds = await userReporteeMappingService.getMappedReporteeIds(
          projectId,
          user.userId,
        );
        if (!cancelled) setSelected(new Set(reporteeIds));
      } catch (e) {
        if (!cancelled) {
          setError(formatApiError(e, "Failed to load mapped reportees"));
          setSelected(new Set());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMapped();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, user.userId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const loadUsers = async () => {
      try {
        const result = await userReporteeMappingService.listUsersPage(
          projectId,
          page,
          MAX_LIST_PAGE_SIZE,
          debouncedSearch || undefined,
        );
        if (!cancelled) {
          setUsers(result.data.filter((candidate) => candidate.backendId !== user.userId));
          setTotalPages(result.meta.totalPages);
          setTotalCount(result.meta.totalCount);
        }
      } catch (e) {
        if (!cancelled) {
          setError(formatApiError(e, "Failed to search users"));
          setUsers([]);
        }
      }
    };

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, debouncedSearch, page, user.userId]);

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      users.forEach((candidate) => {
        if (candidate.backendId) next.add(candidate.backendId);
      });
      return next;
    });
  };

  const clearPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      users.forEach((candidate) => {
        if (candidate.backendId) next.delete(candidate.backendId);
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await userReporteeMappingService.updateMapping(
        projectId,
        user.userId,
        Array.from(selected),
      );
      onSuccess();
    } catch (e) {
      setError(formatApiError(e, "Failed to update reportee mapping"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = selected.size;
  const pageSelectedCount = users.filter((candidate) =>
    selected.has(candidate.backendId),
  ).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign Reportees — ${formatUserNameWithCode(user.name, user.employeeId)}`}
      width={600}
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
            {submitting ? "Saving…" : `Save Mapping (${selectedCount} reportees)`}
          </button>
        </>
      }
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          marginBottom: 16,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>
            {formatUserNameWithCode(user.name, user.employeeId)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {user.email}
          </div>
        </div>
        {user.designation && (
          <div
            style={{
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 20,
              background: "var(--blue-pale)",
              color: "var(--blue)",
              fontWeight: 600,
            }}
          >
            {user.designation}
          </div>
        )}
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
          {selectedCount} selected · {pageSelectedCount}/{users.length} on this page
        </div>
      </div>

      <div className="pa-info-banner" style={{ marginBottom: 12 }}>
        Search loads one page of up to {MAX_LIST_PAGE_SIZE} users (active and inactive).
        Select All / Clear apply to this page only.
      </div>

      {error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <input
          className="form-input"
          style={{ flex: 1 }}
          placeholder="Search users by name, email, or employee ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={selectAll}
          disabled={users.length === 0}
        >
          Select All
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={clearPage}
          disabled={pageSelectedCount === 0}
        >
          Clear
        </button>
      </div>

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
          maxHeight: 340,
          overflowY: "auto",
        }}
      >
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            Loading mapped reportees…
          </div>
        ) : users.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            {debouncedSearch
              ? `No users match "${debouncedSearch}"`
              : "No users found for this project."}
          </div>
        ) : (
          users.map((candidate, idx) => {
            const isChecked = selected.has(candidate.backendId);
            const inactive = candidate.status === "inactive";
            const subtitle = [candidate.designation, inactive ? "Inactive" : ""]
              .filter(Boolean)
              .join(" · ");
            return (
              <label
                key={candidate.backendId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 16px",
                  borderBottom:
                    idx < users.length - 1 ? "1px solid var(--border)" : "none",
                  cursor: "pointer",
                  background: isChecked
                    ? "var(--blue-pale)"
                    : inactive
                      ? "var(--red-light)"
                      : "var(--surface)",
                  transition: "background .1s",
                  userSelect: "none",
                  opacity: inactive ? 0.85 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleUser(candidate.backendId)}
                  style={{ width: 16, height: 16, flexShrink: 0, accentColor: "var(--blue)" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: inactive ? "var(--red)" : "var(--navy)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatUserNameWithCode(candidate.name, candidate.id)}
                  </div>
                  {subtitle ? (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{subtitle}</div>
                  ) : null}
                </div>
                {isChecked && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "var(--blue)",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    Assigned
                  </div>
                )}
              </label>
            );
          })
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 4px 0",
          fontSize: 11,
          color: "var(--text-muted)",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>
          {totalCount > 0
            ? `Page ${page} of ${totalPages} · ${totalCount} users`
            : "No users"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </Modal>
  );
}
