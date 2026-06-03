"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import type { BackendRole } from "@/lib/api/role-service";
import { toRoleOptions } from "@/lib/api/role-service";
import {
  parseDesignationCsv,
  type ParsedDesignationRow,
} from "@/lib/designations/parse-csv";
import { HIERARCHY_ROLES_UNAVAILABLE_MODAL } from "@/lib/designations/backend-roles";

export interface NewDesignationInput {
  name: string;
  roleId: string;
}

const TEMPLATE_HREF = "/templates/designation-bulk-template.csv";

export function AddDesignationModal({
  isOpen,
  roles,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  roles: BackendRole[];
  onClose: () => void;
  onCreate: (items: NewDesignationInput[]) => Promise<void>;
}) {
  const roleOptions = useMemo(() => toRoleOptions(roles), [roles]);

  const [tab, setTab] = useState<"individual" | "bulk">("individual");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedDesignationRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab("individual");
      setName("");
      setRoleId("");
      setErrors({});
      setSubmitting(false);
      setFile(null);
      setParsedRows([]);
      setParseErrors([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const noRoles = roleOptions.length === 0;

  async function handleFile(selected: File | null) {
    setFile(selected);
    setParsedRows([]);
    setParseErrors([]);
    setErrors({});
    if (!selected) return;
    try {
      const text = await selected.text();
      const result = parseDesignationCsv(text, roles);
      setParsedRows(result.rows);
      setParseErrors(result.errors);
    } catch {
      setParseErrors(["Could not read the file. Please upload a valid .csv."]);
    }
  }

  function validateIndividual(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Designation name is required";
    if (!roleId) next.role = "Role is mandatory";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (noRoles) return;
    setErrors({});
    let items: NewDesignationInput[];

    if (tab === "individual") {
      if (!validateIndividual()) return;
      items = [{ name: name.trim(), roleId }];
    } else {
      if (parsedRows.length === 0) {
        setErrors({ form: "Add a file with at least one valid designation." });
        return;
      }
      items = parsedRows.map((r) => ({ name: r.name, roleId: r.roleId }));
    }

    setSubmitting(true);
    try {
      await onCreate(items);
    } catch (err) {
      setErrors({ form: formatApiError(err, "Failed to create designation") });
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled =
    submitting ||
    noRoles ||
    (tab === "bulk" && parsedRows.length === 0);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">Add Designation</div>
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

          {noRoles && (
            <div className="if2-banner error">{HIERARCHY_ROLES_UNAVAILABLE_MODAL}</div>
          )}

          {errors.form && <div className="if2-banner error">{errors.form}</div>}

          {tab === "individual" ? (
            <div>
              <div className="form-group">
                <label className="form-label">
                  Designation Name <span className="req">*</span>
                </label>
                <input
                  className={`form-input ${errors.name ? "error" : ""}`}
                  type="text"
                  placeholder="e.g., Territory Sales Manager"
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
                    The mapped role drives access, data visibility, and approval
                    routing.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "var(--if2-sp-16)" }}>
                <a className="btn btn-secondary w-full" href={TEMPLATE_HREF} download>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Template
                </a>
              </div>

              <div className="form-info-banner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Fill the template with a Designation Name and a Role per row. Role
                is mandatory and must match an existing role.
              </div>

              <div
                className="upload-area"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleFile(dropped);
                }}
                style={
                  dragOver
                    ? { borderColor: "var(--if2-blue)", background: "var(--if2-blue-pale)" }
                    : undefined
                }
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="upload-area-title">Drop your CSV file here</div>
                <div className="upload-area-sub">
                  or <span className="upload-area-link">browse files</span>{" "}
                  &nbsp;·&nbsp; .csv only
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {file && (
                <div className="upload-file-card">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="upload-file-name">{file.name}</span>
                  <span
                    className="upload-file-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                  >
                    Remove
                  </span>
                </div>
              )}

              {file && (
                <div className="desig-bulk-summary">
                  {parsedRows.length > 0 && (
                    <div className="if2-banner info">
                      {parsedRows.length} valid designation
                      {parsedRows.length !== 1 ? "s" : ""} ready to create
                      {parseErrors.length > 0
                        ? ` · ${parseErrors.length} row${parseErrors.length !== 1 ? "s" : ""} skipped`
                        : ""}
                      .
                    </div>
                  )}
                  {parseErrors.length > 0 && (
                    <div className="if2-banner error">
                      <ul className="desig-error-list">
                        {parseErrors.map((msg, i) => (
                          <li key={i}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            {submitting
              ? "Saving…"
              : tab === "bulk"
                ? `Create ${parsedRows.length || ""} Designation${parsedRows.length !== 1 ? "s" : ""}`.trim()
                : "Create Designation"}
          </button>
        </div>
      </div>
    </div>
  );
}
