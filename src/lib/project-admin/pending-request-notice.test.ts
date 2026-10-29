import { describe, expect, it } from "vitest";
import { splitNoticeLines } from "./pending-request-notice";

describe("splitNoticeLines", () => {
  it("splits the manager-change message into headline, list and outcome lines", () => {
    const lines = splitNoticeLines(
      "Saurav Sayana (E1) has 6 pending requests: Attendance Regularization (3), Attendance Approval (2) and Claims (1) with Saurav 2 (E2). These will stay with Saurav 2 (E2) for approval/rejection. Only new requests will go to Saurav Manager Two (E4).",
    );

    expect(lines.map((l) => l.text)).toEqual([
      "Saurav Sayana (E1) has 6 pending requests:",
      "Attendance Regularization (3), Attendance Approval (2) and Claims (1) with Saurav 2 (E2).",
      "These will stay with Saurav 2 (E2) for approval/rejection.",
      "Only new requests will go to Saurav Manager Two (E4).",
    ]);
    expect(lines[0].isHeadline).toBe(true);
    expect(lines[2].isOutcome).toBe(true);
    expect(lines[3].isOutcome).toBe(false);
  });

  it("keeps 'Manager: Name (code)' together in the blocked message", () => {
    const lines = splitNoticeLines(
      "This user cannot be deactivated because there are pending requests for Visits and Claims associated with Manager: Ravi Kumar (EMP102). Please close all pending requests before deactivating this user.",
    );

    expect(lines.map((l) => l.text)).toEqual([
      "This user cannot be deactivated because there are pending requests for Visits and Claims associated with Manager: Ravi Kumar (EMP102).",
      "Please close all pending requests before deactivating this user.",
    ]);
    expect(lines[0].isHeadline).toBe(true);
    expect(lines[1].isOutcome).toBe(true);
  });

  it("splits the manager deactivation message", () => {
    const lines = splitNoticeLines(
      "Ravi Kumar (EMP102) has 5 pending approvals: Leaves (3) and Claims (2) from 4 employees. On deactivation, 4 will be routed to Project Admins under Inbox with reason 'Manager Inactive'. 1 will stay with their other approvers.",
    );

    expect(lines.map((l) => l.text)).toEqual([
      "Ravi Kumar (EMP102) has 5 pending approvals:",
      "Leaves (3) and Claims (2) from 4 employees.",
      "On deactivation, 4 will be routed to Project Admins under Inbox with reason 'Manager Inactive'.",
      "1 will stay with their other approvers.",
    ]);
    expect(lines[2].isOutcome).toBe(true);
    expect(lines[3].isOutcome).toBe(true);
  });

  it("returns a single line for a one-sentence message", () => {
    expect(splitNoticeLines("Deactivate this record?")).toEqual([
      { text: "Deactivate this record?", isHeadline: false, isOutcome: false },
    ]);
  });
});
