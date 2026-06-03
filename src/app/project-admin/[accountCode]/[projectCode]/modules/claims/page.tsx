"use client";

import { ClaimsConfigPage } from "@/components/claims-config/claims-config-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function ClaimsModulePage() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();

  if (loading) {
    return (
      <div className="att-config-page claims-config-page">
        <div className="edit-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-section" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="att-config-page claims-config-page">
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
    <ClaimsConfigPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
    />
  );
}
