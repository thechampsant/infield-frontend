"use client";

import { useEffect, useState } from "react";
import { formatApiError } from "@/lib/api";

export interface AddAdminUserFormValues {
  firstName: string;
  lastName: string;
  email: string;
}

export function AddAdminUserModal({
  isOpen,
  title,
  roleLabel,
  tempPassword,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  title: string;
  roleLabel: string;
  /** When set, show the one-time password instead of the form. */
  tempPassword: string | null;
  onClose: () => void;
  onCreate: (data: AddAdminUserFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<AddAdminUserFormValues>({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !tempPassword) {
      setForm({ firstName: "", lastName: "", email: "" });
      setErrors({});
      setSubmitting(false);
      setCopied(false);
    }
  }, [isOpen, tempPassword]);

  if (!isOpen) return null;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onCreate({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      });
    } catch (err) {
      setErrors({
        form: formatApiError(err, `Failed to create ${roleLabel}`),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">
            {tempPassword ? "Admin created" : title}
          </div>
          <button
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
            disabled={submitting}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {tempPassword ? (
            <>
              <div className="if2-banner success">
                {roleLabel} created. Copy this temporary password now — it will
                not be shown again.
              </div>
              <div className="form-group">
                <label className="form-label">Temporary password</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    className="form-input"
                    type="text"
                    readOnly
                    value={tempPassword}
                    style={{ fontFamily: "monospace" }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopy}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {errors.form && (
                <div className="if2-banner error">{errors.form}</div>
              )}

              <div className="form-group">
                <label className="form-label">
                  First name <span className="req">*</span>
                </label>
                <input
                  className={`form-input ${errors.firstName ? "error" : ""}`}
                  type="text"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
                {errors.firstName && (
                  <div className="form-error">{errors.firstName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Last name <span className="req">*</span>
                </label>
                <input
                  className={`form-input ${errors.lastName ? "error" : ""}`}
                  type="text"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
                {errors.lastName && (
                  <div className="form-error">{errors.lastName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Email <span className="req">*</span>
                </label>
                <input
                  className={`form-input ${errors.email ? "error" : ""}`}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && (
                  <div className="form-error">{errors.email}</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {tempPassword ? (
            <button className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Creating…" : `Add ${roleLabel}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
