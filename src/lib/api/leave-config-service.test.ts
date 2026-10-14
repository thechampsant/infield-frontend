import { describe, expect, it } from "vitest";
import { normalizeLeaveTakeOver, normalizeLeaveType, type LeaveApprovalLevel } from "./leave-config-service";

describe("leave approval level take-over", () => {
  const level = (
    autoAction: LeaveApprovalLevel["autoAction"],
    autoActionDays: number,
    takeOver = false,
  ): LeaveApprovalLevel => ({
    level: 1,
    approverRole: "d",
    autoAction,
    autoActionDays,
    ...(takeOver && { takeOverFromPreviousLevel: true }),
  });

  it("keeps the flag read from the API on a level after a level with no auto action", () => {
    const leaveType = normalizeLeaveType({
      approvalWorkflow: {
        isApprovalRequired: true,
        levels: [
          { level: 1, approverRole: "d1", autoAction: "None", autoActionDays: 3 },
          { level: 2, approverRole: "d2", autoAction: "AutoReject", autoActionDays: 2, takeOverFromPreviousLevel: true },
        ],
      },
    });

    expect(leaveType.approvalWorkflow.levels).toEqual([
      { level: 1, approverRole: "d1", autoAction: "None", autoActionDays: 3 },
      { level: 2, approverRole: "d2", autoAction: "AutoReject", autoActionDays: 2, takeOverFromPreviousLevel: true },
    ]);
  });

  it("drops the flag on the first level and after a level with an auto action, keeping days", () => {
    expect(normalizeLeaveTakeOver([
      level("None", 3, true),
      level("AutoApprove", 2),
      level("None", 4, true),
      level("AutoReject", 1, true),
    ])).toEqual([
      level("None", 3),
      level("AutoApprove", 2),
      level("None", 4),
      level("AutoReject", 1, true),
    ]);
  });
});
