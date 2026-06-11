"use client";

import { VisitConfigPage } from "@/components/visit-config/visit-config-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function VisitModulePage() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();

  if (loading) {
    return <div className="visit-config-page"><div className="edit-skeleton"><div className="skeleton-section" /><div className="skeleton-section" /></div></div>;
  }

  if (error || !projectId) {
    return <div className="visit-config-page"><div className="pa-info-banner">{error ?? "Project not found"}</div></div>;
  }

  return (
    <VisitConfigPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
    />
  );
}
