"use client";

import { LeaveConfigPage } from "@/components/leave-config/leave-config-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function LeaveModulePage() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();

  if (loading) {
    return (
      <div className="leave-config-page">
        <div className="edit-skeleton">
          {[1, 2, 3].map((item) => (
            <div className="skeleton-section" key={item} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="leave-config-page">
        <div
          className="pa-info-banner"
          style={{
            color: "var(--red)",
            background: "var(--red-light)",
            borderColor: "var(--red-mid)",
          }}
        >
          {error ?? "Project not found"}
        </div>
      </div>
    );
  }

  return (
    <LeaveConfigPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
    />
  );
}
