"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Modal } from "@/components/project-admin/shared/modal";
import {
  projectDashboardsService,
  type ProjectDashboard,
} from "@/lib/api/project-dashboards-service";
import { projectAdminBase } from "@/lib/nav/nav";

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function DashboardsPage({
  projectId,
  projectName,
  accountCode,
  projectCode,
  canManage,
}: {
  projectId: string;
  projectName: string;
  accountCode: string;
  projectCode: string;
  canManage: boolean;
}) {
  const [rows, setRows] = useState<ProjectDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDashboard | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectDashboard | null>(null);

  const base = projectAdminBase(accountCode, projectCode);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await projectDashboardsService.list(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboards");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName("");
    setUrl("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(row: ProjectDashboard) {
    setEditing(row);
    setName(row.name);
    setUrl(row.url);
    setFormError(null);
    setFormOpen(true);
  }

  async function handleSave() {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName) {
      setFormError("Name is required");
      return;
    }
    if (!isHttpUrl(trimmedUrl)) {
      setFormError("Enter a valid http or https link");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await projectDashboardsService.update(editing.id, {
          name: trimmedName,
          url: trimmedUrl,
        });
      } else {
        await projectDashboardsService.create({
          projectId,
          name: trimmedName,
          url: trimmedUrl,
        });
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save dashboard");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await projectDashboardsService.remove(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete dashboard");
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="att-config-page">
      <div
        className="pa-page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div>
          <div className="pa-eyebrow">Setup</div>
          <div className="pa-page-title">Dashboards</div>
          <div className="pa-page-desc">
            Embedded dashboards for {projectName}. Open one to view it in this window.
          </div>
        </div>
        {canManage ? (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Add dashboard
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <div className="pa-loading">Loading dashboards…</div>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <div className="pa-info-banner">
          {canManage
            ? 'No dashboards yet. Click "+ Add dashboard" to add a name and link.'
            : "No dashboards have been assigned yet."}
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="att-config-list">
          {rows.map((row, index) => (
            <article key={row.id} className="att-config-card">
              <div className="att-config-card__number">{index + 1}</div>
              <Link
                href={`${base}/dashboards/${row.id}`}
                className="att-config-card__main"
                style={{ textDecoration: "none" }}
              >
                <strong>{row.name}</strong>
              </Link>
              {canManage ? (
                <div className="att-config-card__actions">
                  <button
                    type="button"
                    className="att-card-action"
                    aria-label={`Edit ${row.name}`}
                    onClick={() => openEdit(row)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="att-card-action danger"
                    aria-label={`Delete ${row.name}`}
                    onClick={() => setDeleteTarget(row)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit dashboard" : "Add dashboard"}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        {formError ? (
          <div
            className="pa-info-banner"
            style={{
              color: "var(--red)",
              background: "var(--red-light)",
              borderColor: "var(--red-mid)",
              marginBottom: 16,
            }}
          >
            {formError}
          </div>
        ) : null}
        <div className="form-group">
          <label className="form-label">
            Dashboard name <span className="req">*</span>
          </label>
          <input
            className="form-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sales overview"
          />
        </div>
        <div className="form-group">
          <label className="form-label">
            Link <span className="req">*</span>
          </label>
          <input
            className="form-input"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete dashboard?"
        width={440}
        zIndex={40}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleDelete} disabled={saving}>
              {saving ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          Remove {deleteTarget?.name}? Project Admins will no longer see this dashboard.
        </p>
      </Modal>
    </div>
  );
}
