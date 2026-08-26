"use client";

import { CustomViewPage } from "@/components/custom-view/custom-view-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function CustomViewModulePage() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();

  if (loading) {
    return (
      <div className="custom-view-page">
        <div className="cv-section">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 40,
                background: "#f1f5f9",
                borderRadius: 8,
                marginBottom: 8,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="custom-view-page">
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
    <CustomViewPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
    />
  );
}
