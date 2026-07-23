"use client";

import { useCallback, useEffect, useState } from "react";
import { formatApiError, getAdminApi } from "@/lib/api";
import type { Project } from "@/lib/api/types";
import { AttendanceConfigPage } from "@/components/attendance-config/attendance-config-page";
import { projectAdminBase } from "@/lib/nav/nav";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function AttendanceModulePage() {
  const { projectCode, accountCode } = useProjectContext();
  const base = projectAdminBase(accountCode, projectCode);

  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resolve = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await getAdminApi().getProjectByCode(projectCode);
      setProject(found);
    } catch (err) {
      setError(formatApiError(err, "Failed to load project"));
    } finally {
      setLoading(false);
    }
  }, [projectCode]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  if (loading) {
    return (
      <div className="att-config-page">
        <div className="edit-skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-section" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="att-config-page">
        <div className="pa-info-banner" style={{ color: "var(--red)", background: "var(--red-light)", borderColor: "var(--red-mid)" }}>
          {error ?? "Project not found"}
        </div>
      </div>
    );
  }

  return (
    <AttendanceConfigPage
      projectId={project.id}
      projectName={project.name}
      modulesHref={`${base}/modules`}
    />
  );
}
