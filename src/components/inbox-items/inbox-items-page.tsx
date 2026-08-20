"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  inboxItemsService,
  type InboxItem,
  type InboxFilters,
  type InboxPagination,
} from "@/lib/api/inbox-items-service";

interface InboxItemsPageProps {
  projectId: string;
  projectName: string;
}

const MODULE_OPTIONS = [
  { label: "All Modules", value: "" },
  { label: "Leave", value: "leave" },
  { label: "Claims", value: "claims" },
  { label: "Regularization", value: "regularization" },
  { label: "Visit", value: "visit" },
];

const SLA_OPTIONS = [
  { label: "All SLA", value: "" },
  { label: "On Time", value: "OnTime" },
  { label: "Warning", value: "Warning" },
  { label: "Breached", value: "Breached" },
];

const SLA_COLORS: Record<string, { bg: string; color: string }> = {
  OnTime: { bg: "#dcfce7", color: "#16a34a" },
  Warning: { bg: "#fef3c7", color: "#d97706" },
  Breached: { bg: "#fee2e2", color: "#dc2626" },
};

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

  // Filters
  const [filterModule, setFilterModule] = useState("");
  const [filterSla, setFilterSla] = useState("");
  const [page, setPage] = useState(1);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Remark dialog state
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarkAction, setRemarkAction] = useState<"reject" | "send-back">("reject");
  const [remarkTargetIds, setRemarkTargetIds] = useState<string[]>([]);
  const [remarkText, setRemarkText] = useState("");
  const [remarkSubmitting, setRemarkSubmitting] = useState(false);

  // Processing state for individual approve
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
        sortBy: "slaDeadline",
        sortDirection: "asc",
      };
      if (filterModule) filters.module = filterModule;
      if (filterSla) filters.slaStatus = filterSla;

      const res = await inboxItemsService.getAssignedToMe(filters);
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox items");
    } finally {
      setLoading(false);
    }
  }, [projectId, page, filterModule, filterSla]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterModule, filterSla]);

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

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await inboxItemsService.approve(id);
      setToast({ type: "success", message: "Request approved." });
      await loadItems();
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to approve" });
    } finally {
      setProcessingId(null);
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
        // Single action
        if (remarkAction === "reject") {
          await inboxItemsService.reject(remarkTargetIds[0], remarkText.trim());
        } else {
          await inboxItemsService.sendBack(remarkTargetIds[0], remarkText.trim());
        }
      } else {
        // Bulk action
        if (remarkAction === "reject") {
          await inboxItemsService.bulkReject(remarkTargetIds, remarkText.trim());
        } else {
          await inboxItemsService.bulkSendBack(remarkTargetIds, remarkText.trim());
        }
      }
      setRemarkDialogOpen(false);
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

  // Bulk approve
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
          {MODULE_OPTIONS.map((o) => (
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
          {SLA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => {
              const slaStyle = SLA_COLORS[item.slaStatus] ?? SLA_COLORS.OnTime;
              const isSelected = selectedIds.has(item.inboxItemId);
              const isProcessing = processingId === item.inboxItemId;

              return (
                <article
                  key={item.inboxItemId}
                  style={{
                    background: isSelected ? "var(--primary-light, #e0e7ff)" : "#fff",
                    border: "1px solid var(--border, #e2e8f0)",
                    borderRadius: 8,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {/* Top row: checkbox + submitted by + module badge + SLA */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.inboxItemId)}
                      style={{ accentColor: "var(--primary, #4f46e5)" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        {item.submittedBy.firstName} {item.submittedBy.lastName}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)" }}>
                        {item.submittedBy.designation}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: "#e0e7ff",
                        color: "#4f46e5",
                        fontWeight: 500,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.module}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: slaStyle.bg,
                        color: slaStyle.color,
                        fontWeight: 500,
                      }}
                    >
                      {item.slaStatus}
                    </span>
                  </div>

                  {/* Request type */}
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>
                    {item.requestType}
                  </div>

                  {/* Display fields */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                    {item.displayFields.map((f) => (
                      <div key={f.key}>
                        <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)" }}>
                          {f.label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {item.actions.includes("approve") && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: 12, padding: "5px 14px" }}
                        onClick={() => handleApprove(item.inboxItemId)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Approving…" : "Approve"}
                      </button>
                    )}
                    {item.actions.includes("reject") && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: "5px 14px", color: "#dc2626", borderColor: "#dc2626" }}
                        onClick={() => openRemarkDialog("reject", [item.inboxItemId])}
                      >
                        Reject
                      </button>
                    )}
                    {item.actions.includes("send-back") && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: "5px 14px" }}
                        onClick={() => openRemarkDialog("send-back", [item.inboxItemId])}
                      >
                        Send Back
                      </button>
                    )}
                  </div>
                </article>
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
