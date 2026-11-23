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
