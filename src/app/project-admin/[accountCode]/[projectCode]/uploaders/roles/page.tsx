"use client";

import { RolesMasterPage } from "@/components/roles/roles-master-page";
import { useProjectContext } from "@/lib/project-admin/project-context";

export default function RolesPage() {
  const { projectId, projectName } = useProjectContext();
  return <RolesMasterPage projectId={projectId} projectName={projectName} />;
}
