"use client";

import { TargetVsAchievementConfigPage } from "@/components/target-vs-achievement/target-vs-achievement-config-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function TargetVsAchievementModulePage() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-lg bg-[var(--orca-surface)] shadow-sm" />
        <div className="h-40 rounded-lg bg-[var(--orca-surface)] shadow-sm" />
      </div>
    );
  }

  if (error || !projectId) {
    return (
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
    );
  }

  return (
    <TargetVsAchievementConfigPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
    />
  );
}
