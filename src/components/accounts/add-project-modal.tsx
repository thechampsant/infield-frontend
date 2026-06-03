"use client";

import { useEffect, useState } from "react";
import { formatApiError } from "@/lib/api";
import { BulkUploadTab } from "./bulk-upload-tab";

export interface ProjectFormValues {
  projectName: string;
  phone: string;
  email: string;
}

export function AddProjectModal({
  isOpen,
  accountName,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  accountName: string;
  onClose: () => void;
  onCreate: (data: ProjectFormValues) => Promise<void>;
}) {
  const [tab, setTab] = useState<"individual" | "bulk">("individual");
  const [form, setForm] = useState<ProjectFormValues>({
    projectName: "",
    phone: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab("individual");
      setForm({ projectName: "", phone: "", email: "" });
      setErrors({});
      setFile(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.projectName.trim()) next.projectName = "Project name is required";
    if (!form.phone.trim()) next.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(form.phone.trim()))
      next.phone = "Enter a valid 10-digit phone number";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "Enter a valid email address";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (tab === "bulk") return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onCreate({
        projectName: form.projectName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
    } catch (err) {
      setErrors({
        form: formatApiError(err, "Failed to create project"),
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
          <div className="modal-title">Add Project — {accountName}</div>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-tabs" role="tablist">
            <button
              className={`modal-tab ${tab === "individual" ? "active" : ""}`}
              onClick={() => setTab("individual")}
            >
              Individual
            </button>
            <button
              className={`modal-tab ${tab === "bulk" ? "active" : ""}`}
              onClick={() => setTab("bulk")}
            >
              Bulk Upload
            </button>
          </div>

          {errors.form && <div className="if2-banner error">{errors.form}</div>}

          {tab === "individual" ? (
            <div>
              <div className="form-info-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Project code will be auto-generated on creation. Default Employee
                and Manager hierarchy roles are created automatically.
              </div>

              <div className="form-group">
                <label className="form-label">
                  Project Name <span className="req">*</span>
                </label>
                <input
                  className={`form-input ${errors.projectName ? "error" : ""}`}
                  type="text"
                  placeholder="e.g., Bosch CSR"
                  autoComplete="off"
                  value={form.projectName}
                  onChange={(e) =>
                    setForm({ ...form, projectName: e.target.value })
                  }
                />
                {errors.projectName && (
                  <div className="form-error">{errors.projectName}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Project Code</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Auto-generated"
                  disabled
                />
                <div className="form-hint">
                  Assigned automatically once the project is created.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Phone Number <span className="req">*</span>
                </label>
                <input
                  className={`form-input ${errors.phone ? "error" : ""}`}
                  type="tel"
                  placeholder="e.g., 9876543210"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })
                  }
                />
                {errors.phone && <div className="form-error">{errors.phone}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  Email ID <span className="req">*</span>
                </label>
                <input
                  className={`form-input ${errors.email ? "error" : ""}`}
                  type="email"
                  placeholder="e.g., pm@bosch.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
            </div>
          ) : (
            <BulkUploadTab
              templateHref="/templates/project-bulk-template.csv"
              file={file}
              onFileChange={setFile}
            />
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || tab === "bulk"}
          >
            {submitting ? "Creating…" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
