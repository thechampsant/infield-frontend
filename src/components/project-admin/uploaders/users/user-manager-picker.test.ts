import { describe, expect, it } from "vitest";
import { buildManagerPickerOptions } from "@/components/project-admin/uploaders/users/user-manager-picker";
import { managerChangeConfirmCopy } from "@/components/project-admin/uploaders/users/confirm-manager-change-modal";
import type { ProjectUser } from "@/types/project-admin";

function user(partial: Partial<ProjectUser> & { backendId: string; name: string }): ProjectUser {
  return {
    id: partial.id ?? partial.backendId,
    name: partial.name,
    mobile: "",
    email: "",
    designation: partial.designation ?? "",
    designationId: partial.designationId,
    role: "",
    doj: "",
    doe: "",
    status: "active",
    udfs: {},
    backendId: partial.backendId,
    reporteeIds: [],
  };
}

describe("buildManagerPickerOptions", () => {
  const designations = [
    { id: "exec", name: "Executive", roleLevel: 3 },
    { id: "mgr", name: "Manager", roleLevel: 5 },
    { id: "dir", name: "Director", roleLevel: 8 },
  ];
  const users = [
    user({ backendId: "self", name: "Self User", id: "SELF-1", designationId: "exec", designation: "Executive" }),
    user({ backendId: "rep", name: "Reportee User", id: "REP-1", designationId: "exec", designation: "Executive" }),
    user({ backendId: "peer", name: "Peer Manager", id: "MGR-1", designationId: "mgr", designation: "Manager" }),
    user({ backendId: "boss", name: "Director User", id: "DIR-1", designationId: "dir", designation: "Director" }),
  ];

  it("excludes self, selected reportees, and same-or-lower designation levels", () => {
    expect(
      buildManagerPickerOptions({
        users,
        designations,
        selfId: "self",
        reporteeIds: ["rep"],
        formDesignationId: "exec",
      }).map((option) => option.value),
    ).toEqual(["boss", "peer"]);
  });

  it("labels options as Name (CODE)", () => {
    expect(
      buildManagerPickerOptions({
        users: [users[3]],
        designations,
        reporteeIds: [],
        formDesignationId: "exec",
      }),
    ).toEqual([{ value: "boss", label: "Director User (DIR-1)" }]);
  });
});

describe("managerChangeConfirmCopy", () => {
  it("describes a reassign", () => {
    expect(
      managerChangeConfirmCopy({
        kind: "reassign",
        userName: "Aman Awasthi",
        userCode: "EMP-1",
        currentManager: { userId: "m1", employeeId: "MGR-012", name: "Priya Sharma" },
        nextManagerLabel: "Ravi Kumar (MGR-020)",
      }),
    ).toBe(
      "Aman Awasthi (EMP-1) currently reports to Priya Sharma (MGR-012). Map them to Ravi Kumar (MGR-020) instead?",
    );
  });

  it("describes an unassign", () => {
    expect(
      managerChangeConfirmCopy({
        kind: "unassign",
        userName: "Aman Awasthi",
        userCode: "EMP-1",
        currentManager: { userId: "m1", employeeId: "MGR-012", name: "Priya Sharma" },
      }),
    ).toBe("Remove Aman Awasthi (EMP-1) from Priya Sharma (MGR-012)? They will have no manager.");
  });
});
