"use client";

import type { Account, Project } from "@/lib/api/types";
import { avatarColor, initials } from "./account-display";
import { ProjectSubPanel } from "./project-sub-panel";

export function AccountRow({
  account,
  isOpen,
  onToggle,
  onOpenDetail,
  projects,
  projectsLoading,
  projectsError,
  onAddProject,
  onGoToProject,
}: {
  account: Account;
  isOpen: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  projects: Project[];
  projectsLoading: boolean;
  projectsError?: string | null;
  onAddProject: () => void;
  onGoToProject: (project: Project) => void;
}) {
  const active = account.status === "Active";
  const projectCount =
    projects.length > 0 ? projects.length : account.projectsActiveCount;

  return (
    <div className={`acct-row ${isOpen ? "open" : ""}`}>
      <div className="acct-row-main" onClick={onToggle}>
        <div className="acct-chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div className="acct-name-cell">
          <div
            className="acct-avatar"
            style={{ background: avatarColor(account.name) }}
          >
            {initials(account.name)}
          </div>
          <span
            className="acct-name-text"
            style={{ cursor: "pointer" }}
            title="View account detail"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
          >
            {account.name}
          </span>
        </div>

        <div>
          <span className="code-chip">{account.code}</span>
        </div>

        <div>
          <span className={`status-pill ${active ? "status-active" : "status-inactive"}`}>
            <span className="status-dot" />
            {active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="acct-projects-num">{projectCount}</div>

        <div className="acct-action-cell">
          <button
            className="btn-outline"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isOpen ? "Collapse" : "View"}
          </button>
        </div>
      </div>

      {isOpen && (
        <ProjectSubPanel
          accountName={account.name}
          projects={projects}
          loading={projectsLoading}
          error={projectsError}
          onAddProject={onAddProject}
          onGoToProject={onGoToProject}
        />
      )}
    </div>
  );
}
