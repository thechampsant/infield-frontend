/**
 * Project Admin master-data setup routes (INF2-1535 + uploaders).
 *
 * Designation–role mapping lives only under Project Admin → Uploaders →
 * Designations. It is intentionally not part of Account Admin / Super Admin
 * project creation (INF2-1532); a project must exist before designations can
 * be created via the designation APIs. Hierarchy roles are provisioned when
 * Super Admin creates a project (`provisionHierarchyRolesForProject`), not from
 * the Designations screen.
 */

function uploadersBase(accountCode: string, projectCode: string): string {
  return `/project-admin/${accountCode}/${projectCode}/uploaders`;
}

/** First screen when opening a project for setup (roles before designations). */
export function projectAdminUploadersEntryPath(
  accountCode: string,
  projectCode: string,
): string {
  return `${uploadersBase(accountCode, projectCode)}/roles`;
}

export type UploadersSetupStep = {
  id: "roles" | "designations" | "users" | "stores" | "products" | "user-store-map";
  label: string;
  href: string;
  description: string;
};

/** Recommended master-data order shown in the Uploaders setup checklist. */
export function uploadersSetupSteps(
  accountCode: string,
  projectCode: string,
): UploadersSetupStep[] {
  const base = uploadersBase(accountCode, projectCode);
  return [
    {
      id: "roles",
      label: "Roles",
      href: `${base}/roles`,
      description: "Define hierarchy roles",
    },
    {
      id: "designations",
      label: "Designations",
      href: `${base}/designations`,
      description: "Map titles to hierarchy roles",
    },
    {
      id: "users",
      label: "Users",
      href: `${base}/users`,
      description: "Add field team users",
    },
    {
      id: "stores",
      label: "Stores",
      href: `${base}/stores`,
      description: "Upload store master",
    },
    {
      id: "products",
      label: "Products",
      href: `${base}/products`,
      description: "Upload product master",
    },
    {
      id: "user-store-map",
      label: "User-Store Map",
      href: `${base}/user-store-map`,
      description: "Link users to stores",
    },
  ];
}

export function uploadersStepIdFromPath(pathname: string): UploadersSetupStep["id"] | null {
  if (pathname.includes("/uploaders/roles")) return "roles";
  if (pathname.includes("/uploaders/designations")) return "designations";
  if (pathname.includes("/uploaders/users")) return "users";
  if (pathname.includes("/uploaders/stores")) return "stores";
  if (pathname.includes("/uploaders/products")) return "products";
  if (pathname.includes("/uploaders/user-store-map")) return "user-store-map";
  return null;
}
