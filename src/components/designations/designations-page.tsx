"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatApiError } from "@/lib/api";
import { designationService, type Designation } from "@/lib/api/designation-service";
import { roleService, type BackendRole } from "@/lib/api/role-service";
import {
  accessForRole,
  accessLabel,
  HIERARCHY_ROLES_UNAVAILABLE_PAGE,
  permissionsForRole,
  type DesignationAccess,
} from "@/lib/designations/backend-roles";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  AddDesignationModal,
  type NewDesignationInput,
} from "./add-designation-modal";
import {
  EditDesignationModal,
  type EditDesignationValues,
} from "./edit-designation-modal";

interface Props {
  projectId: string;
  projectName: string;
}

export function DesignationsPage({ projectId, projectName }: Props) {
  const [roles, setRoles] = useState<BackendRole[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [deleting, setDeleting] = useState<Designation | null>(null);
  const [removing, setRemoving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleById = useMemo(
    () => new Map(roles.map((r) => [r.id, r] as const)),
    [roles],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleList, designationList] = await Promise.all([
        roleService.listByProject(projectId),
        designationService.listByProject(projectId),
      ]);
      setRoles(roleList);
      setDesignations(designationList);
    } catch (err) {
      setError(formatApiError(err, "Failed to load designations"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return designations;
    return designations.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (roleLabelFor(d, roleById) ?? "").toLowerCase().includes(q),
    );
  }, [designations, search, roleById]);

  const handleCreate = useCallback(
    async (items: NewDesignationInput[]) => {
      const payload = items.map((item) => {
        const role = roleById.get(item.roleId);
        const roleName = role?.roleName ?? "";
        const itemAccess = item.access as DesignationAccess | undefined;
        return {
          projectId,
          name: item.name,
          roleId: item.roleId,
          permissions: permissionsForRole(roleName),
          access: itemAccess || accessForRole(roleName),
        };
      });
      await designationService.create(payload);
      setAddOpen(false);
      setToast({
        message:
          items.length > 1
            ? `${items.length} designations created.`
            : "Designation created.",
        type: "success",
      });
      await load();
    },
    [projectId, roleById, load],
  );

  const handleEdit = useCallback(
    async (data: EditDesignationValues) => {
      if (!editing) return;
      const role = roleById.get(data.roleId);
      const roleName = role?.roleName ?? "";
      await designationService.update([
        {
          id: editing.id,
          name: data.name,
          roleId: data.roleId,
          permissions: permissionsForRole(roleName),
          access: (data.access as DesignationAccess) || accessForRole(roleName),
        },
      ]);
      setEditing(null);
      setToast({ message: "Designation updated.", type: "success" });
      await load();
    },
    [editing, roleById, load],
  );

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await designationService.remove([deleting.id]);
      setDeleting(null);
      setToast({ message: "Designation deleted.", type: "success" });
      await load();
    } catch (err) {
      setToast({
        message: formatApiError(err, "Failed to delete designation"),
        type: "error",
      });
    } finally {
      setRemoving(false);
    }
  }, [deleting, load]);

  const handleTemplate = useCallback(async () => {
    try {
      const blob = await designationService.downloadTemplate(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Designation_Bulk_Template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ message: formatApiError(err, "Template download failed"), type: "error" });
    }
  }, [projectId]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await designationService.exportDesignations(projectId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Designations_Export.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setToast({ message: formatApiError(err, "Export failed"), type: "error" });
    }
  }, [projectId]);

  const handleBulkUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const result = await designationService.bulkUpload(projectId, file);
      if (result.successCount > 0) {
        setToast({
          message: `Imported ${result.successCount} of ${result.total} designations.`,
          type: "success",
        });
        await load();
      }
      if (result.invalidCount > 0) {
        const errMsgs = result.errors.slice(0, 3).map(e => e.errors.join(", ")).join("; ");
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setToast({ message: "Please upload an Excel file (.xlsx or .xls)", type: "error" });
      return;
    }
    handleBulkUpload(file);
  }, [handleBulkUpload]);

  const countLabel = `${filtered.length} designation${filtered.length !== 1 ? "s" : ""}`;
  const footerLabel = loading
    ? "Loading…"
    : `Showing ${filtered.length} of ${designations.length} designations`;
  const noHierarchyRoles = !loading && !error && roles.length === 0;

  return (
    <div className="designations-page">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Master Data</div>
          <div className="pg-title">Designations Master</div>
          <div className="pg-sub">
            Map each designation in {projectName} to a backend role. The role
            drives access, data visibility, and approval routing.
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
            aria-label="Upload Excel file for bulk designation import"
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
            disabled={noHierarchyRoles}
            aria-disabled={noHierarchyRoles}
            title={
              noHierarchyRoles
                ? "Hierarchy roles must be provisioned for this project first"
                : undefined
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Designation
          </button>
        </div>
      </div>

      {noHierarchyRoles && (
        <div className="if2-banner error" style={{ marginBottom: 16 }}>
          {HIERARCHY_ROLES_UNAVAILABLE_PAGE}
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
                placeholder="Search designations…"
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="dt-count">{loading ? "— designations" : countLabel}</div>
          </div>
        </div>

        <div className="desig-col-head">
          <span>Designation</span>
          <span>Mapped Role</span>
          <span>Access</span>
          <span style={{ textAlign: "right" }}>Actions</span>
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
            <EmptyState
              searching={Boolean(search.trim())}
              noHierarchyRoles={noHierarchyRoles}
            />
          ) : (
            filtered.map((designation) => (
              <DesignationRow
                key={designation.id}
                designation={designation}
                roleById={roleById}
                onEdit={() => setEditing(designation)}
                onDelete={() => setDeleting(designation)}
              />
            ))
          )}
        </div>

        <div className="dt-footer">
          <div className="dt-footer-info">{footerLabel}</div>
        </div>
      </div>

      <AddDesignationModal
        isOpen={addOpen}
        roles={roles}
        onClose={() => setAddOpen(false)}
        onCreate={handleCreate}
      />

      <EditDesignationModal
        isOpen={Boolean(editing)}
        designation={editing}
        roles={roles}
        onClose={() => setEditing(null)}
        onSave={handleEdit}
      />

      {deleting && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !removing) setDeleting(null);
          }}
        >
          <div className="modal-card" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Delete Designation</div>
              <button
                className="modal-close"
                aria-label="Close"
                onClick={() => !removing && setDeleting(null)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="desig-confirm-text">
                Delete <strong>{deleting.name}</strong>? Users currently mapped
                to this designation will lose its role mapping.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleting(null)}
                disabled={removing}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={removing}
              >
                {removing ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function roleLabelFor(
  designation: Designation,
  roleById: Map<string, BackendRole>,
): string | undefined {
  const role = roleById.get(designation.roleId);
  const roleName = role?.roleName ?? designation.roleName;
  const level = role?.level ?? designation.roleLevel;
  if (!roleName) return undefined;
  return typeof level === "number" ? `${roleName} (Level ${level})` : roleName;
}

function DesignationRow({
  designation,
  roleById,
  onEdit,
  onDelete,
}: {
  designation: Designation;
  roleById: Map<string, BackendRole>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const role = roleById.get(designation.roleId);
  const roleName = role?.roleName ?? designation.roleName ?? "";
  const level = role?.level ?? designation.roleLevel;
  const access: DesignationAccess | undefined =
    designation.access ?? (roleName ? accessForRole(roleName) : undefined);

  return (
    <div className="desig-row">
      <div className="desig-name-cell">{designation.name}</div>
      <div>
        {roleName ? (
          <span className="desig-role-chip">
            {roleName}
            {typeof level === "number" && (
              <span className="desig-role-level">L{level}</span>
            )}
          </span>
        ) : (
          <span className="desig-role-missing">Unmapped</span>
        )}
      </div>
      <div>
        <span className="desig-access-chip">{accessLabel(access)}</span>
      </div>
      <div className="desig-action-cell">
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  searching,
  noHierarchyRoles,
}: {
  searching: boolean;
  noHierarchyRoles: boolean;
}) {
  if (noHierarchyRoles && !searching) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div className="empty-state-title">Roles required before designations</div>
        <div className="empty-state-sub">{HIERARCHY_ROLES_UNAVAILABLE_PAGE}</div>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="empty-state-title">
        {searching
          ? "No designations match your search"
          : "No designations yet"}
      </div>
      <div className="empty-state-sub">
        {searching
          ? "Try a different name or role."
          : "Add a designation and map it to a provisioned hierarchy role to get started."}
      </div>
    </div>
  );
}
