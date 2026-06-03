"use client";

import { DesignationsPage } from "@/components/designations/designations-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function DesignationsMasterPage() {
  const { projectId, projectName } = useProjectContext();

  return (
    <DesignationsPage projectId={projectId} projectName={projectName} />
  );
}
