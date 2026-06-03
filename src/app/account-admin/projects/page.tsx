"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatApiError, getAdminApi } from "@/lib/api";
import type { Project } from "@/lib/api/types";
import { authService } from "@/lib/api/auth-service";
import { resolveAccountScope } from "@/lib/auth/account-scope";
import { projectAdminUploadersEntryPath } from "@/lib/project-admin/setup-paths";
import { exportToCsv } from "@/lib/utils/export-csv";
import { useSetBreadcrumbs } from "@/components/shell/master-shell";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";

export default function AccountAdminProjectsPage() {
  const router = useRouter();

  useSetBreadcrumbs([{ label: "Setup" }, { label: "Projects" }]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [accountCode, setAccountCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getAdminApi();
      const profile = await authService.getMe();
      const scope = resolveAccountScope(profile);

      const { accountId } = scope;
      let code = scope.accountCode ?? "";

      // Resolve the account code (needed for project navigation) when we only
      // have the backend id.
      if (!code && accountId) {
        try {
          const account = await api.getAccount(accountId);
          code = account.code;
        } catch {
          // fall through — listing can still proceed by id
        }
      }

      if (!accountId && !code) {
        throw new Error(
          "We couldn't determine which account you belong to. Please contact your Super Admin.",
        );
      }

      const res = accountId
        ? await api.listProjectsByAccountId(accountId, code, { pageSize: 50 })
        : await api.listProjects(code, { pageSize: 50 });

      // When listing by code, accountId is resolved internally; capture code
      // for navigation either way.
      setAccountCode(code || res.items[0]?.accountCode || "");
      setProjects(res.items);
    } catch (err) {
      setError(formatApiError(err, "Failed to load projects"));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const goToProject = useCallback(
    (project: Project) => {
      const code = project.accountCode || accountCode;
      if (!code) {
        setToast({
          message: "Missing account context for this project.",
          type: "error",
        });
        return;
      }
      router.push(projectAdminUploadersEntryPath(code, project.code));
    },
    [accountCode, router],
  );

  const handleExport = useCallback(() => {
    if (filtered.length === 0) {
      setToast({ message: "No projects to export.", type: "error" });
      return;
    }
    exportToCsv({
      data: filtered.map((p) => ({
        "Project Name": p.name,
        "Project Code": p.code,
        Status: p.status,
      })),
      columns: [
        { key: "Project Name", header: "Project Name" },
        { key: "Project Code", header: "Project Code" },
        { key: "Status", header: "Status" },
      ],
      filename: "projects",
    });
    setToast({ message: "Projects exported as CSV.", type: "success" });
  }, [filtered]);

  const countLabel = `${filtered.length} project${filtered.length !== 1 ? "s" : ""}`;
  const footerLabel = loading
    ? "Loading…"
    : `Showing ${filtered.length} of ${projects.length} projects`;

  return (
    <div className="stage">
      <div className="pg-header">
        <div>
          <div className="pg-eyebrow">Setup</div>
          <div className="pg-title">Projects</div>
        </div>
        <div className="pg-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={loading || filtered.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

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
                placeholder="Search projects…"
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="dt-count">{loading ? "— projects" : countLabel}</div>
          </div>
        </div>

        <div className="proj-col-head">
          <span>Project</span>
          <span>Code</span>
          <span>Status</span>
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
            <EmptyState searching={Boolean(search.trim())} />
          ) : (
            filtered.map((project) => (
              <ProjectRow
                key={project.id || project.code}
                project={project}
                onGo={() => goToProject(project)}
              />
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

function ProjectRow({
  project,
  onGo,
}: {
  project: Project;
  onGo: () => void;
}) {
  const active = project.status === "Active";
  const initials = project.name.slice(0, 2).toUpperCase();

  return (
    <div className="proj-row">
      <div className="proj-name-cell">
        <div className="proj-avatar">{initials}</div>
        <span className="proj-name-text">{project.name}</span>
      </div>
      <div>
        <span className="proj-code-cell">{project.code}</span>
      </div>
      <div>
        <span
          className={`status-pill ${active ? "status-active" : "status-inactive"}`}
        >
          <span className="status-dot" />
          {active ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="proj-action-cell">
        <button type="button" className="proj-go-btn" onClick={onGo}>
          Go to Project
          <svg viewBox="0 0 24 24" fill="none">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
      <div className="empty-state-title">
        {searching
          ? "No projects match your search"
          : "No projects found for this account"}
      </div>
      <div className="empty-state-sub">
        {searching
          ? "Try a different search term or clear the search to see all projects."
          : "Contact your Super Admin to have projects added to your account."}
      </div>
    </div>
  );
}
