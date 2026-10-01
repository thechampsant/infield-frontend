"use client";

import { MoodCheckerConfigPage } from "@/components/mood-checker-config/mood-checker-config-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function MoodCheckerModulePage() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();

  if (loading) {
    return (
      <div className="mood-config-page">
        <div className="edit-skeleton">
          <div className="skeleton-section" />
          <div className="skeleton-section" />
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="mood-config-page">
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
    <MoodCheckerConfigPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
    />
  );
}
