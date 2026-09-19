"use client";

import { DashboardsPage } from "@/components/project-admin/dashboards/dashboards-page";
import { useAuth } from "@/lib/auth/auth-context";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function DashboardsRoute() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();
  const { user } = useAuth();
  const canManage = (user?.role ?? "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .includes("superadmin");

  if (loading) {
    return (
      <div className="att-config-page">
        <div className="edit-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-section" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="att-config-page">
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
    <DashboardsPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
      canManage={canManage}
    />
  );
}
