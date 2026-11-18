"use client";
import { OverviewPage } from "@/components/overview/overview-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function ProjectOverviewPage() {
  const { projectId, loading } = useProjectContext();
  return loading || !projectId ? (
    <p role="status">Loading project…</p>
  ) : (
    <OverviewPage projectId={projectId} />
  );
}
