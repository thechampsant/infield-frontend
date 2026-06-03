"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  inboxService,
  isPending,
  type AssignedToMeResponse,
  type AttachmentItem,
  type InboxItemWithMetadata,
  type InboxQuery,
  type RaisedByMeResponse,
  type SortBy,
  type SortDirection,
} from "@/lib/api/inbox-service";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { InboxToolbar, type DateRange } from "./inbox-toolbar";
import { BulkActionBar } from "./bulk-action-bar";
import { AssignedRow } from "./assigned-row";
import { RaisedRow } from "./raised-row";
import { ApproveModal } from "./approve-modal";
import { RejectModal } from "./reject-modal";
import { AttachmentLightbox } from "./attachment-lightbox";
import { InboxEmpty } from "./inbox-empty";
import { TriCheckbox, type CheckState } from "./tri-checkbox";

type Tab = "assigned" | "raised";

/** Pending action target: a single item id, or the whole bulk selection. */
type ActionTarget =
  | { mode: "single"; id: string; employeeName?: string }
  | { mode: "bulk"; ids: string[] };

/** Notify the workspace shell so the sidebar badge stays in sync. */
function broadcastPending(count: number) {
  window.dispatchEvent(
    new CustomEvent("inbox:pending-changed", { detail: { count } }),
  );
}

export function InboxView() {
  const [tab, setTab] = useState<Tab>("assigned");

  // Sort + filter persist across tab switches within the session.
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  const [assigned, setAssigned] = useState<AssignedToMeResponse | null>(null);
  const [raised, setRaised] = useState<RaisedByMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [approveTarget, setApproveTarget] = useState<ActionTarget | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ActionTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<AttachmentItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const query: InboxQuery = useMemo(
    () => ({
      sortBy,
      sortDirection,
      dateFrom: dateRange?.from || undefined,
      dateTo: dateRange?.to || undefined,
    }),
    [sortBy, sortDirection, dateRange],
  );

  const refreshPending = useCallback(async () => {
    try {
      const res = await inboxService.getAssignedToMe({});
      setPendingCount(res.summary.total);
      broadcastPending(res.summary.total);
    } catch {
      // Non-fatal: badge simply keeps its last value.
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "assigned") {
        const res = await inboxService.getAssignedToMe(query);
        setAssigned(res);
        setPendingCount(res.summary.total);
        broadcastPending(res.summary.total);
      } else {
        const res = await inboxService.getRaisedByMe(query);
        setRaised(res);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Seed the pending count (and sidebar badge) on first mount so the header
  // pill is correct even if the user lands on the "Raised by Me" tab.
  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  function changeTab(next: Tab) {
    if (next === tab) return;
    setTab(next);
    setExpandedId(null);
    setSelected(new Set());
  }

  function handleSort(by: SortBy) {
    if (by === sortBy) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(by);
      setSortDirection(by === "date" ? "desc" : "asc");
    }
  }

  function applyDate(range: DateRange) {
    setDateRange(range);
    setToast({ message: "Date filter applied", type: "success" });
  }

  function clearDate() {
    if (!dateRange) return;
    setDateRange(null);
    setToast({ message: "Date filter cleared", type: "success" });
  }

  // ── Selection (Assigned to Me, pending only) ──
  const selectablePending = useMemo(
    () => (assigned?.items ?? []).filter((i) => isPending(i.currentStatus)),
    [assigned],
  );
  const selectableIds = useMemo(
    () => selectablePending.map((i) => i.inboxItemId),
    [selectablePending],
  );

  const selectAllState: CheckState = useMemo(() => {
    if (selected.size === 0) return "unchecked";
    if (selectableIds.every((id) => selected.has(id))) return "checked";
    return "partial";
  }, [selected, selectableIds]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const allSelected =
        selectableIds.length > 0 && selectableIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(selectableIds);
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  // ── Action triggers ──
  function requestApprove(item: InboxItemWithMetadata) {
    setApproveTarget({
      mode: "single",
      id: item.inboxItemId,
      employeeName: item.submittedBy.displayName,
    });
  }

  function requestReject(item: InboxItemWithMetadata) {
    setRejectTarget({
      mode: "single",
      id: item.inboxItemId,
      employeeName: item.submittedBy.displayName,
    });
  }

  function requestBulkApprove() {
    if (selected.size === 0) {
      setToast({ message: "Select requests first", type: "error" });
      return;
    }
    setApproveTarget({ mode: "bulk", ids: [...selected] });
  }

  function requestBulkReject() {
    if (selected.size === 0) {
      setToast({ message: "Select requests first", type: "error" });
      return;
    }
    setRejectTarget({ mode: "bulk", ids: [...selected] });
  }

  // ── Action handlers ──
  async function confirmApprove() {
    if (!approveTarget) return;
    setSubmitting(true);
    try {
      if (approveTarget.mode === "single") {
        await inboxService.approve(approveTarget.id);
        setToast({ message: "Approved successfully", type: "success" });
      } else {
        const res = await inboxService.bulkApprove(approveTarget.ids);
        setToast({
          message:
            res.failed.length > 0
              ? `${res.succeeded.length} approved, ${res.failed.length} failed`
              : `${res.succeeded.length} requests approved`,
          type: res.failed.length > 0 ? "error" : "success",
        });
      }
      setApproveTarget(null);
      setSelected(new Set());
      await load();
      await refreshPending();
    } catch {
      setToast({ message: "Could not approve. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReject(reason: string) {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      if (rejectTarget.mode === "single") {
        await inboxService.reject(rejectTarget.id, reason);
        setToast({ message: "Rejected", type: "success" });
      } else {
        const res = await inboxService.bulkReject(rejectTarget.ids, reason);
        setToast({
          message:
            res.failed.length > 0
              ? `${res.succeeded.length} rejected, ${res.failed.length} failed`
              : `${res.succeeded.length} requests rejected`,
          type: res.failed.length > 0 ? "error" : "success",
        });
      }
      setRejectTarget(null);
      setSelected(new Set());
      await load();
      await refreshPending();
    } catch {
      setToast({ message: "Could not reject. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const assignedCount = assigned?.summary.total ?? pendingCount;
  const raisedCount = raised?.summary.total ?? 0;
  const activeItems = tab === "assigned" ? assigned?.items ?? [] : raised?.items ?? [];
  const resultCount = activeItems.length;

  const approveModalCount =
    approveTarget?.mode === "bulk" ? approveTarget.ids.length : 1;
  const rejectModalCount =
    rejectTarget?.mode === "bulk" ? rejectTarget.ids.length : 1;

  return (
    <div className="inbox">
      {/* Header */}
      <div className="inbox-head">
        <h1 className="inbox-title">Inbox</h1>
        {pendingCount > 0 && (
          <span className="inbox-pending-pill">
            <span className="inbox-pending-dot" aria-hidden="true" />
            {pendingCount} Pending
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="inbox-tabs" role="tablist" aria-label="Inbox views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "assigned"}
          className={cn("inbox-tab", tab === "assigned" && "active")}
          onClick={() => changeTab("assigned")}
        >
          Assigned to Me
          <span className="inbox-tab-count">{assignedCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "raised"}
          className={cn("inbox-tab", tab === "raised" && "active")}
          onClick={() => changeTab("raised")}
        >
          Raised by Me
          <span className="inbox-tab-count">{raisedCount}</span>
        </button>
      </div>

      {/* Toolbar */}
      <InboxToolbar
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        dateRange={dateRange}
        onApplyDate={applyDate}
        onClearDate={clearDate}
        resultCount={resultCount}
      />

      {/* Bulk action bar — Assigned tab only, when something is selected */}
      {tab === "assigned" && selected.size > 0 && (
        <BulkActionBar
          selectAllState={selectAllState}
          onToggleSelectAll={toggleSelectAll}
          selectedCount={selected.size}
          totalSelectable={selectableIds.length}
          onApprove={requestBulkApprove}
          onReject={requestBulkReject}
        />
      )}

      {/* Table */}
      {loading ? (
        <div className="inbox-loading">
          <span className="if2-spinner" />
          Loading requests…
        </div>
      ) : resultCount === 0 ? (
        <InboxEmpty />
      ) : (
        <div className="inbox-table-wrap">
          <div className="inbox-table-scroll">
            {tab === "assigned" ? (
              <table className="inbox-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      {selectableIds.length > 0 && (
                        <TriCheckbox
                          state={selectAllState}
                          onToggle={toggleSelectAll}
                          label="Select all pending requests"
                        />
                      )}
                    </th>
                    <th>Employee</th>
                    <th>Emp Code</th>
                    <th>Designation</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Age</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(assigned?.items ?? []).map((item) => (
                    <AssignedRow
                      key={item.inboxItemId}
                      item={item}
                      selected={selected.has(item.inboxItemId)}
                      onToggleSelect={() => toggleSelect(item.inboxItemId)}
                      expanded={expandedId === item.inboxItemId}
                      onToggleExpand={() => toggleExpand(item.inboxItemId)}
                      onApprove={() => requestApprove(item)}
                      onReject={() => requestReject(item)}
                      onOpenAttachment={setLightbox}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="inbox-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {(raised?.items ?? []).map((item) => (
                    <RaisedRow
                      key={item.inboxItemId}
                      item={item}
                      expanded={expandedId === item.inboxItemId}
                      onToggleExpand={() => toggleExpand(item.inboxItemId)}
                      onOpenAttachment={setLightbox}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modals + overlays — mounted only while active so they reset per open */}
      {approveTarget && (
        <ApproveModal
          open
          count={approveModalCount}
          employeeName={
            approveTarget.mode === "single" ? approveTarget.employeeName : undefined
          }
          submitting={submitting}
          onConfirm={confirmApprove}
          onCancel={() => !submitting && setApproveTarget(null)}
        />
      )}
      {rejectTarget && (
        <RejectModal
          open
          count={rejectModalCount}
          employeeName={
            rejectTarget.mode === "single" ? rejectTarget.employeeName : undefined
          }
          submitting={submitting}
          onConfirm={confirmReject}
          onCancel={() => !submitting && setRejectTarget(null)}
        />
      )}
      <AttachmentLightbox attachment={lightbox} onClose={() => setLightbox(null)} />

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
