"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

export function ApproveModal({
  open,
  count,
  employeeName,
  submitting,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  /** Number of requests being approved (1 for inline). */
  count: number;
  /** Employee name for single-request approvals. */
  employeeName?: string;
  submitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onCancel]);

  if (!open) return null;

  const description =
    count > 1
      ? `Approve ${count} requests?`
      : `Approve ${employeeName ?? "this request"}?`;

  return (
    <div
      className="ibx-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ibxApproveTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="ibx-modal">
        <div className="ibx-modal-icon-row">
          <div className="ibx-modal-icon approve">
            <Check aria-hidden="true" />
          </div>
        </div>
        <div className="ibx-modal-body">
          <div className="ibx-modal-title" id="ibxApproveTitle">
            Approve Request?
          </div>
          <div className="ibx-modal-desc">{description}</div>
        </div>
        <div className="ibx-modal-actions">
          <button
            type="button"
            className="ibx-btn ibx-btn-ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ibx-btn ibx-btn-primary"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Approving…" : "Yes, Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
