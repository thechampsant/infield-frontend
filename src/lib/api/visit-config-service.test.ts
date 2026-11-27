import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { normalizeVisitConfig, visitConfigService } from "./visit-config-service";

afterEach(() => vi.restoreAllMocks());

describe("Visit Day Claim retry limit integration", () => {
  const scope = { projectId: "project", designationId: "designation" };

  it("defaults missing legacy workflow settings to zero", () => {
    expect(normalizeVisitConfig({}, scope).approvalWorkflow.maximumResubmissionAttempts).toBe(0);
  });

  it.each([0, 3])("retains %s in normalized workflow responses", (maximumResubmissionAttempts) => {
    const config = normalizeVisitConfig({ approvalWorkflow: { maximumResubmissionAttempts } }, scope);
    expect(config.approvalWorkflow.maximumResubmissionAttempts).toBe(maximumResubmissionAttempts);
  });

  it.each([false, true])("round-trips the limit through draft=%s save", async (draft) => {
    const input = { ...scope, approvalWorkflow: { isEnabled: false, levels: [], maximumResubmissionAttempts: 2 } };
    const post = vi.spyOn(apiClient, "post").mockResolvedValue(input);
    const result = await visitConfigService.save(input, draft);
    expect(post).toHaveBeenCalledWith(draft ? "/api/v1/visit-config/draft" : "/api/v1/visit-config", input);
    expect(result.approvalWorkflow.maximumResubmissionAttempts).toBe(2);
  });
});

describe("OD store visit configuration", () => {
  const scope = { projectId: "project", designationId: "designation" };

  it("keeps the OD options absent on existing Visit configurations", () => {
    const config = normalizeVisitConfig({ visitType: "store", storeMappingMode: "pjp" }, scope);
    expect(config.storeMappingMode).toBe("pjp");
    expect(config).not.toHaveProperty("storeSource");
    expect(config).not.toHaveProperty("daySummaryMode");
    expect(config).not.toHaveProperty("checkoutReminder");
  });

  it("round-trips the Google source, OD approval mode, and reminder settings", async () => {
    const saved = {
      ...scope, visitType: "store" as const, storeSource: "google_places" as const,
      daySummaryMode: "od_visit" as const, checkoutReminder: { enabled: true, intervalMinutes: 15 },
    };
    const post = vi.spyOn(apiClient, "post").mockResolvedValue(saved);
    const config = await visitConfigService.save(saved, true);
    expect(post).toHaveBeenCalledWith("/api/v1/visit-config/draft", saved);
    expect(config).toMatchObject(saved);
  });

  it("saves and reads OD approval settings without writing the claim workflow", async () => {
    const input = {
      ...scope,
      daySummaryMode: "od_visit" as const,
      odApprovalWorkflow: {
        isEnabled: true,
        maximumResubmissionAttempts: 2,
        notifyApproverOnRoute: true,
        levels: [{ level: 1, approverType: "mapped_od_approver" as const, autoAction: "AutoReject" as const, autoActionDays: 10 }],
      },
    };
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({
      ...input, approvalWorkflow: { maximumResubmissionAttempts: 3 },
    });
    const saved = await visitConfigService.save(input, false);
    expect(post).toHaveBeenCalledWith("/api/v1/visit-config", input);
    expect(saved.odApprovalWorkflow).toMatchObject(input.odApprovalWorkflow);
    expect(saved.approvalWorkflow.maximumResubmissionAttempts).toBe(3);
  });
});
