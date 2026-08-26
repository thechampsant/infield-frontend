"use client";

import { WebModulesPage } from "@/components/web-modules/web-modules-page";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";

export default function WebModulesRoute() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();
  const { user } = useAuth();

  const isSuperAdmin = (user?.role ?? "")
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

  if (!isSuperAdmin) {
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
          Access restricted. Only Super Admins can manage Web Modules.
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
    <WebModulesPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
    />
  );
}
