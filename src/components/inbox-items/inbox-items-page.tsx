"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  inboxItemsService,
  type InboxItem,
  type InboxFilters,
  type InboxPagination,
  type InboxAvailableFilter,
  type InboxAvailableSort,
} from "@/lib/api/inbox-items-service";

interface InboxItemsPageProps {
  projectId: string;
  projectName: string;
}

const SLA_COLORS: Record<string, { bg: string; color: string }> = {
  OnTime: { bg: "#dcfce7", color: "#16a34a" },
  Warning: { bg: "#fef3c7", color: "#d97706" },
  Breached: { bg: "#fee2e2", color: "#dc2626" },
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

/**
 * Resolve a display field value from moduleData using the fieldKey.
 */
function resolveFieldValue(
  fieldKey: string,
  dataType: string,
  moduleData: Record<string, unknown>
): string {
  const raw = moduleData[fieldKey];
  if (raw === undefined || raw === null) return "—";
  if (dataType === "date" && typeof raw === "string") return formatDate(raw);
  return String(raw);
}

export function InboxItemsPage({ projectId, projectName }: InboxItemsPageProps) {
  // List state
  const [items, setItems] = useState<InboxItem[]>([]);
  const [pagination, setPagination] = useState<InboxPagination>({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Dynamic filters from API
  const [availableFilters, setAvailableFilters] = useState<InboxAvailableFilter[]>([]);
  const [availableSorts, setAvailableSorts] = useState<InboxAvailableSort[]>([]);

  // Filters
  const [filterModule, setFilterModule] = useState("");
  const [filterSla, setFilterSla] = useState("");
  const [sortBy, setSortBy] = useState("slaDeadline");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail dialog state
  const [detailItem, setDetailItem] = useState<InboxItem | null>(null);
  const [detailProcessing, setDetailProcessing] = useState(false);

  // Remark dialog state
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarkAction, setRemarkAction] = useState<"reject" | "send-back">("reject");
  const [remarkTargetIds, setRemarkTargetIds] = useState<string[]>([]);
  const [remarkText, setRemarkText] = useState("");
  const [remarkSubmitting, setRemarkSubmitting] = useState(false);

  // Processing state for individual approve in list
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch items
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: InboxFilters = {
        projectId,
        status: "Pending_Approval",
        page,
        pageSize: 20,
        sortBy,
        sortDirection,
      };
      if (filterModule) filters.module = filterModule;
      if (filterSla) filters.slaStatus = filterSla;

      const res = await inboxItemsService.getAssignedToMe(filters);
      setItems(res.items);
      setPagination(res.pagination);
      if (res.availableFilters.length > 0) setAvailableFilters(res.availableFilters);
      if (res.availableSorts.length > 0) setAvailableSorts(res.availableSorts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox items");
    } finally {
      setLoading(false);
    }
  }, [projectId, page, filterModule, filterSla, sortBy, sortDirection]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterModule, filterSla, sortBy, sortDirection]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.inboxItemId)));
    }
  };

  // Get filter options from availableFilters
  const moduleFilterOptions = availableFilters.find((f) => f.filterKey === "module")?.options ?? [];
  const slaFilterOptions = availableFilters.find((f) => f.filterKey === "slaStatus")?.options ?? [];

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleApprove = async (id: string, fromDetail = false) => {
    if (fromDetail) setDetailProcessing(true);
    else setProcessingId(id);
    try {
      await inboxItemsService.approve(id);
      setToast({ type: "success", message: "Request approved." });
      if (fromDetail) setDetailItem(null);
      await loadItems();
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to approve" });
    } finally {
      if (fromDetail) setDetailProcessing(false);
      else setProcessingId(null);
    }
  };

  const openRemarkDialog = (action: "reject" | "send-back", ids: string[]) => {
    setRemarkAction(action);
    setRemarkTargetIds(ids);
    setRemarkText("");
    setRemarkDialogOpen(true);
  };

  const handleRemarkSubmit = async () => {
    if (!remarkText.trim()) return;
    setRemarkSubmitting(true);
    try {
      if (remarkTargetIds.length === 1) {
        if (remarkAction === "reject") {
          await inboxItemsService.reject(remarkTargetIds[0], remarkText.trim());
        } else {
          await inboxItemsService.sendBack(remarkTargetIds[0], remarkText.trim());
        }
      } else {
        if (remarkAction === "reject") {
          await inboxItemsService.bulkReject(remarkTargetIds, remarkText.trim());
        } else {
          await inboxItemsService.bulkSendBack(remarkTargetIds, remarkText.trim());
        }
      }
      setRemarkDialogOpen(false);
      setDetailItem(null);
      const actionLabel = remarkAction === "reject" ? "rejected" : "sent back";
      setToast({
        type: "success",
        message: remarkTargetIds.length === 1
          ? `Request ${actionLabel}.`
          : `${remarkTargetIds.length} requests ${actionLabel}.`,
      });
      setSelectedIds(new Set());
      await loadItems();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setRemarkSubmitting(false);
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await inboxItemsService.bulkApprove(ids);
      setToast({ type: "success", message: `${ids.length} request${ids.length > 1 ? "s" : ""} approved.` });
      setSelectedIds(new Set());
      await loadItems();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Bulk approve failed" });
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="att-config-page">
      {/* Header */}
      <div className="pa-page-header">
        <div>
          <div className="pa-eyebrow">Inbox</div>
          <div className="pa-page-title">Pending Approvals</div>
          <div className="pa-page-desc">
            Review and action pending requests for {projectName}.
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          className="form-input"
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          style={{ width: "auto", minWidth: 140 }}
        >
          <option value="">All Modules</option>
          {moduleFilterOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className="form-input"
          value={filterSla}
          onChange={(e) => setFilterSla(e.target.value)}
          style={{ width: "auto", minWidth: 130 }}
        >
          <option value="">All SLA</option>
          {slaFilterOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {availableSorts.length > 0 && (
          <select
            className="form-input"
            value={`${sortBy}:${sortDirection}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(":");
              setSortBy(key);
              setSortDirection(dir as "asc" | "desc");
            }}
            style={{ width: "auto", minWidth: 160 }}
          >
            {availableSorts.map((s) => (
              <option key={s.sortKey} value={`${s.sortKey}:${s.defaultDirection}`}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 16,
            padding: "10px 16px",
            background: "var(--primary-light, #e0e7ff)",
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: 12, padding: "5px 12px" }}
            onClick={handleBulkApprove}
          >
            Approve All
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "5px 12px" }}
            onClick={() => openRemarkDialog("reject", Array.from(selectedIds))}
          >
            Reject All
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "5px 12px" }}
            onClick={() => openRemarkDialog("send-back", Array.from(selectedIds))}
          >
            Send Back All
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="pa-loading">Loading inbox items…</div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="pa-info-banner" style={{ marginBottom: 16 }}>
          No pending approvals found.
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <>
          {/* Select all */}
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.size === items.length && items.length > 0}
                onChange={toggleSelectAll}
                style={{ accentColor: "var(--primary, #4f46e5)" }}
              />
              Select all
            </label>
          </div>

          {/* Table-style list */}
          <div
            style={{
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px 1.5fr 1fr 1fr 1fr 80px",
                padding: "10px 16px",
                background: "var(--bg-muted, #f8fafc)",
                borderBottom: "1px solid var(--border, #e2e8f0)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted, #64748b)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              <span />
              <span>Submitted By</span>
              <span>Request Type</span>
              <span>Status</span>
              <span>Submitted Date</span>
              <span>SLA</span>
            </div>

            {/* Item rows */}
            {items.map((item) => {
              const slaStyle = SLA_COLORS[item.slaStatus] ?? SLA_COLORS.OnTime;
              const isSelected = selectedIds.has(item.inboxItemId);
              const statusCfg = item.displayMetadata.statusConfig[item.currentStatus];

              return (
                <div
                  key={item.inboxItemId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1.5fr 1fr 1fr 1fr 80px",
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border, #f1f5f9)",
                    background: isSelected ? "var(--primary-light, #e0e7ff)" : "#fff",
                    cursor: "pointer",
                    alignItems: "center",
                  }}
                  onClick={() => setDetailItem(item)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.inboxItemId);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ accentColor: "var(--primary, #4f46e5)" }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                      {item.submittedBy.displayName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)" }}>
                      {item.submittedBy.designation}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: "#334155", textTransform: "capitalize" }}>
                    {item.requestType}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: statusCfg?.colorCode ?? "#475569",
                      fontWeight: 500,
                    }}
                  >
                    {statusCfg?.displayLabel ?? formatStatus(item.currentStatus)}
                  </span>
                  <span style={{ fontSize: 12, color: "#475569" }}>
                    {formatDate(item.submittedDate)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: slaStyle.bg,
                      color: slaStyle.color,
                      fontWeight: 500,
                      textAlign: "center",
                    }}
                  >
                    {item.slaStatus}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: "5px 12px" }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: 13, color: "#475569" }}>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: "5px 12px" }}
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Modal
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Request Details"
        width={560}
        footer={
          detailItem ? (
            <div style={{ display: "flex", gap: 8, width: "100%", justifyContent: "flex-end" }}>
              {detailItem.availableActions
                .filter((a) => a.enabled)
                .map((action) => {
                  if (action.actionKey === "approve") {
                    return (
                      <button
                        key={action.actionKey}
                        type="button"
                        className="btn btn-primary"
                        style={{ background: action.color, borderColor: action.color }}
                        onClick={() => handleApprove(detailItem.inboxItemId, true)}
                        disabled={detailProcessing}
                      >
                        {detailProcessing ? "Approving…" : action.label}
                      </button>
                    );
                  }
                  if (action.actionKey === "reject") {
                    return (
                      <button
                        key={action.actionKey}
                        type="button"
                        className="btn btn-secondary"
                        style={{ color: action.color, borderColor: action.color }}
                        onClick={() => openRemarkDialog("reject", [detailItem.inboxItemId])}
                      >
                        {action.label}
                      </button>
                    );
                  }
                  if (action.actionKey === "send-back") {
                    return (
                      <button
                        key={action.actionKey}
                        type="button"
                        className="btn btn-secondary"
                        style={{ color: action.color, borderColor: action.color }}
                        onClick={() => openRemarkDialog("send-back", [detailItem.inboxItemId])}
                      >
                        {action.label}
                      </button>
                    );
                  }
                  return null;
                })}
            </div>
          ) : undefined
        }
      >
        {detailItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Top info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                padding: 12,
                background: "var(--bg-muted, #f8fafc)",
                borderRadius: 6,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginBottom: 2 }}>
                  Submitted By
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                  {detailItem.submittedBy.displayName}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>
                  {detailItem.submittedBy.designation}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginBottom: 2 }}>
                  Request Type
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0f172a", textTransform: "capitalize" }}>
                  {detailItem.requestType}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginBottom: 2 }}>
                  Status
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: detailItem.displayMetadata.statusConfig[detailItem.currentStatus]?.colorCode ?? "#475569",
                  }}
                >
                  {detailItem.displayMetadata.statusConfig[detailItem.currentStatus]?.displayLabel ?? formatStatus(detailItem.currentStatus)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginBottom: 2 }}>
                  Module
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#475569", textTransform: "capitalize" }}>
                  {detailItem.module}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginBottom: 2 }}>
                  Submitted Date
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>
                  {formatDate(detailItem.submittedDate)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginBottom: 2 }}>
                  SLA Deadline
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>
                    {formatDate(detailItem.slaDeadline)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "1px 6px",
                      borderRadius: 8,
                      background: (SLA_COLORS[detailItem.slaStatus] ?? SLA_COLORS.OnTime).bg,
                      color: (SLA_COLORS[detailItem.slaStatus] ?? SLA_COLORS.OnTime).color,
                      fontWeight: 600,
                    }}
                  >
                    {detailItem.slaStatus}
                  </span>
                </div>
              </div>
              {detailItem.totalLevels > 1 && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginBottom: 2 }}>
                    Approval Level
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#475569" }}>
                    {detailItem.currentLevel} of {detailItem.totalLevels}
                  </div>
                </div>
              )}
            </div>

            {/* Display fields (from displayMetadata.fields + moduleData) */}
            {detailItem.displayMetadata.fields.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted, #64748b)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    marginBottom: 8,
                  }}
                >
                  Details
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    padding: 12,
                    border: "1px solid var(--border, #e2e8f0)",
                    borderRadius: 6,
                  }}
                >
                  {[...detailItem.displayMetadata.fields]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((f) => (
                      <div key={f.fieldKey}>
                        <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginBottom: 2 }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                          {resolveFieldValue(f.fieldKey, f.dataType, detailItem.moduleData)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Remark Dialog (for reject / send-back) */}
      <Modal
        open={remarkDialogOpen}
        onClose={() => setRemarkDialogOpen(false)}
        title={remarkAction === "reject" ? "Reject Request" : "Send Back Request"}
        width={440}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setRemarkDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRemarkSubmit}
              disabled={!remarkText.trim() || remarkSubmitting}
            >
              {remarkSubmitting ? "Submitting…" : "Submit"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="form-label">
            Remarks <span className="req">*</span>
          </label>
          <textarea
            className="form-input"
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder={
              remarkAction === "reject"
                ? "Reason for rejection…"
                : "Reason for sending back…"
            }
            rows={4}
            style={{ resize: "vertical" }}
          />
          {remarkTargetIds.length > 1 && (
            <span style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)" }}>
              This will apply to {remarkTargetIds.length} selected items
            </span>
          )}
        </div>
      </Modal>

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
