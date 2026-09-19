"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import {
  ACTION_FILE_ACCEPT,
  ACTION_FILE_TYPE_ERROR,
  isAllowedActionFile,
} from "@/lib/inbox-action-file";

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
  onConfirm: (reason: string, file: File) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [invalidReason, setInvalidReason] = useState(false);
  const [invalidFile, setInvalidFile] = useState(false);
  const [typeError, setTypeError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    let blocked = false;
    if (!trimmed) {
      setInvalidReason(true);
      textareaRef.current?.focus();
      blocked = true;
    }
    if (!file) {
      setInvalidFile(true);
      if (trimmed) fileRef.current?.click();
      blocked = true;
    }
    if (blocked || !file) return;
    onConfirm(trimmed, file);
  }

  const description =
    count > 1
      ? `Reason for rejecting ${count} requests. The same attachment is added to every selected request.`
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
            className={invalidReason ? "invalid" : ""}
            placeholder="Enter rejection reason..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (invalidReason && e.target.value.trim()) setInvalidReason(false);
            }}
            aria-invalid={invalidReason}
            aria-label="Rejection reason"
          />
          {invalidReason && (
            <div className="ibx-modal-error">A rejection reason is required.</div>
          )}
        </div>
        <div className="ibx-modal-field">
          <label className="ibx-file-label">
            Attachment <span className="ibx-req">*</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept={ACTION_FILE_ACCEPT}
            className={(invalidFile && !file) || typeError ? "invalid" : ""}
            disabled={submitting}
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              if (next && !isAllowedActionFile(next)) {
                setFile(null);
                setTypeError(true);
                setInvalidFile(false);
                e.target.value = "";
                return;
              }
              setFile(next);
              setTypeError(false);
              if (next) setInvalidFile(false);
            }}
            aria-invalid={(invalidFile && !file) || typeError}
            aria-label="Rejection attachment"
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
          ) : invalidFile && !file ? (
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
