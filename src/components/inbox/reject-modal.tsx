"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function RejectModal({
  open,
  count,
  employeeName,
  submitting,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  count: number;
  employeeName?: string;
  submitting?: boolean;
  /** Resolves with the mandatory rejection reason. */
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parent mounts this modal fresh per open, so state starts clean; just focus.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => textareaRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onCancel]);

  if (!open) return null;

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setInvalid(true);
      textareaRef.current?.focus();
      return;
    }
    onConfirm(trimmed);
  }

  const description =
    count > 1
      ? `Reason for rejecting ${count} requests:`
      : `Reason for rejecting ${employeeName ?? "this request"}:`;

  return (
    <div
      className="ibx-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ibxRejectTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="ibx-modal">
        <div className="ibx-modal-icon-row">
          <div className="ibx-modal-icon reject">
            <X aria-hidden="true" />
          </div>
        </div>
        <div className="ibx-modal-body">
          <div className="ibx-modal-title" id="ibxRejectTitle">
            Reject Request?
          </div>
          <div className="ibx-modal-desc">{description}</div>
        </div>
        <div className="ibx-modal-field">
          <textarea
            ref={textareaRef}
            className={invalid ? "invalid" : ""}
            placeholder="Enter rejection reason..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (invalid && e.target.value.trim()) setInvalid(false);
            }}
            aria-invalid={invalid}
            aria-label="Rejection reason"
          />
          {invalid && (
            <div className="ibx-modal-error">A rejection reason is required.</div>
          )}
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
            className="ibx-btn ibx-btn-danger"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Rejecting…" : "Reject with Reason"}
          </button>
        </div>
      </div>
    </div>
  );
}
