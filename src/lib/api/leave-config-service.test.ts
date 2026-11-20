import { afterEach, describe, expect, it, vi } from "vitest";
import { leaveConfigService, normalizeLeaveTakeOver, normalizeLeaveType, type LeaveApprovalLevel } from "./leave-config-service";
import { apiClient } from "./api-client";

describe("leave-type auto-approval compatibility", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does not invent enabled rules for legacy leave types", () => {
    expect(normalizeLeaveType({ shortCode: "CL" }).autoApprovalRules).toBeUndefined();
    expect(normalizeLeaveType({ shortCode: "ML", leaveTypeMode: "Maternity" }).autoApprovalRules).toBeUndefined();
    expect(normalizeLeaveType({ shortCode: "PTL", leaveTypeMode: "Paternity" }).autoApprovalRules).toBeUndefined();
  });

  it("retains disabled settings and dates on normalization", () => {
    const rules = { enabled: false, monthlyThresholdDays: 1, bypassDates: ["2026-11-01"] };
    expect(normalizeLeaveType({ autoApprovalRules: rules }).autoApprovalRules).toEqual(rules);
  });

  it("saves rules alongside existing approval levels and cancellation settings", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ config: { policies: [] } });
    const rules = { enabled: true, monthlyThresholdDays: 1, bypassDates: ["2026-11-01"] };
    const type = normalizeLeaveType({ autoApprovalRules: rules, cancellationWorkflow: { isApprovalRequired: true },
      approvalWorkflow: { isApprovalRequired: true, levels: [{ level: 1, approverRole: "manager", autoAction: "None", autoActionDays: 0 }] } });
    await leaveConfigService.save("project", [{ name: "Policy", applicableDesignations: [], visibility: { showLeaveBalance: true, showTransactionHistory: true, showHolidayCalendar: true }, holidays: [], leaveTypes: [type] }]);
    expect(put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ policies: [expect.objectContaining({ leaveTypes: [expect.objectContaining({ autoApprovalRules: rules, cancellationWorkflow: { isApprovalRequired: true } })] })] }));
  });

  it("targets the selected type for uploads and date removal, retaining upload feedback", async () => {
    const post = vi.spyOn(apiClient, "postFormData").mockResolvedValue({ config: { policies: [] }, uploadSummary: { totalRows: 2, added: 1, skipped: 1, invalid: 0, invalidRows: [] } });
    const remove = vi.spyOn(apiClient, "delete").mockResolvedValue({ config: { policies: [] } });
    const result = await leaveConfigService.uploadBypassDates("project", "policy", "CL", new File(["Date\n2026-11-01"], "dates.csv"));
    expect(post).toHaveBeenCalledWith("/api/v1/leave-config/project/policies/policy/leave-types/CL/bypass-dates/upload", expect.any(FormData));
    expect(result.uploadSummary).toMatchObject({ added: 1, skipped: 1 });
    await leaveConfigService.removeBypassDate("project", "policy", "PL", "2026-11-01");
    expect(remove).toHaveBeenCalledWith("/api/v1/leave-config/project/policies/policy/leave-types/PL/bypass-dates/2026-11-01");
  });

  it("propagates upload validation errors without returning a successful config", async () => {
    vi.spyOn(apiClient, "postFormData").mockRejectedValue(new Error("Row 3: invalid date"));
    await expect(leaveConfigService.uploadBypassDates("p", "policy", "CL", new File(["Date\ninvalid"], "dates.csv"))).rejects.toThrow("Row 3");
  });
});

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

describe("project-wide Leave retry limit API", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([0, 3])("sends %s alongside policies and reads it back", async (limit) => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ config: {
      projectId: "project", policies: [], maximumResubmissionAttempts: limit,
    }, warnings: [] });
    const result = await leaveConfigService.save("project", [], limit);
    expect(put).toHaveBeenCalledWith("/api/v1/leave-config/project", { policies: [], maximumResubmissionAttempts: limit });
    expect(result.config.maximumResubmissionAttempts).toBe(limit);
  });

  it("keeps older policies-only callers from resetting a saved limit", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ config: {
      projectId: "project", policies: [], maximumResubmissionAttempts: 4,
    } });
    const result = await leaveConfigService.save("project", []);
    expect(put).toHaveBeenCalledWith("/api/v1/leave-config/project", { policies: [] });
    expect(result.config.maximumResubmissionAttempts).toBe(4);
  });

  it("defaults missing legacy response fields to zero", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ config: { projectId: "project", policies: [] } });
    expect((await leaveConfigService.get("project")).config.maximumResubmissionAttempts).toBe(0);
  });

  it("blocks invalid numeric limits before issuing a request", async () => {
    const put = vi.spyOn(apiClient, "put");
    await expect(leaveConfigService.save("project", [], -1)).rejects.toThrow();
    await expect(leaveConfigService.save("project", [], 1.5)).rejects.toThrow();
    expect(put).not.toHaveBeenCalled();
  });
});

describe("policy-specific Leave retry limits", () => {
  afterEach(() => vi.restoreAllMocks());
  const policy = (name: string, maximumResubmissionAttempts?: number) => ({
    name, maximumResubmissionAttempts, applicableDesignations: [], visibility: {
      showLeaveBalance: true, showTransactionHistory: true, showHolidayCalendar: true,
    }, holidays: [], leaveTypes: [],
  });

  it("serializes separate numeric limits and strips raw editor input", async () => {
    const put = vi.spyOn(apiClient, "put").mockImplementation(async (_path, body) => ({
      config: { projectId: "project", ...body as object }, warnings: [],
    }));
    const result = await leaveConfigService.save("project", [
      { ...policy("Field", 2), resubmissionAttemptsInput: "0" }, policy("Office", 4),
    ]);
    const payload = put.mock.calls[0][1] as { policies: Array<Record<string, unknown>> };
    expect(payload.policies.map(item => item.maximumResubmissionAttempts)).toEqual([0, 4]);
    expect(payload.policies.every(item => !("resubmissionAttemptsInput" in item))).toBe(true);
    expect(payload).not.toHaveProperty("maximumResubmissionAttempts");
    expect(result.config.policies.map(item => item.maximumResubmissionAttempts)).toEqual([0, 4]);
  });

  it("inherits a legacy root limit only for policies without an explicit value", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({ config: { projectId: "project",
      maximumResubmissionAttempts: 3, policies: [policy("Field"), policy("Office", 0)] } });
    const result = await leaveConfigService.get("project");
    expect(result.config.policies.map(item => item.maximumResubmissionAttempts)).toEqual([3, 0]);
  });

  it("omits unsupplied policy values for compatibility and blocks invalid editor input", async () => {
    const put = vi.spyOn(apiClient, "put").mockResolvedValue({ config: { projectId: "project", policies: [] } });
    await leaveConfigService.save("project", [policy("Legacy")]);
    expect((put.mock.calls[0][1] as { policies: object[] }).policies[0]).not.toHaveProperty("maximumResubmissionAttempts");
    put.mockClear();
    await expect(leaveConfigService.save("project", [{ ...policy("Field"), resubmissionAttemptsInput: "" }])).rejects.toThrow();
    await expect(leaveConfigService.save("project", [{ ...policy("Field"), resubmissionAttemptsInput: "1.5" }])).rejects.toThrow();
    expect(put).not.toHaveBeenCalled();
  });
});
