"use client";

import type { Project } from "@/lib/api/types";

export function ProjectSubPanel({
  accountName,
  projects,
  loading,
  error,
  onAddProject,
  onGoToProject,
}: {
  accountName: string;
  projects: Project[];
  loading: boolean;
  error?: string | null;
  onAddProject: () => void;
  onGoToProject: (project: Project) => void;
}) {
  return (
    <div className="proj-panel">
      <div className="proj-panel-header">
        <span className="proj-panel-title">Projects under {accountName}</span>
        <button className="btn-add-proj" onClick={onAddProject}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Project
        </button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: "var(--if2-sp-24)" }}>
          <span className="if2-spinner sm" />
        </div>
      ) : error ? (
        <div style={{ padding: "var(--if2-sp-16) 76px" }}>
          <div className="if2-banner error">{error}</div>
        </div>
      ) : projects.length === 0 ? (
        <div
          style={{
            padding: "var(--if2-sp-24) 76px",
            fontSize: 12,
            color: "var(--if2-text-muted)",
          }}
        >
          No projects under this account yet.
        </div>
      ) : (
        <table className="proj-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Code</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const active = project.status === "Active";
              return (
                <tr key={project.id || project.code}>
                  <td>
                    <div className="proj-name-cell">
                      <span className={`proj-dot ${active ? "active" : "inactive"}`} />
                      {project.name}
                    </div>
                  </td>
                  <td>
                    <span className="code-chip">{project.code}</span>
                  </td>
                  <td>
                    <span className={`status-pill ${active ? "status-active" : "status-inactive"}`}>
                      <span className="status-dot" />
                      {active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      className="proj-go-btn"
                      onClick={() => onGoToProject(project)}
                    >
                      Go to Project
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
