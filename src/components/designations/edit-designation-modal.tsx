"use client";

import { useEffect, useMemo, useState } from "react";
import { formatApiError } from "@/lib/api";
import type { BackendRole } from "@/lib/api/role-service";
import { toRoleOptions } from "@/lib/api/role-service";
import type { Designation } from "@/lib/api/designation-service";
import { HIERARCHY_ROLES_UNAVAILABLE_MODAL } from "@/lib/designations/backend-roles";

export interface EditDesignationValues {
  name: string;
  roleId: string;
}

export function EditDesignationModal({
  isOpen,
  designation,
  roles,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  designation: Designation | null;
  roles: BackendRole[];
  onClose: () => void;
  onSave: (data: EditDesignationValues) => Promise<void>;
}) {
  const roleOptions = useMemo(() => toRoleOptions(roles), [roles]);

  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && designation) {
      setName(designation.name);
      setRoleId(designation.roleId);
      setErrors({});
      setSubmitting(false);
    }
  }, [isOpen, designation]);

  if (!isOpen || !designation) return null;

  const noRoles = roleOptions.length === 0;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Designation name is required";
    if (!roleId) next.role = "Role is mandatory";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (noRoles) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave({ name: name.trim(), roleId });
    } catch (err) {
      setErrors({ form: formatApiError(err, "Failed to update designation") });
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
          <div className="modal-title">Edit Designation</div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {noRoles && (
            <div className="if2-banner error">{HIERARCHY_ROLES_UNAVAILABLE_MODAL}</div>
          )}
          {errors.form && <div className="if2-banner error">{errors.form}</div>}

          <div className="form-group">
            <label className="form-label">
              Designation Name <span className="req">*</span>
            </label>
            <input
              className={`form-input ${errors.name ? "error" : ""}`}
              type="text"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Role <span className="req">*</span>
            </label>
            <select
              className={`form-input ${errors.role ? "error" : ""}`}
              value={roleId}
              disabled={noRoles}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Select a role…</option>
              {roleOptions.map((opt) => (
                <option key={opt.roleId} value={opt.roleId}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.role ? (
              <div className="form-error">{errors.role}</div>
            ) : (
              <div className="form-hint">
                Changing the role updates access for every user with this
                designation.
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={submitting || noRoles}
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
