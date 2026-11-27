import { describe, expect, it } from "vitest";
import { projectAdminDrawerNav, uploadersTabs } from "./nav";

describe("uploadersTabs", () => {
  it("hides the Leave Balance tab unless Leave is enabled", () => {
    const labels = uploadersTabs("ACC", "PRJ").map((tab) => tab.label);

    expect(labels).not.toContain("Leave Balance");
    expect(labels).toContain("Target Master");
  });

  it("adds the Leave Balance tab last when Leave is enabled", () => {
    const tabs = uploadersTabs("ACC", "PRJ", { leaveEnabled: true });

    expect(tabs[tabs.length - 1].label).toBe("Leave Balance");
    expect(tabs[tabs.length - 1].href).toMatch(/\/uploaders\/leave-balance$/);
  });
});

describe("projectAdminDrawerNav", () => {
  it("builds an expandable Reports item with All Reports, Favorites, and New Report children", () => {
    const items = projectAdminDrawerNav("ACC", "PRJ", { adminAccess: ["reports"] });
    const reports = items.find((item) => item.label === "Reports");

    expect(reports).toBeDefined();
    expect(reports?.children).toEqual([
      {
        key: "all-reports",
        label: "All Reports",
        href: "/project-admin/ACC/PRJ/reports",
        icon: "fileText",
      },
      {
        key: "favorites",
        label: "Favorites",
        href: "/project-admin/ACC/PRJ/reports?tab=favorites",
        icon: "star",
      },
      {
        key: "new-report",
        label: "New Report",
        href: "/project-admin/ACC/PRJ/reports/new",
        icon: "plus",
      },
    ]);
  });
});
