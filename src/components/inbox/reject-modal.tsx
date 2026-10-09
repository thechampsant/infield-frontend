"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import {
  ACTION_FILE_ACCEPT,
  ACTION_FILE_HINT,
  ACTION_FILE_TYPE_ERROR,
  isAllowedActionFile,
} from "@/lib/inbox-action-file";
import { resolveRejectRules } from "@/lib/approval/rejection-reasons";
import { useRejectionReasonLookup } from "@/hooks/use-rejection-reason-lookup";
import { ActionFileHint } from "./action-file-hint";

export interface RejectConfirmation {
  remarks: string;
  rejectionReasonKey?: string;
  file: File;
  /** Items to reject; requests that need their own reason or are no longer pending are left out. */
  rejectIds: string[];
  skippedIds: string[];
}

export function RejectModal({
  open,
  inboxItemIds,
  employeeName,
  subtitle,
  submitting,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  inboxItemIds: string[];
  employeeName?: string;
  /** Single reject: "employee · request type · date". */
  subtitle?: string;
  submitting?: boolean;
  onConfirm: (confirmation: RejectConfirmation) => void;
  onCancel: () => void;
}) {
  const [remarks, setRemarks] = useState("");
  const [reasonKey, setReasonKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [invalidReason, setInvalidReason] = useState(false);
  const [invalidRemarks, setInvalidRemarks] = useState(false);
  const [invalidFile, setInvalidFile] = useState(false);
  const [typeError, setTypeError] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reasons = useRejectionReasonLookup(open ? inboxItemIds : null);
  const rules = resolveRejectRules(reasons.lookup, reasonKey, inboxItemIds);
  const ready = reasons.status === "ready";
  const count = ready ? rules.rejectIds.length : inboxItemIds.length;

  useEffect(() => {
    if (!open || !ready) return;
    const id = window.setTimeout(() => {
      if (rules.showDropdown) selectRef.current?.focus();
      else textareaRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(id);
  }, [open, ready, rules.showDropdown]);

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
    if (!ready || rules.blockedMessage) return;
    const trimmed = remarks.trim();
    let blocked = false;
    if (rules.showDropdown && rules.reasonRequired && !reasonKey) {
      setInvalidReason(true);
      selectRef.current?.focus();
      blocked = true;
    }
    if (rules.remarksRequired && !trimmed) {
      setInvalidRemarks(true);
      if (!blocked) textareaRef.current?.focus();
      blocked = true;
    }
    if (!file) {
      setInvalidFile(true);
      if (!blocked) fileRef.current?.click();
      blocked = true;
    }
    if (blocked || !file) return;
    onConfirm({
      remarks: trimmed,
      rejectionReasonKey: rules.showDropdown && reasonKey ? reasonKey : undefined,
      file,
      rejectIds: rules.rejectIds,
      skippedIds: rules.skippedIds,
    });
  }

  const isBulk = inboxItemIds.length > 1;
  const description = isBulk
    ? `${rules.showDropdown ? "The same reason and attachment are added" : "The same attachment is added"} to every selected request. ${ACTION_FILE_HINT}.`
    : subtitle || `Reason for rejecting ${employeeName ?? "this request"}:`;
  const remarksError = rules.selectedOption?.requiresRemarks
    ? "Remarks are required for this reason."
    : rules.showDropdown
      ? "Remarks are required for these requests."
      : "A rejection reason is required.";

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
            {count > 1 ? `Reject ${count} requests?` : "Reject request?"}
          </div>
          <div className="ibx-modal-desc">{description}</div>
        </div>

        {reasons.status === "loading" ? (
          <div className="ibx-modal-note">Loading rejection reasons…</div>
        ) : null}
        {reasons.status === "error" ? (
          <div className="ibx-modal-field">
            <div className="ibx-modal-error">{reasons.error}</div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reasons.retry}>
              Retry
            </button>
          </div>
        ) : null}
        {ready && rules.blockedMessage ? (
          <div className="ibx-modal-field">
            <div className="ibx-modal-error">{rules.blockedMessage}</div>
          </div>
        ) : null}
        {ready && !rules.blockedMessage && rules.blockedNote ? (
          <div className="ibx-modal-note ibx-modal-note--warn">{rules.blockedNote}</div>
        ) : null}

        {ready && !rules.blockedMessage && rules.showDropdown ? (
          <div className="ibx-modal-field">
            <label className="ibx-file-label" htmlFor="ibxRejectReason">
              Reason{" "}
              {rules.reasonRequired ? (
                <span className="ibx-req">*</span>
              ) : (
                <span className="ibx-optional">Optional</span>
              )}
            </label>
            <select
              id="ibxRejectReason"
              ref={selectRef}
              className={invalidReason && !reasonKey ? "invalid" : ""}
              value={reasonKey}
              disabled={submitting}
              aria-invalid={invalidReason && !reasonKey}
              onChange={(e) => {
                setReasonKey(e.target.value);
                setInvalidReason(false);
                setInvalidRemarks(false);
              }}
            >
              <option value="">Select a reason</option>
              {rules.options.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.requiresRemarks ? `${option.label} (Needs remarks)` : option.label}
                </option>
              ))}
            </select>
            {invalidReason && !reasonKey ? (
              <div className="ibx-modal-error">Select a rejection reason.</div>
            ) : null}
          </div>
        ) : null}

        <div className="ibx-modal-field">
          {ready && rules.showDropdown ? (
            <label className="ibx-file-label" htmlFor="ibxRejectRemarks">
              Remarks{" "}
              {rules.remarksRequired ? (
                <span className="ibx-req">*</span>
              ) : (
                <span className="ibx-optional">Optional</span>
              )}
            </label>
          ) : null}
          <textarea
            id="ibxRejectRemarks"
            ref={textareaRef}
            className={invalidRemarks && rules.remarksRequired && !remarks.trim() ? "invalid" : ""}
            placeholder={rules.showDropdown ? "Add a note for the employee…" : "Enter rejection reason..."}
            value={remarks}
            disabled={submitting}
            onChange={(e) => {
              setRemarks(e.target.value);
              if (invalidRemarks && e.target.value.trim()) setInvalidRemarks(false);
            }}
            aria-invalid={invalidRemarks && rules.remarksRequired && !remarks.trim()}
            aria-label={rules.showDropdown ? "Rejection remarks" : "Rejection reason"}
          />
          {invalidRemarks && rules.remarksRequired && !remarks.trim() ? (
            <div className="ibx-modal-error">{remarksError}</div>
          ) : null}
        </div>
        <div className="ibx-modal-field">
          <label className="ibx-file-label">
            Attachment <span className="ibx-req">*</span>
          </label>
          <ActionFileHint />
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
            disabled={
              submitting ||
              !ready ||
              Boolean(rules.blockedMessage) ||
              (rules.showDropdown && rules.reasonRequired && !reasonKey)
            }
          >
            {submitting ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
