import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { documentsService } from "./documents-service";
vi.mock("./api-client", () => ({ apiClient: { get: vi.fn(), put: vi.fn() } }));
afterEach(() => vi.clearAllMocks());

describe("resource categories API", () => {
  it("loads categories for the selected project without table/date filters", async () => {
    await documentsService.getCategories("project/one");
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/documents-config/categories?projectId=project%2Fone");
  });
  it("sends original names for renames and a revision to prevent stale saves", async () => {
    const input = { projectId: "project-1", revision: 5, categories: [
      { originalName: "Training", name: "Cooking", isActive: true },
      { name: "Fans", isActive: true },
    ] };
    await documentsService.saveCategories(input);
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/documents-config/categories", input);
  });
});
