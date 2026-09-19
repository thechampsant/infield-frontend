"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Paperclip } from "lucide-react";
import {
  ACTION_FILE_ACCEPT,
  ACTION_FILE_TYPE_ERROR,
  isAllowedActionFile,
} from "@/lib/inbox-action-file";

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
  onConfirm: (file: File) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [typeError, setTypeError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      ? `Approve ${count} requests? The same attachment is added to every selected request.`
      : `Approve ${employeeName ?? "this request"}?`;

  function handleConfirm() {
    if (!file) {
      setInvalid(true);
      inputRef.current?.click();
      return;
    }
    onConfirm(file);
  }

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
        <div className="ibx-modal-field">
          <label className="ibx-file-label">
            Attachment <span className="ibx-req">*</span>
          </label>
          <input
            ref={inputRef}
            type="file"
            accept={ACTION_FILE_ACCEPT}
            className={(invalid && !file) || typeError ? "invalid" : ""}
            disabled={submitting}
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              if (next && !isAllowedActionFile(next)) {
                setFile(null);
                setTypeError(true);
                setInvalid(false);
                e.target.value = "";
                return;
              }
              setFile(next);
              setTypeError(false);
              if (next) setInvalid(false);
            }}
            aria-invalid={(invalid && !file) || typeError}
            aria-label="Approval attachment"
          />
          <div className="ibx-file-hint">PDF, JPG, PNG, or WebP</div>
          {file ? (
            <div className="ibx-file-name">
              <Paperclip aria-hidden="true" />
              {file.name}
            </div>
          ) : null}
          {typeError ? (
            <div className="ibx-modal-error">{ACTION_FILE_TYPE_ERROR}</div>
          ) : invalid && !file ? (
            <div className="ibx-modal-error">An attachment is required.</div>
          ) : null}
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
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Approving…" : "Yes, Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
