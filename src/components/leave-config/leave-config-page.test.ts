import { describe, expect, it } from "vitest";
import { isLeaveConfigDirty } from "./leave-config-page";
import type { LeavePolicy } from "@/lib/api/leave-config-service";

describe("policy-specific Leave retry limit dirty state", () => {
  const policies = [
    { name: "Field Policy", maximumResubmissionAttempts: 2 },
    { name: "Office Policy", maximumResubmissionAttempts: 4 },
  ] as LeavePolicy[];
  const saved = { projectId: "project", policies };

  it("enables saving only the edited policy and supports discard", () => {
    const edited = { ...saved, policies: policies.map((policy, index) => index === 0
      ? { ...policy, resubmissionAttemptsInput: "3" } : policy) };
    expect(isLeaveConfigDirty(edited, saved)).toBe(true);
    expect(edited.policies[1].maximumResubmissionAttempts).toBe(4);
    expect(isLeaveConfigDirty(saved, saved)).toBe(false);
  });

  it("keeps blank input and explicit zero as unsaved changes for validation/save", () => {
    for (const value of ["", "0"]) {
      expect(isLeaveConfigDirty({ ...saved, policies: [
        { ...policies[0], resubmissionAttemptsInput: value }, policies[1],
      ] }, saved)).toBe(true);
    }
  });
});
