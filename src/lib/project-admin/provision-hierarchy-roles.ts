/**
 * Seeds INF2-1535 hierarchy roles after Super Admin project creation.
 *
 * Requires a live API (`NEXT_PUBLIC_USE_MOCK_API` must not be `"true"`).
 * Does not run from Designations or Project Admin screens.
 */

import { roleService } from "@/lib/api/role-service";

export type ProvisionHierarchyRolesResult = {
  projectId: string;
  hierarchyCount: number;
};

export async function provisionHierarchyRolesForProject(
  projectId: string,
): Promise<ProvisionHierarchyRolesResult> {
  if (!projectId.trim()) {
    throw new Error("Cannot provision roles without a project id.");
  }
  await roleService.createHierarchyForProject(projectId);
  const summary = await roleService.getProjectRolesSummary(projectId);
  return {
    projectId,
    hierarchyCount: summary.hierarchyCount,
  };
}
