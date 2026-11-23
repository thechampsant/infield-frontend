import { describe, expect, it } from "vitest";
import { emptyRejectionReasons } from "@/lib/approval/rejection-reasons";
import { visitApprovalWorkflowForSave } from "./visit-config-page";

describe("Visit retry workflow payload", () => {
  const editor = {
    maximumResubmissionAttempts: "2",
    reimbursementEnabled: true,
    approvalWorkflowEnabled: true,
    notifyApproverOnRoute: false,
    approvalLevels: [{ level: 1, approverType: "direct_manager" as const, autoAction: "None" as const, autoActionDays: 0 }],
    rejectionReasons: emptyRejectionReasons(),
  };

  it.each([true, false])("preserves the limit with workflow enabled=%s", (enabled) => {
    const payload = visitApprovalWorkflowForSave({ ...editor, approvalWorkflowEnabled: enabled });
    expect(payload.maximumResubmissionAttempts).toBe(2);
    expect(payload.isEnabled).toBe(enabled);
    expect(payload.levels).toHaveLength(enabled ? 1 : 0);
  });

  it("retains the limit while reimbursement is disabled and honors explicit zero", () => {
    expect(visitApprovalWorkflowForSave({ ...editor, reimbursementEnabled: false }).maximumResubmissionAttempts).toBe(2);
    expect(visitApprovalWorkflowForSave({ ...editor, maximumResubmissionAttempts: "0" }).maximumResubmissionAttempts).toBe(0);
  });

  it("blocks a blank limit instead of saving a reset", () => {
    expect(() => visitApprovalWorkflowForSave({ ...editor, maximumResubmissionAttempts: "" })).toThrow();
  });
});
