/**
 * Project module catalog for Setup → Module Configuration (INF2-1948).
 * Keys align with backend feature-config `modules[].key` where applicable.
 */

export type ModuleAccent = "blue" | "teal" | "purple" | "amber";

export interface ProjectModuleDefinition {
  id: string;
  name: string;
  description: string;
  accent: ModuleAccent;
  /** Default when feature-config has no entry for this key */
  defaultEnabled: boolean;
  comingSoon: boolean;
  /** Relative path under project-admin base, e.g. `modules/attendance` */
  configPath?: string;
}

export const PROJECT_MODULE_CATALOG: ProjectModuleDefinition[] = [
  {
    id: "attendance",
    name: "Attendance",
    description:
      "Track daily check-in/check-out with GPS, photos, and geo-fencing.",
    accent: "blue",
    defaultEnabled: true,
    comingSoon: false,
    configPath: "modules/attendance",
  },
  {
    id: "leave",
    name: "Leave",
    description:
      "Manage leave policies, balances, approval workflows, and holidays.",
    accent: "teal",
    defaultEnabled: false,
    comingSoon: false,
    configPath: "modules/leave",
  },
  {
    id: "claims",
    name: "Claims",
    description: "Manage expense claims and approval workflows.",
    accent: "teal",
    defaultEnabled: true,
    comingSoon: false,
    configPath: "modules/claims",
  },
  {
    id: "visits",
    name: "Visits",
    description: "Plan and track store visits with PJP.",
    accent: "purple",
    defaultEnabled: true,
    comingSoon: false,
    configPath: "modules/visit",
  },
  {
    id: "resources",
    name: "Resources",
    description: "Share documents and training materials.",
    accent: "blue",
    defaultEnabled: true,
    comingSoon: false,
    configPath: "modules/documents",
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Push notifications and announcements.",
    accent: "amber",
    defaultEnabled: true,
    comingSoon: false,
  },
  {
    id: "custom-view",
    name: "Custom View",
    description: "Custom dashboards per role.",
    accent: "purple",
    defaultEnabled: true,
    comingSoon: false,
  },
  {
    id: "form-builder",
    name: "Form Builder",
    description: "Create and manage custom forms for field data collection.",
    accent: "purple",
    defaultEnabled: true,
    comingSoon: false,
    configPath: "form-builder",
  },
  {
    id: "sales",
    name: "Sales",
    description: "Capture sales data and performance metrics.",
    accent: "teal",
    defaultEnabled: false,
    comingSoon: false,
    configPath: "modules/sales",
  },
  {
    id: "target-vs-achievement",
    name: "Target vs Achievement",
    description: "Set targets and track achievement against goals.",
    accent: "amber",
    defaultEnabled: false,
    comingSoon: true,
  },
];
