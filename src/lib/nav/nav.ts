export type IconName =
  | "badgeCheck"
  | "building2"
  | "clipboardList"
  | "cog"
  | "folder"
  | "layoutDashboard"
  | "lineChart"
  | "listChecks"
  | "package"
  | "settings"
  | "shield"
  | "store"
  | "toggleLeft"
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
    title: "Main",
    items: [
      { label: "Dashboard", href: "/super-admin", icon: "layoutDashboard" },
      { label: "Accounts", href: "/super-admin/accounts", icon: "building2", badge: 24 },
      { label: "Projects", href: "/super-admin/projects", icon: "folder" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Users Master", href: "/super-admin/users-master", icon: "users" },
      { label: "Designations", href: "/super-admin/designations", icon: "badgeCheck" },
      { label: "Stores", href: "/super-admin/stores", icon: "store" },
      { label: "Products", href: "/super-admin/products", icon: "package" },
    ],
  },
  {
    title: "Modules",
    items: [
      { label: "Attendance", href: "/super-admin/attendance", icon: "userCheck" },
      { label: "Approvals", href: "/super-admin/approvals", icon: "shield" },
      { label: "Module Settings", href: "/super-admin/module-settings", icon: "toggleLeft" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports", href: "/super-admin/reports", icon: "lineChart" },
      { label: "Settings", href: "/super-admin/settings", icon: "settings" },
    ],
  },
];

export const accountAdminNav: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/account-admin", icon: "layoutDashboard" },
      { label: "Projects", href: "/account-admin/projects", icon: "folder" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Account Settings", href: "/account-admin/account-settings", icon: "settings" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Audit Logs", href: "/account-admin/audit-logs", icon: "clipboardList" },
    ],
  },
];

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
        { label: "Module Toggles", href: `${base}/configuration/module-toggles`, icon: "toggleLeft" },
        { label: "Attendance Rules", href: `${base}/configuration/attendance-rules`, icon: "userCheck" },
        { label: "Workflows", href: `${base}/configuration/workflows`, icon: "workflow" },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Audit Logs", href: `${base}/audit-logs`, icon: "clipboardList" },
      ],
    },
  ];
}
