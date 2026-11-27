import { describe, expect, it } from "vitest";
import { projectBreadcrumbs } from "./project-admin-topbar";

const BASE = "/project-admin/ACC/PRJ";

describe("projectBreadcrumbs", () => {
  it("renders Workspace › Reports › New Report on /reports/new", () => {
    expect(projectBreadcrumbs(`${BASE}/reports/new`, "Field Ops", BASE)).toEqual([
      { label: "Workspace", href: BASE },
      { label: "Reports", href: `${BASE}/reports` },
      { label: "New Report" },
    ]);
  });

  it("shows the resolved report name instead of the raw ObjectId on view routes", () => {
    const reportId = "67a1b2c3d4e5f60718293a4b";
    expect(
      projectBreadcrumbs(`${BASE}/reports/${reportId}`, "Field Ops", BASE, "Attendance Report"),
    ).toEqual([
      { label: "Workspace", href: BASE },
      { label: "Reports", href: `${BASE}/reports` },
      { label: "Attendance Report" },
    ]);
  });

  it("shows the resolved report name on edit routes and links back to the view route", () => {
    const reportId = "67a1b2c3d4e5f60718293a4b";
    expect(
      projectBreadcrumbs(`${BASE}/reports/${reportId}/edit`, "Field Ops", BASE, "Attendance Report"),
    ).toEqual([
      { label: "Workspace", href: BASE },
      { label: "Reports", href: `${BASE}/reports` },
      { label: "Attendance Report", href: `${BASE}/reports/${reportId}` },
      { label: "Edit" },
    ]);
  });

  it("falls back to Report instead of exposing raw ObjectId before metadata resolves", () => {
    const reportId = "67a1b2c3d4e5f60718293a4b";
    const crumbs = projectBreadcrumbs(`${BASE}/reports/${reportId}`, "Field Ops", BASE);
    expect(crumbs.map((c) => c.label)).toEqual(["Workspace", "Reports", "Report"]);
  });

  it("keeps projectName as root breadcrumb for non-report routes", () => {
    expect(projectBreadcrumbs(`${BASE}/uploaders/users`, "Field Ops", BASE)).toEqual([
      { label: "Field Ops", href: BASE },
      { label: "Uploaders", href: `${BASE}/uploaders` },
      { label: "Users" },
    ]);
  });
});
