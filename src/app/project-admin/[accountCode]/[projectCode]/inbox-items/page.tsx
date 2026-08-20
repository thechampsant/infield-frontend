"use client";

import { InboxItemsPage } from "@/components/inbox-items/inbox-items-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function InboxItemsRoute() {
  const { projectId, projectName, loading, error } = useProjectContext();

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

  return <InboxItemsPage projectId={projectId} projectName={projectName} />;
}
