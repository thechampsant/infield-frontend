"use client";

import { DocumentsPage } from "@/components/documents/documents-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function DocumentsModulePage() {
  const { projectId, projectName, accountCode, projectCode, loading, error } =
    useProjectContext();

  if (loading) {
    return (
      <div className="documents-page">
        <div className="doc-section">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 40, background: '#f1f5f9', borderRadius: 8, marginBottom: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="documents-page">
        <div className="doc-info-banner" style={{ background: 'var(--red-light)', borderColor: 'var(--red-mid)', color: 'var(--red)' }}>
          {error ?? "Project not found"}
        </div>
      </div>
    );
  }

  return (
    <DocumentsPage
      projectId={projectId}
      projectName={projectName}
      accountCode={accountCode}
      projectCode={projectCode}
    />
  );
}
