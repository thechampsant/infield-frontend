"use client";

import { useEffect, useState } from "react";
import { History, Paperclip, X } from "lucide-react";
import { formatApiError } from "@/lib/api";
import {
  inboxService,
  type InboxActionHistoryItem,
} from "@/lib/api/inbox-service";
import { DEFAULT_LIST_PAGE_SIZE, LIST_PAGE_SIZE_OPTIONS } from "@/lib/api/pagination";
import { formatDateTime, inboxFileUrl } from "./inbox-format";

export function ActionHistoryButton({
  projectId,
  className = "btn btn-accent",
}: {
  projectId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!projectId) return null;

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <History size={14} />
        History
      </button>
      {open && (
        <div className="pa-history-overlay" onClick={() => setOpen(false)}>
          <aside
            className="pa-history-drawer"
            role="dialog"
            aria-label="Approval history"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pa-history-drawer-head">
              <strong>History</strong>
              <button
                type="button"
                className="pa-history-drawer-close"
                aria-label="Close history"
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="pa-history-drawer-body">
              <ActionHistoryList projectId={projectId} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function ActionHistoryList({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LIST_PAGE_SIZE);
  const [items, setItems] = useState<InboxActionHistoryItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchHistory() {
      try {
        const res = await inboxService.getActionHistory(projectId, page, pageSize);
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotalPages(res.pagination?.totalPages ?? 0);
        setTotalItems(res.pagination?.totalItems ?? 0);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setTotalPages(0);
        setTotalItems(0);
        if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 404) {
          setError(null);
        } else {
          setError(formatApiError(err, "Could not load history"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [projectId, page, pageSize]);

  return (
    <div style={{ padding: "0 20px" }}>
      {error && (
        <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}
      {loading ? (
        <div style={{ fontSize: 13, color: "#64748b", padding: "24px 0" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 13, color: "#64748b", padding: "24px 0" }}>
          No approve or reject actions yet.
        </div>
      ) : (
        <table className="pa-table" style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>Action</th>
              <th>Date</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={`${row.inboxItemId}-${row.actionDate}`}>
                <td>{row.employeeName || "—"}</td>
                <td>{row.requestType || row.module}</td>
                <td style={{ textTransform: "capitalize" }}>{row.action}</td>
                <td>{row.actionDate ? formatDateTime(row.actionDate) : "—"}</td>
                <td>
                  {row.attachment?.gcsPath ? (
                    <a
                      href={inboxFileUrl(row.attachment.gcsPath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <Paperclip size={12} />
                      {row.attachment.fileName}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 16,
          fontSize: 12,
        }}
      >
        <span>{totalItems} actions</span>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {LIST_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          {page} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
