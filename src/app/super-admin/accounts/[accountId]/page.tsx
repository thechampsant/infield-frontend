"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminUsersService, formatApiError, getAdminApi } from "@/lib/api";
import type { AdminUser } from "@/lib/api/admin-users-service";
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
import {
  AddAdminUserModal,
  type AddAdminUserFormValues,
} from "@/components/accounts/add-admin-user-modal";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  ADMIN_ACCESS_LABELS,
  DEFAULT_PROJECT_ADMIN_ACCESS,
  parseAdminAccess,
  type AdminAccessArea,
} from "@/lib/auth/permissions";

export default function AccountDetailPage() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;

  const [account, setAccount] = useState<Account | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [accountAdmins, setAccountAdmins] = useState<AdminUser[]>([]);
  const [projectAdminsById, setProjectAdminsById] = useState<
    Record<string, AdminUser[]>
  >({});
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [addAccountAdminOpen, setAddAccountAdminOpen] = useState(false);
  const [addProjectAdminFor, setAddProjectAdminFor] = useState<Project | null>(
    null,
  );
  const [editAccessAdmin, setEditAccessAdmin] = useState<{
    admin: AdminUser;
    projectId: string;
  } | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useSetBreadcrumbs(
    account
      ? [
          { label: "Setup", href: "/super-admin/accounts" },
          { label: "Accounts", href: "/super-admin/accounts" },
          { label: account.name },
        ]
      : null,
  );

  const loadAccountAdmins = useCallback(async (id: string) => {
    const admins = await adminUsersService.listByAccount(id);
    setAccountAdmins(admins);
  }, []);

  const loadProjectAdmins = useCallback(async (projectList: Project[]) => {
    const entries = await Promise.all(
      projectList.map(async (project) => {
        if (!project.id) return [null, [] as AdminUser[]] as const;
        try {
          const admins = await adminUsersService.listByProject(project.id);
          return [project.id, admins] as const;
        } catch {
          return [project.id, [] as AdminUser[]] as const;
        }
      }),
    );
    const next: Record<string, AdminUser[]> = {};
    for (const [id, admins] of entries) {
      if (id) next[id] = admins;
    }
    setProjectAdminsById(next);
  }, []);

  const loadProjects = useCallback(
    async (code: string) => {
      const api = getAdminApi();
      const res = await api.listProjects(code, { pageSize: 100 });
      setProjects(res.items);
      await loadProjectAdmins(res.items);
    },
    [loadProjectAdmins],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getAdminApi();
      const acc = await api.getAccount(accountId);
      setAccount(acc);
      await Promise.all([
        loadProjects(acc.code),
        loadAccountAdmins(acc.id),
      ]);
    } catch (err) {
      setError(formatApiError(err, "Failed to load account"));
    } finally {
      setLoading(false);
    }
  }, [accountId, loadProjects, loadAccountAdmins]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  async function handleCreateAccountAdmin(data: AddAdminUserFormValues) {
    if (!account) return;
    const result = await adminUsersService.create({
      role: "ACCOUNT_ADMIN",
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      accountId: account.id,
    });
    setTempPassword(result.tempPassword);
    await loadAccountAdmins(account.id);
    setToast({ message: "Account Admin created", type: "success" });
  }

  async function handleCreateProjectAdmin(data: AddAdminUserFormValues) {
    if (!account || !addProjectAdminFor?.id) return;
    const result = await adminUsersService.create({
      role: "PROJECT_ADMIN",
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      accountId: account.id,
      projectId: addProjectAdminFor.id,
      adminAccess: data.adminAccess,
    });
    setTempPassword(result.tempPassword);
    const admins = await adminUsersService.listByProject(addProjectAdminFor.id);
    setProjectAdminsById((prev) => ({
      ...prev,
      [addProjectAdminFor.id]: admins,
    }));
    setToast({ message: "Project Admin created", type: "success" });
  }

  async function handleDeactivateAdmin(
    admin: AdminUser,
    scope: "account" | "project",
    projectId?: string,
  ) {
    const name = `${admin.firstName} ${admin.lastName}`.trim() || admin.email;
    if (
      !window.confirm(
        `Deactivate ${name}? They will no longer be able to sign in.`,
      )
    ) {
      return;
    }
    try {
      await adminUsersService.deactivate(admin.id);
      if (scope === "account" && account) {
        await loadAccountAdmins(account.id);
      } else if (scope === "project" && projectId) {
        const admins = await adminUsersService.listByProject(projectId);
        setProjectAdminsById((prev) => ({ ...prev, [projectId]: admins }));
      }
      setToast({ message: "Admin deactivated", type: "success" });
    } catch (err) {
      setToast({
        message: formatApiError(err, "Failed to deactivate admin"),
        type: "error",
      });
    }
  }

  function closeAddAccountAdmin() {
    setAddAccountAdminOpen(false);
    setTempPassword(null);
  }

  function closeAddProjectAdmin() {
    setAddProjectAdminFor(null);
    setTempPassword(null);
  }

  async function handleSaveProjectAdminAccess(adminAccess: AdminAccessArea[]) {
    if (!editAccessAdmin) return;
    await adminUsersService.updateAccess(editAccessAdmin.admin.id, adminAccess);
    const admins = await adminUsersService.listByProject(editAccessAdmin.projectId);
    setProjectAdminsById((prev) => ({
      ...prev,
      [editAccessAdmin.projectId]: admins,
    }));
    setEditAccessAdmin(null);
    setToast({ message: "Project Admin access updated", type: "success" });
  }

  function accessSummary(admin: AdminUser): string {
    const areas =
      parseAdminAccess(admin.adminAccess) ?? DEFAULT_PROJECT_ADMIN_ACCESS;
    return areas.map((area) => ADMIN_ACCESS_LABELS[area]).join(", ");
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

      {/* Account Admins */}
      <div className="data-table-wrap" style={{ marginBottom: "var(--if2-sp-24)" }}>
        <div className="data-table-toolbar">
          <div className="dt-toolbar-left">
            <div className="dt-count">
              {accountAdmins.length} Account Admin
              {accountAdmins.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="dt-toolbar-right">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setTempPassword(null);
                setAddAccountAdminOpen(true);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Account Admin
            </button>
          </div>
        </div>

        {accountAdmins.length === 0 ? (
          <div
            style={{
              padding: "var(--if2-sp-24) var(--if2-sp-20)",
              fontSize: 12,
              color: "var(--if2-text-muted)",
            }}
          >
            No Account Admins for this account yet.
          </div>
        ) : (
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {accountAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    {`${admin.firstName} ${admin.lastName}`.trim() || "—"}
                  </td>
                  <td>{admin.email}</td>
                  <td>
                    <span className="status-pill status-active">
                      <span className="status-dot" />
                      Active
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeactivateAdmin(admin, "account")}
                    >
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
          <span>Admins</span>
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
            const admins = project.id
              ? projectAdminsById[project.id] ?? []
              : [];
            const expanded = expandedProjectId === project.id;
            return (
              <div key={project.id || project.code}>
                <div className="proj-detail-grid">
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
                  <div className="proj-admins-cell">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setExpandedProjectId(
                          expanded ? null : project.id || null,
                        )
                      }
                      disabled={!project.id}
                    >
                      {admins.length} admin{admins.length === 1 ? "" : "s"}
                      {expanded ? " ▴" : " ▾"}
                    </button>
                  </div>
                  <div className="text-right">
                    <button
                      className="proj-go-btn"
                      onClick={() =>
                        router.push(
                          projectAdminUploadersEntryPath(
                            account.code,
                            project.code,
                          ),
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

                {expanded && project.id ? (
                  <div className="proj-admins-panel">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--if2-navy)",
                        }}
                      >
                        Project Admins — {project.name}
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setTempPassword(null);
                          setAddProjectAdminFor(project);
                        }}
                      >
                        Add Project Admin
                      </button>
                    </div>
                    {admins.length === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--if2-text-muted)",
                        }}
                      >
                        No Project Admins for this project yet.
                      </div>
                    ) : (
                      <table className="admin-users-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Access</th>
                            <th>Status</th>
                            <th className="text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {admins.map((admin) => (
                            <tr key={admin.id}>
                              <td>
                                {`${admin.firstName} ${admin.lastName}`.trim() ||
                                  "—"}
                              </td>
                              <td>{admin.email}</td>
                              <td style={{ fontSize: 12, color: "var(--if2-text-muted)" }}>
                                {accessSummary(admin)}
                              </td>
                              <td>
                                <span className="status-pill status-active">
                                  <span className="status-dot" />
                                  Active
                                </span>
                              </td>
                              <td className="text-right">
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ marginRight: 8 }}
                                  onClick={() =>
                                    setEditAccessAdmin({
                                      admin,
                                      projectId: project.id,
                                    })
                                  }
                                >
                                  Access
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() =>
                                    handleDeactivateAdmin(
                                      admin,
                                      "project",
                                      project.id,
                                    )
                                  }
                                >
                                  Deactivate
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : null}
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
      <AddAdminUserModal
        isOpen={addAccountAdminOpen}
        title="Add Account Admin"
        roleLabel="Account Admin"
        tempPassword={tempPassword}
        onClose={closeAddAccountAdmin}
        onCreate={handleCreateAccountAdmin}
      />
      <AddAdminUserModal
        isOpen={!!addProjectAdminFor}
        title={`Add Project Admin${addProjectAdminFor ? ` — ${addProjectAdminFor.name}` : ""}`}
        roleLabel="Project Admin"
        tempPassword={tempPassword}
        showSetupAccess
        onClose={closeAddProjectAdmin}
        onCreate={handleCreateProjectAdmin}
      />
      <AddAdminUserModal
        isOpen={!!editAccessAdmin}
        title={`Edit access — ${editAccessAdmin ? `${editAccessAdmin.admin.firstName} ${editAccessAdmin.admin.lastName}`.trim() || editAccessAdmin.admin.email : ""}`}
        roleLabel="Project Admin"
        tempPassword={null}
        accessOnly
        showSetupAccess
        initialAdminAccess={
          parseAdminAccess(editAccessAdmin?.admin.adminAccess) ??
          DEFAULT_PROJECT_ADMIN_ACCESS
        }
        onClose={() => setEditAccessAdmin(null)}
        onSaveAccess={handleSaveProjectAdminAccess}
      />
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
