"use client";

import { useEffect, useState } from "react";
import { formatApiError } from "@/lib/api";
import {
  ADMIN_ACCESS_AREAS,
  ADMIN_ACCESS_LABELS,
  DEFAULT_PROJECT_ADMIN_ACCESS,
  type AdminAccessArea,
} from "@/lib/auth/permissions";

export interface AddAdminUserFormValues {
  firstName: string;
  lastName: string;
  email: string;
  adminAccess?: AdminAccessArea[];
}

export function AddAdminUserModal({
  isOpen,
  title,
  roleLabel,
  tempPassword,
  showSetupAccess = false,
  accessOnly = false,
  initialAdminAccess,
  onClose,
  onCreate,
  onSaveAccess,
}: {
  isOpen: boolean;
  title: string;
  roleLabel: string;
  /** When set, show the one-time password instead of the form. */
  tempPassword: string | null;
  showSetupAccess?: boolean;
  accessOnly?: boolean;
  initialAdminAccess?: AdminAccessArea[];
  onClose: () => void;
  onCreate?: (data: AddAdminUserFormValues) => Promise<void>;
  onSaveAccess?: (adminAccess: AdminAccessArea[]) => Promise<void>;
}) {
  const [form, setForm] = useState<AddAdminUserFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    adminAccess: [...DEFAULT_PROJECT_ADMIN_ACCESS],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !tempPassword) {
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        adminAccess: initialAdminAccess?.length
          ? [...initialAdminAccess]
          : [...DEFAULT_PROJECT_ADMIN_ACCESS],
      });
      setErrors({});
      setSubmitting(false);
      setCopied(false);
    }
  }, [isOpen, tempPassword, initialAdminAccess]);

  if (!isOpen) return null;

  function toggleAccess(area: AdminAccessArea) {
    const current = form.adminAccess ?? [];
    const next = current.includes(area)
      ? current.filter((item) => item !== area)
      : [...current, area];
    setForm({ ...form, adminAccess: next });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!accessOnly) {
      if (!form.firstName.trim()) next.firstName = "First name is required";
      if (!form.lastName.trim()) next.lastName = "Last name is required";
      if (!form.email.trim()) next.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
        next.email = "Enter a valid email address";
    }
    if (showSetupAccess && !(form.adminAccess ?? []).length) {
      next.adminAccess = "Select at least one area";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (accessOnly) {
        await onSaveAccess?.(form.adminAccess ?? []);
      } else if (onCreate) {
        await onCreate({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          adminAccess: showSetupAccess ? form.adminAccess : undefined,
        });
      }
    } catch (err) {
      setErrors({
        form: formatApiError(
          err,
          accessOnly
            ? "Failed to update access"
            : `Failed to create ${roleLabel}`,
        ),
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

  const setupAccessFields = (showSetupAccess || accessOnly) && (
    <div className="form-group">
      <label className="form-label">Setup access</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ADMIN_ACCESS_AREAS.map((area) => (
          <label
            key={area}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--if2-navy)",
            }}
          >
            <input
              type="checkbox"
              checked={(form.adminAccess ?? []).includes(area)}
              onChange={() => toggleAccess(area)}
            />
            {ADMIN_ACCESS_LABELS[area]}
          </label>
        ))}
      </div>
      {errors.adminAccess && (
        <div className="form-error">{errors.adminAccess}</div>
      )}
    </div>
  );

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

              {!accessOnly && (
                <>
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
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                    {errors.email && (
                      <div className="form-error">{errors.email}</div>
                    )}
                  </div>
                </>
              )}

              {setupAccessFields}
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
                {submitting
                  ? accessOnly
                    ? "Saving…"
                    : "Creating…"
                  : accessOnly
                    ? "Save access"
                    : `Add ${roleLabel}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
