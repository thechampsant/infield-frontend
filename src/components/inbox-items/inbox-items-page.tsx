"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  inboxItemsService,
  type InboxItem,
  type InboxFilters,
  type InboxPagination,
  type InboxAvailableAction,
} from "@/lib/api/inbox-items-service";
import {
  actionTone,
  capitalize,
  formatFieldValue,
  hexToBadgeStyle,
  resolveFields,
  timeAgo,
  toneColor,
  type ResolvedField,
} from "./inbox-format";
import { AuthedImage } from "./authed-image";

interface InboxItemsPageProps {
  projectId: string;
  projectName: string;
}

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
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Dynamic filters from API. Module options are captured from the
  // unfiltered response and kept stable so the dropdown always shows every
  // module even after a filter is applied (a filtered response only reports
  // the filtered module).
  const [moduleOptions, setModuleOptions] = useState<{ value: string; label: string }[]>([]);

  // Filters — sort fixed to newest submitted first
  const [filterModule, setFilterModule] = useState("");
  const sortBy = "submittedDate";
  const sortDirection = "desc" as const;
  const [page, setPage] = useState(1);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail dialog state
  const [detailItem, setDetailItem] = useState<InboxItem | null>(null);
  const [detailProcessing, setDetailProcessing] = useState(false);

  // Remark dialog state
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarkAction, setRemarkAction] = useState<"reject" | "send-back" | "approve">("reject");
  const [remarkTargetIds, setRemarkTargetIds] = useState<string[]>([]);
  const [remarkRequired, setRemarkRequired] = useState(true);
  const [remarkText, setRemarkText] = useState("");
  const [remarkSubmitting, setRemarkSubmitting] = useState(false);

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

      const res = await inboxItemsService.getAssignedToMe(filters);
      setItems(res.items);
      setPagination(res.pagination);

      // Capture module options only from the UNFILTERED response so the
      // full list stays available. Prefer availableFilters; fall back to
      // summary.byModule, then to the modules present in the returned items.
      const isUnfiltered = !filterModule;
      if (isUnfiltered) {
        const moduleFilter = res.availableFilters.find((f) => f.filterKey === "module");
        let modOpts = moduleFilter?.options ?? [];
        if (modOpts.length === 0 && res.summary.byModule) {
          modOpts = Object.keys(res.summary.byModule).map((key) => ({
            value: key,
            label: capitalize(key),
          }));
        }
        if (modOpts.length === 0) {
          const uniqueModules = Array.from(new Set(res.items.map((i) => i.module))).filter(Boolean);
          modOpts = uniqueModules.map((m) => ({ value: m, label: capitalize(m) }));
        }
        if (modOpts.length > 0) setModuleOptions(modOpts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox items");
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [projectId, page, filterModule]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setPage(1);
  }, [filterModule]);

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

  const moduleFilterOptions = moduleOptions;

  // ─── Actions ────────────────────────────────────────────────────────────

  const runApprove = async (id: string, remarks = "Approved") => {
    setDetailProcessing(true);
    try {
      await inboxItemsService.approve(id, remarks);
      setToast({ type: "success", message: "Request approved." });
      setDetailItem(null);
      await loadItems();
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to approve" });
    } finally {
      setDetailProcessing(false);
    }
  };

  // Handle a per-item action button from the detail dialog
  const handleItemAction = (item: InboxItem, action: InboxAvailableAction) => {
    const key = action.actionKey;
    // Approve with no confirmation → send default "Approved"
    if (key === "approve" && !action.confirmationRequired) {
      void runApprove(item.inboxItemId, "Approved");
      return;
    }
    // Otherwise open confirmation/remarks dialog
    setRemarkAction(key as "reject" | "send-back" | "approve");
    setRemarkTargetIds([item.inboxItemId]);
    setRemarkRequired(action.remarksRequired);
    setRemarkText("");
    setRemarkDialogOpen(true);
  };

  // Bulk action openers
  const openBulkRemark = (action: "reject" | "send-back") => {
    setRemarkAction(action);
    setRemarkTargetIds(Array.from(selectedIds));
    setRemarkRequired(true);
    setRemarkText("");
    setRemarkDialogOpen(true);
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

  const handleRemarkSubmit = async () => {
    if (remarkRequired && !remarkText.trim()) return;
    const remarks = remarkText.trim() || (remarkAction === "approve" ? "Approved" : "");
    setRemarkSubmitting(true);
    try {
      const ids = remarkTargetIds;
      const single = ids.length === 1;

      if (remarkAction === "approve") {
        if (single) await inboxItemsService.approve(ids[0], remarks);
        else await inboxItemsService.bulkApprove(ids, remarks);
      } else if (remarkAction === "reject") {
        if (single) await inboxItemsService.reject(ids[0], remarks);
        else await inboxItemsService.bulkReject(ids, remarks);
      } else {
        if (single) await inboxItemsService.sendBack(ids[0], remarks);
        else await inboxItemsService.bulkSendBack(ids, remarks);
      }

      setRemarkDialogOpen(false);
      setDetailItem(null);
      const label =
        remarkAction === "approve" ? "approved" : remarkAction === "reject" ? "rejected" : "sent back";
      setToast({
        type: "success",
        message: single ? `Request ${label}.` : `${ids.length} requests ${label}.`,
      });
      setSelectedIds(new Set());
      await loadItems();
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setRemarkSubmitting(false);
    }
  };

  const remarkTitle =
    remarkAction === "approve"
      ? "Approve Request"
      : remarkAction === "reject"
        ? "Reject Request"
        : "Send Back Request";

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="att-config-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

        {/* Inline updating indicator (shown during refetch after first load) */}
        {initialLoaded && loading && (
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted, #94a3b8)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                border: "2px solid var(--border, #cbd5e1)",
                borderTopColor: "var(--primary, #4f46e5)",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }}
              aria-hidden
            />
            Updating…
          </span>
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
            onClick={() => openBulkRemark("reject")}
          >
            Reject All
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: "5px 12px" }}
            onClick={() => openBulkRemark("send-back")}
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

      {/* Initial loading (first load only) */}
      {!initialLoaded && loading && (
        <div className="pa-loading">Loading inbox items…</div>
      )}

      {/* Empty */}
      {initialLoaded && !loading && !error && items.length === 0 && (
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
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.15s",
              pointerEvents: loading ? "none" : "auto",
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
              <span>Submitted</span>
              <span>SLA</span>
            </div>

            {/* Item rows */}
            {items.map((item) => {
              const slaStyle = SLA_COLORS[item.slaStatus] ?? SLA_COLORS.OnTime;
              const isSelected = selectedIds.has(item.inboxItemId);
              const statusCfg = item.displayMetadata.statusConfig[item.currentStatus];
              const statusBadge = hexToBadgeStyle(statusCfg?.colorCode);

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
                      {item.submittedBy.displayName || "Unknown"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)" }}>
                      {capitalize(item.module)}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: "#334155", textTransform: "capitalize" }}>
                    {item.requestType}
                  </span>
                  <span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: statusBadge.bg,
                        border: `1px solid ${statusBadge.border}`,
                        color: statusBadge.color,
                        fontWeight: 500,
                      }}
                    >
                      {statusCfg?.displayLabel ?? item.currentStatus.replace(/_/g, " ")}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: "#475569" }}>
                    {timeAgo(item.submittedDate)}
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
                  const tone = actionTone(action.color);
                  const hex = toneColor(tone);
                  const solid = action.actionKey === "approve";
                  return (
                    <button
                      key={action.actionKey}
                      type="button"
                      className={solid ? "btn btn-primary" : "btn btn-secondary"}
                      style={
                        solid
                          ? { background: hex, borderColor: hex }
                          : { color: hex, borderColor: hex }
                      }
                      onClick={() => handleItemAction(detailItem, action)}
                      disabled={detailProcessing}
                    >
                      {detailProcessing && solid ? "Processing…" : action.label}
                    </button>
                  );
                })}
            </div>
          ) : undefined
        }
      >
        {detailItem && <DetailContent item={detailItem} />}
      </Modal>

      {/* Remark / Confirmation Dialog */}
      <Modal
        open={remarkDialogOpen}
        onClose={() => setRemarkDialogOpen(false)}
        title={remarkTitle}
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
              disabled={(remarkRequired && !remarkText.trim()) || remarkSubmitting}
            >
              {remarkSubmitting ? "Submitting…" : "Confirm"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="form-label">
            Remarks {remarkRequired && <span className="req">*</span>}
          </label>
          <textarea
            className="form-input"
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder={remarkRequired ? "Enter remarks…" : "Optional remarks…"}
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

// ─── Detail Content (header + metadata-driven fields) ─────────────────────

function DetailContent({ item }: { item: InboxItem }) {
  const statusCfg = item.displayMetadata.statusConfig[item.currentStatus];
  const statusBadge = hexToBadgeStyle(statusCfg?.colorCode);
  const slaStyle = SLA_COLORS[item.slaStatus] ?? SLA_COLORS.OnTime;

  const fields = resolveFields(item.displayMetadata.sections, item.moduleData);
  const textFields = fields.filter((f) => !f.isImage);
  const imageFields = fields.filter((f) => f.isImage);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          padding: 12,
          background: "var(--bg-muted, #f8fafc)",
          borderRadius: 6,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
            {item.submittedBy.displayName || "Unknown"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted, #94a3b8)", marginTop: 2 }}>
            {capitalize(item.module)} · {item.requestType}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", marginTop: 4 }}>
            {timeAgo(item.submittedDate)}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              padding: "2px 10px",
              borderRadius: 10,
              background: statusBadge.bg,
              border: `1px solid ${statusBadge.border}`,
              color: statusBadge.color,
              fontWeight: 500,
            }}
          >
            {statusCfg?.displayLabel ?? item.currentStatus.replace(/_/g, " ")}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "1px 8px",
              borderRadius: 8,
              background: slaStyle.bg,
              color: slaStyle.color,
              fontWeight: 600,
            }}
          >
            SLA: {item.slaStatus}
          </span>
          {item.totalLevels > 1 && (
            <span style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)" }}>
              Level {item.currentLevel} of {item.totalLevels}
            </span>
          )}
        </div>
      </div>

      {/* Text fields — 2-column grid */}
      {textFields.length > 0 && (
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
          {textFields.map((f) => (
            <div key={f.fieldKey}>
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--text-muted, #94a3b8)",
                  marginBottom: 3,
                }}
              >
                {f.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                {formatFieldValue(f.value, f.dataType)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image fields — full width */}
      {imageFields.map((f) => (
        <ImageField key={f.fieldKey} field={f} />
      ))}
    </div>
  );
}

function ImageField({ field }: { field: ResolvedField }) {
  // Normalize to a list: string → [value], array → as-is, null/empty → []
  const paths = Array.isArray(field.value)
    ? (field.value as unknown[]).filter(
        (v): v is string => typeof v === "string" && v.length > 0
      )
    : typeof field.value === "string" && field.value
      ? [field.value]
      : [];

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-muted, #94a3b8)",
          marginBottom: 6,
        }}
      >
        {field.label}
      </div>
      {paths.length === 0 ? (
        <span style={{ fontSize: 13, color: "#0f172a" }}>—</span>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {paths.map((p, idx) => (
            <AuthedImage key={idx} path={p} alt={field.label} size={64} />
          ))}
        </div>
      )}
    </div>
  );
}
