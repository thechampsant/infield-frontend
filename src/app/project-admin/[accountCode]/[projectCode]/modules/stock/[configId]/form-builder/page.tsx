"use client";

import { use } from "react";
import { StockFormBuilderPage } from "@/components/stock-config/stock-form-builder-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function StockFormBuilderRoute({
  params,
}: {
  params: Promise<{ accountCode: string; projectCode: string; configId: string }>;
}) {
  const { configId } = use(params);
  const { projectId, accountCode, projectCode, loading, error } = useProjectContext();

  if (loading) {
    return (
      <div className="sales-config-page">
        <div className="edit-skeleton">
          <div className="skeleton-section" />
          <div className="skeleton-section" />
        </div>
      </div>
    );
  }

  if (error || !projectId) {
    return (
      <div className="sales-config-page">
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
    <StockFormBuilderPage
      projectId={projectId}
      accountCode={accountCode}
      projectCode={projectCode}
      stockConfigId={configId}
    />
  );
}
