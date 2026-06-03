"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatApiError, getAdminApi } from "@/lib/api";
import type { Account, Project } from "@/lib/api/types";
import { useSetBreadcrumbs } from "@/components/shell/master-shell";
import { projectAdminUploadersEntryPath } from "@/lib/project-admin/setup-paths";
import { provisionHierarchyRolesForProject } from "@/lib/project-admin/provision-hierarchy-roles";
import { avatarColor, initials } from "@/components/accounts/account-display";
import {
  AddProjectModal,
  type ProjectFormValues,
} from "@/components/accounts/add-project-modal";
import {
  EditAccountModal,
  type EditAccountValues,
} from "@/components/accounts/edit-account-modal";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;

  const [account, setAccount] = useState<Account | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useSetBreadcrumbs(
    account
      ? [
          { label: "Setup", href: "/super-admin/accounts" },
          { label: "Accounts", href: "/super-admin/accounts" },
          { label: account.name },
        ]
      : null,
  );

  const loadProjects = useCallback(async (code: string) => {
    const api = getAdminApi();
    const res = await api.listProjects(code, { pageSize: 100 });
    setProjects(res.items);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getAdminApi();
      const acc = await api.getAccount(accountId);
      setAccount(acc);
      await loadProjects(acc.code);
    } catch (err) {
      setError(formatApiError(err, "Failed to load account"));
    } finally {
      setLoading(false);
    }
  }, [accountId, loadProjects]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status === "Active").length;
    const inactive = projects.length - active;
    return { total: projects.length, active, inactive };
  }, [projects]);

  async function handleCreateProject(data: ProjectFormValues) {
    if (!account) return;
    const api = getAdminApi();
    const project = await api.createProject({
      accountId: account.id,
      projectName: data.projectName,
      email: data.email,
      phone: data.phone,
      status: "ACTIVE",
    });
    setAddProjectOpen(false);
    try {
      const { hierarchyCount } = await provisionHierarchyRolesForProject(
        project.id,
      );
      setToast({
        message:
          hierarchyCount > 0
            ? `Project created. getRolesByProject reports ${hierarchyCount} hierarchy role${hierarchyCount !== 1 ? "s" : ""}.`
            : "Project created, but getRolesByProject returned no hierarchy roles yet.",
        type: hierarchyCount > 0 ? "success" : "error",
      });
    } catch (roleErr) {
      setToast({
        message: `Project created, but default roles could not be provisioned. ${formatApiError(roleErr, "Unknown error")}`,
        type: "error",
      });
    }
    await loadProjects(account.code);
  }

  async function handleEditSave(data: EditAccountValues) {
    if (!account) return;
    const api = getAdminApi();
    const updated = await api.updateAccount(account.id, {
      accountName: data.accountName,
      email: data.email,
      status: data.status,
    });
    setAccount(updated);
    setEditOpen(false);
    setToast({ message: "Account updated successfully", type: "success" });
  }

  async function handleToggleStatus() {
    if (!account) return;
    const nextStatus = account.status === "Active" ? "INACTIVE" : "ACTIVE";
    const verb = nextStatus === "INACTIVE" ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${verb} ${account.name}?`)) {
      return;
    }
    setBusy(true);
    try {
      const api = getAdminApi();
      const updated = await api.updateAccount(account.id, { status: nextStatus });
      setAccount(updated);
      setToast({
        message: `Account ${verb}d successfully`,
        type: "success",
      });
    } catch (err) {
      setToast({
        message: formatApiError(err, `Failed to ${verb} account`),
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="stage">
        <div className="flex-center" style={{ padding: "var(--if2-sp-64)" }}>
          <span className="if2-spinner" />
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="stage">
        <div className="if2-banner error">{error ?? "Account not found"}</div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => router.push("/super-admin/accounts")}
        >
          Back to Accounts
        </button>
      </div>
    );
  }

  const active = account.status === "Active";

  return (
    <div className="stage">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Account Detail</div>
          <div className="pg-title">{account.name}</div>
        </div>
        <div className="pg-actions">
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Account
          </button>
          <button
            className={active ? "btn btn-danger" : "btn btn-primary"}
            onClick={handleToggleStatus}
            disabled={busy}
          >
            {active ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* Account info card */}
      <div className="acct-detail-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--if2-sp-20)",
            flex: 1,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <div
            className="acct-detail-avatar"
            style={{ background: avatarColor(account.name) }}
          >
            {initials(account.name)}
          </div>
          <div className="acct-detail-info">
            <div className="acct-detail-name">{account.name}</div>
            <div className="acct-detail-meta">
              <span className="acct-detail-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                <span className="code-chip">{account.code}</span>
              </span>
              <span className="acct-detail-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {account.primaryAdminEmail || "—"}
              </span>
              <span className="acct-detail-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Created{" "}
                {new Date(account.createdAtIso).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        <div>
          <span className={`status-pill ${active ? "status-active" : "status-inactive"}`}>
            <span className="status-dot" />
            {active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">Total Projects</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">
            {stats.active} active · {stats.inactive} inactive
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Workers</div>
          <div className="stat-value">—</div>
          <div className="stat-sub">Pending analytics API</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Managers</div>
          <div className="stat-value">—</div>
          <div className="stat-sub">Pending analytics API</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Attendance Today</div>
          <div className="stat-value">—</div>
          <div className="stat-sub">Pending analytics API</div>
        </div>
      </div>

      {/* Projects table */}
      <div className="data-table-wrap">
        <div className="data-table-toolbar">
          <div className="dt-toolbar-left">
            <div className="dt-count">{projects.length} projects</div>
          </div>
          <div className="dt-toolbar-right">
            <button className="btn btn-primary btn-sm" onClick={() => setAddProjectOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Project
            </button>
          </div>
        </div>

        <div className="proj-detail-grid head">
          <span>Project</span>
          <span>Code</span>
          <span>Status</span>
          <span className="text-center">Workers</span>
          <span className="text-right">Action</span>
        </div>

        {projects.length === 0 ? (
          <div
            style={{
              padding: "var(--if2-sp-24) var(--if2-sp-20)",
              fontSize: 12,
              color: "var(--if2-text-muted)",
            }}
          >
            No projects under this account yet.
          </div>
        ) : (
          projects.map((project) => {
            const pActive = project.status === "Active";
            return (
              <div className="proj-detail-grid" key={project.id || project.code}>
                <div className="proj-name-cell">
                  <span className={`proj-dot ${pActive ? "active" : "inactive"}`} />
                  {project.name}
                </div>
                <div>
                  <span className="code-chip">{project.code}</span>
                </div>
                <div>
                  <span className={`status-pill ${pActive ? "status-active" : "status-inactive"}`}>
                    <span className="status-dot" />
                    {pActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="proj-workers">—</div>
                <div className="text-right">
                  <button
                    className="proj-go-btn"
                    onClick={() =>
                      router.push(
                        projectAdminUploadersEntryPath(account.code, project.code),
                      )
                    }
                  >
                    Go to Project
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}

        <div className="dt-footer">
          <div className="dt-footer-info">
            Showing {projects.length} of {projects.length} projects
          </div>
        </div>
      </div>

      <AddProjectModal
        isOpen={addProjectOpen}
        accountName={account.name}
        onClose={() => setAddProjectOpen(false)}
        onCreate={handleCreateProject}
      />
      <EditAccountModal
        isOpen={editOpen}
        account={account}
        onClose={() => setEditOpen(false)}
        onSave={handleEditSave}
      />
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
