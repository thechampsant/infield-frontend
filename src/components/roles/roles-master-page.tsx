"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import { roleService, type BackendRole, type BulkRoleResult } from "@/lib/api/role-service";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";

interface Props {
  projectId: string;
  projectName: string;
}

export function RolesMasterPage({ projectId, projectName }: Props) {
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [toast, setToast] = useState<ToastState | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add role form state
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const roleList = await roleService.listByProject(projectId);
      setRoles(roleList);
    } catch (err) {
      setError(formatApiError(err, "Failed to load roles"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.roleName.toLowerCase().includes(q) ||
        String(r.level).includes(q),
    );
  }, [roles, search]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    const level = Number(newLevel);
    if (!name) {
      setToast({ message: "Role name is required", type: "error" });
      return;
    }
    if (isNaN(level) || level < 0) {
      setToast({ message: "Level must be a valid non-negative number", type: "error" });
      return;
    }
    setCreating(true);
    try {
      await roleService.createRole(projectId, name, level);
      setToast({ message: `Role "${name}" created.`, type: "success" });
      setNewName("");
      setNewLevel("");
      setAddOpen(false);
      await load();
    } catch (err) {
      setToast({ message: formatApiError(err, "Failed to create role"), type: "error" });
    } finally {
      setCreating(false);
    }
  }, [projectId, newName, newLevel, load]);

  const handleTemplate = useCallback(async () => {
    try {
      const blob = await roleService.downloadTemplate(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Role_Bulk_Template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ message: formatApiError(err, "Template download failed"), type: "error" });
    }
  }, [projectId]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await roleService.exportRoles(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Roles_Export.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ message: formatApiError(err, "Export failed"), type: "error" });
    }
  }, [projectId]);

  const handleBulkUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const result: BulkRoleResult = await roleService.bulkUpload(projectId, file);
      if (result.successCount > 0) {
        setToast({
          message: `Imported ${result.successCount} of ${result.total} roles.`,
          type: "success",
        });
        await load();
      }
      if (result.invalidCount > 0) {
        const errMsgs = result.errors
          .slice(0, 3)
          .map((e) => e.errors.join(", "))
          .join("; ");
        setToast({
          message: `${result.invalidCount} rows failed: ${errMsgs}`,
          type: "error",
        });
      }
    } catch (err) {
      setToast({ message: formatApiError(err, "Bulk upload failed"), type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [projectId, load]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        setToast({ message: "Please upload an Excel file (.xlsx or .xls)", type: "error" });
        return;
      }
      handleBulkUpload(file);
    },
    [handleBulkUpload],
  );

  const countLabel = `${filtered.length} role${filtered.length !== 1 ? "s" : ""}`;
  const footerLabel = loading
    ? "Loading…"
    : `Showing ${filtered.length} of ${roles.length} roles`;

  return (
    <div className="designations-page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Master Data</div>
          <div className="pg-title">Roles Master</div>
          <div className="pg-sub">
            Manage hierarchy roles for {projectName}
          </div>
        </div>
        <div className="pg-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTemplate}
          >
            ↓ Template
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading..." : "↑ Bulk Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleFileChange}
            aria-label="Upload Excel file for bulk role import"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
          >
            ↓ Export
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setAddOpen(true)}
          >
            + Add Role
          </button>
        </div>
      </div>

      {/* Add Role Modal */}
      {addOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) {
              setAddOpen(false);
              setNewName("");
              setNewLevel("");
            }
          }}
        >
          <div className="modal-card" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Add Role</div>
              <button
                className="modal-close"
                aria-label="Close"
                onClick={() => {
                  if (!creating) {
                    setAddOpen(false);
                    setNewName("");
                    setNewLevel("");
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Role Name <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Manager 2"
                  autoComplete="off"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Level <span className="req">*</span>
                </label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 3"
                  min={0}
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                />
                <div className="form-hint">
                  Hierarchy level number (1 and so on.).
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setAddOpen(false);
                  setNewName("");
                  setNewLevel("");
                }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={creating}
                onClick={handleCreate}
              >
                {creating ? "Creating…" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="data-table-wrap">
        <div className="data-table-toolbar">
          <div className="dt-toolbar-left">
            <div className="search-bar">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search roles…"
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="dt-count">{loading ? "— roles" : countLabel}</div>
          </div>
        </div>

        <div className="desig-col-head" style={{ gridTemplateColumns: "1fr 100px" }}>
          <span>Role Name</span>
          <span style={{ textAlign: "center" }}>Level</span>
        </div>

        <div>
          {loading ? (
            <div
              className="flex-center"
              style={{ padding: "var(--if2-sp-64) var(--if2-sp-24)" }}
            >
              <span className="if2-spinner sm" />
            </div>
          ) : error ? (
            <div style={{ padding: "var(--if2-sp-24)" }}>
              <div className="if2-banner error">{error}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="empty-state-title">
                {search.trim() ? "No roles match your search" : "No roles yet"}
              </div>
              <div className="empty-state-sub">
                {search.trim()
                  ? "Try a different name or level."
                  : "Add a role or use bulk upload to get started."}
              </div>
            </div>
          ) : (
            filtered.map((role) => (
              <div
                key={role.id}
                className="desig-row"
                style={{ gridTemplateColumns: "1fr 100px" }}
              >
                <div className="desig-name-cell">{role.roleName}</div>
                <div style={{ textAlign: "center" }}>
                  <span className="desig-role-level">L{role.level}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="dt-footer">
          <div className="dt-footer-info">{footerLabel}</div>
        </div>
      </div>

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
