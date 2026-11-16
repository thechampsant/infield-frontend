"use client";

import { NotificationEnginePage } from "@/components/notification-engine/notification-engine-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function ProjectNotificationsPage() {
  const { projectId, loading, error } = useProjectContext();
  if (loading)
    return (
      <div className="p-6" role="status">
        Loading project…
      </div>
    );
  if (error || !projectId)
    return (
      <div className="p-6" role="alert">
        {error ?? "Project not found"}
      </div>
    );
  return <NotificationEnginePage key={projectId} projectId={projectId} />;
}
