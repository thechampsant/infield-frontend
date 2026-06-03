"use client";

import { useEffect, useState } from "react";
import { formatApiError } from "@/lib/api";
import type { Account } from "@/lib/api/types";

export interface EditAccountValues {
  accountName: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
}

export function EditAccountModal({
  isOpen,
  account,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  account: Account | null;
  onClose: () => void;
  onSave: (data: EditAccountValues) => Promise<void>;
}) {
  const [form, setForm] = useState<EditAccountValues>({
    accountName: "",
    email: "",
    status: "ACTIVE",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && account) {
      setForm({
        accountName: account.name,
        email: account.primaryAdminEmail,
        status: account.status === "Active" ? "ACTIVE" : "INACTIVE",
      });
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.accountName.trim()) next.accountName = "Account name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave({
        accountName: form.accountName.trim(),
        email: form.email.trim(),
        status: form.status,
      });
    } catch (err) {
      setErrors({
        form: formatApiError(err, "Failed to update account"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">Edit Account</div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {errors.form && <div className="if2-banner error">{errors.form}</div>}

          <div className="form-group">
            <label className="form-label">
              Account Name <span className="req">*</span>
            </label>
            <input
              className={`form-input ${errors.accountName ? "error" : ""}`}
              type="text"
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
            />
            {errors.accountName && (
              <div className="form-error">{errors.accountName}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Account Code</label>
            <input className="form-input" type="text" value={account.code} disabled />
          </div>

          <div className="form-group">
            <label className="form-label">
              Email ID <span className="req">*</span>
            </label>
            <input
              className={`form-input ${errors.email ? "error" : ""}`}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as "ACTIVE" | "INACTIVE" })
              }
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
