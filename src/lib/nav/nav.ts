export type IconName =
  | "badgeCheck"
  | "bell"
  | "building2"
  | "clipboardList"
  | "cog"
  | "folder"
  | "inbox"
  | "layoutDashboard"
  | "lineChart"
  | "listChecks"
  | "package"
  | "settings"
  | "shield"
  | "store"
  | "toggleLeft"
  | "user"
  | "userCheck"
  | "users"
  | "workflow";

export type NavItem = {
  label: string;
  href: string;
  icon?: IconName;
  badge?: number | string;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

export const superAdminNav: NavSection[] = [
  {
    title: "Setup",
    items: [
      { label: "Accounts", href: "/super-admin/accounts", icon: "cog" },
    ],
  },
];

export const accountAdminNav: NavSection[] = [
  {
    title: "Menu",
    items: [
      { label: "Setup", href: "/account-admin/projects", icon: "settings" },
    ],
  },
];

/**
 * Manager-level nav: Overview, Inbox, and Reports are static core items.
 * Additional modules are appended from project config at runtime (not hardcoded here).
 */
export function managerNav(inboxBadge?: number | string): NavSection[] {
  return [
    {
      title: "Menu",
      items: [
        { label: "Overview", href: "/workspace", icon: "layoutDashboard" },
        {
          label: "Inbox",
          href: "/workspace/inbox",
          icon: "inbox",
          ...(inboxBadge !== undefined && inboxBadge !== 0 && inboxBadge !== "0"
            ? { badge: inboxBadge }
            : {}),
        },
        { label: "Reports", href: "/workspace/reports", icon: "lineChart" },
      ],
    },
  ];
}

/** @deprecated Use projectAdminDrawerNav for the design-spec Project Admin shell. */
export function projectAdminNav(accountCode: string, projectCode: string): NavSection[] {
  const base = `/project-admin/${accountCode}/${projectCode}`;
  return [
    {
      title: "Main",
      items: [{ label: "Dashboard", href: `${base}`, icon: "layoutDashboard" }],
    },
    {
      title: "Master Data",
      items: [
        { label: "Users", href: `${base}/master-data/users`, icon: "users" },
        { label: "Designations", href: `${base}/master-data/designations`, icon: "badgeCheck" },
        { label: "Stores", href: `${base}/master-data/stores`, icon: "store" },
        { label: "Products", href: `${base}/master-data/products`, icon: "package" },
        { label: "User-Store Map", href: `${base}/master-data/user-store-map`, icon: "listChecks" },
      ],
    },
    {
      title: "Configuration",
      items: [
        { label: "Modules", href: `${base}/modules`, icon: "toggleLeft" },
        { label: "Attendance Configuration", href: `${base}/modules/attendance`, icon: "userCheck" },
      ],
    },
  ];
}

export type ProjectAdminDrawerItem = {
  label: string;
  href: string;
  icon: "users" | "settings" | "fileText" | "pieChart";
};

export function projectAdminBase(accountCode: string, projectCode: string): string {
  return `/project-admin/${accountCode}/${projectCode}`;
}

/** Design-spec drawer nav: Uploaders, Modules, Form Builder, Reports. */
export function projectAdminDrawerNav(
  accountCode: string,
  projectCode: string,
): ProjectAdminDrawerItem[] {
  const base = projectAdminBase(accountCode, projectCode);
  return [
    { label: "Uploaders", href: `${base}/uploaders/designations`, icon: "users" },
    { label: "Modules", href: `${base}/modules`, icon: "settings" },
    { label: "Form Builder", href: `${base}/form-builder`, icon: "fileText" },
    { label: "Reports", href: `${base}/reports`, icon: "pieChart" },
  ];
}

export function uploadersTabs(accountCode: string, projectCode: string) {
  const base = `${projectAdminBase(accountCode, projectCode)}/uploaders`;
  return [
    { label: "Roles", href: `${base}/roles` },
    { label: "Designations", href: `${base}/designations` },
    { label: "Users", href: `${base}/users` },
    { label: "Stores", href: `${base}/stores` },
    { label: "Products", href: `${base}/products` },
    { label: "User-Store Map", href: `${base}/user-store-map` },
  ];
}
