"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatApiError, getAdminApi } from "@/lib/api";
import type { Account, Project } from "@/lib/api/types";
import { exportToCsv } from "@/lib/utils/export-csv";
import { projectAdminUploadersEntryPath } from "@/lib/project-admin/setup-paths";
import { provisionHierarchyRolesForProject } from "@/lib/project-admin/provision-hierarchy-roles";
import { AccountRow } from "@/components/accounts/account-row";
import {
  AddAccountModal,
  type AccountFormValues,
} from "@/components/accounts/add-account-modal";
import {
  AddProjectModal,
  type ProjectFormValues,
} from "@/components/accounts/add-project-modal";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";

interface ProjectState {
  items: Project[];
  loading: boolean;
  error: string | null;
}

export default function AccountsPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [projectsByAccount, setProjectsByAccount] = useState<
    Record<string, ProjectState>
  >({});
  const [projectCountsByAccount, setProjectCountsByAccount] = useState<
    Record<string, number>
  >({});

  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [addProjectFor, setAddProjectFor] = useState<Account | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getAdminApi();
      const res = await api.listAccounts({ pageSize: 100 });
      setAccounts(res.items);
    } catch (err) {
      setError(formatApiError(err, "Failed to load accounts"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length === 0) {
      setProjectCountsByAccount({});
      return;
    }

    let cancelled = false;

    async function loadProjectCounts() {
      const api = getAdminApi();
      const counts = await Promise.all(
        accounts.map(async (account) => {
          try {
            const res = await api.listProjects(account.code, {
              page: 1,
              pageSize: 100,
            });
            return [account.id, res.items.length] as const;
          } catch {
            return [account.id, account.projectsActiveCount] as const;
          }
        }),
      );

      if (cancelled) return;
      setProjectCountsByAccount(Object.fromEntries(counts));
    }

    void loadProjectCounts();
    return () => {
      cancelled = true;
    };
  }, [accounts]);

  const loadProjects = useCallback(async (account: Account) => {
    setProjectsByAccount((prev) => ({
      ...prev,
      [account.id]: { items: [], loading: true, error: null },
    }));
    try {
      const api = getAdminApi();
      const res = await api.listProjects(account.code, { pageSize: 100 });
      setProjectsByAccount((prev) => ({
        ...prev,
        [account.id]: { items: res.items, loading: false, error: null },
      }));
    } catch (err) {
      setProjectsByAccount((prev) => ({
        ...prev,
        [account.id]: {
          items: [],
          loading: false,
          error: formatApiError(err, "Failed to load projects"),
        },
      }));
    }
  }, []);

  function toggleRow(account: Account) {
    if (expandedId === account.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(account.id);
    if (!projectsByAccount[account.id]) {
      loadProjects(account);
    }
  }

  async function handleCreateAccount(data: AccountFormValues) {
    const api = getAdminApi();
    await api.createAccount({
      accountName: data.accountName,
      email: data.email,
      phone: data.phone,
      status: "ACTIVE",
    });
    setAddAccountOpen(false);
    setToast({ message: "Account created successfully", type: "success" });
    await fetchAccounts();
  }

  async function handleCreateProject(data: ProjectFormValues) {
    if (!addProjectFor) return;
    const api = getAdminApi();
    const account = addProjectFor;
    const project = await api.createProject({
      accountId: account.id,
      projectName: data.projectName,
      email: data.email,
      phone: data.phone,
      status: "ACTIVE",
    });
    setAddProjectFor(null);
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
    await loadProjects(account);
    await fetchAccounts();
  }

  function goToProject(account: Account, project: Project) {
    router.push(projectAdminUploadersEntryPath(account.code, project.code));
  }

  async function handleExport() {
    setExporting(true);
    try {
      const api = getAdminApi();
      const rows = await api.exportAccountsWithProjects();
      exportToCsv({
        data: rows,
        columns: [
          { key: "accountName", header: "Account Name" },
          { key: "accountCode", header: "Account Code" },
          { key: "accountStatus", header: "Account Status" },
          { key: "projectName", header: "Project Name" },
          { key: "projectCode", header: "Project Code" },
          { key: "projectStatus", header: "Project Status" },
        ],
        filename: "accounts_projects_export",
      });
    } catch (err) {
      setToast({
        message: formatApiError(err, "Export failed"),
        type: "error",
      });
    } finally {
      setExporting(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        a.primaryAdminEmail.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  return (
    <div className="stage">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Setup</div>
          <div className="pg-title">Accounts</div>
        </div>
        <div className="pg-actions">
          <button
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={exporting || accounts.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? "Exporting…" : "Export"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setAddAccountOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Account
          </button>
        </div>
      </div>

      <div className="data-table-wrap">
        <div className="data-table-toolbar">
          <div className="dt-toolbar-left">
            <div className="search-bar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search accounts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="dt-count">{filtered.length} accounts</div>
          </div>
        </div>

        <div className="acct-col-head">
          <span />
          <span>Account</span>
          <span>Code</span>
          <span>Status</span>
          <span className="text-center">Projects</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="flex-center" style={{ padding: "var(--if2-sp-48)" }}>
            <span className="if2-spinner" />
          </div>
        ) : error ? (
          <div style={{ padding: "var(--if2-sp-24)" }}>
            <div className="if2-banner error">{error}</div>
            <button className="btn btn-secondary btn-sm" onClick={fetchAccounts}>
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
            <div className="empty-state-title">No accounts found</div>
            <div className="empty-state-sub">
              Try adjusting your search, or create a new account to get started.
            </div>
          </div>
        ) : (
          filtered.map((account) => {
            const projectState = projectsByAccount[account.id];
            return (
              <AccountRow
                key={account.id || account.code}
                account={account}
                projectCount={projectCountsByAccount[account.id]}
                isOpen={expandedId === account.id}
                onToggle={() => toggleRow(account)}
                onOpenDetail={() =>
                  router.push(`/super-admin/accounts/${account.id}`)
                }
                projects={projectState?.items ?? []}
                projectsLoading={projectState?.loading ?? false}
                projectsError={projectState?.error}
                onAddProject={() => setAddProjectFor(account)}
                onGoToProject={(project) => goToProject(account, project)}
              />
            );
          })
        )}

        <div className="dt-footer">
          <div className="dt-footer-info">
            Showing {filtered.length} of {accounts.length} accounts
          </div>
        </div>
      </div>

      <AddAccountModal
        isOpen={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onCreate={handleCreateAccount}
      />
      <AddProjectModal
        isOpen={addProjectFor !== null}
        accountName={addProjectFor?.name ?? ""}
        onClose={() => setAddProjectFor(null)}
        onCreate={handleCreateProject}
      />
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
