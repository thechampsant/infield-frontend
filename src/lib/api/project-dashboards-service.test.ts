import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { projectDashboardsService } from "./project-dashboards-service";

vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);
const patch = vi.mocked(apiClient.patch);
const del = vi.mocked(apiClient.delete);

describe("projectDashboardsService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists dashboards for a project", async () => {
    get.mockResolvedValue([
      { _id: "d1", projectId: "p1", name: "Sales", url: "https://example.com" },
    ]);

    await expect(projectDashboardsService.list("p1")).resolves.toEqual([
      { id: "d1", projectId: "p1", name: "Sales", url: "https://example.com" },
    ]);
    expect(get).toHaveBeenCalledWith("/api/v1/project-dashboards?projectId=p1");
  });

  it("creates, updates, and deletes a dashboard", async () => {
    post.mockResolvedValue({
      _id: "d1",
      projectId: "p1",
      name: "Sales",
      url: "https://example.com",
    });
    patch.mockResolvedValue({
      _id: "d1",
      projectId: "p1",
      name: "Updated",
      url: "https://example.com",
    });
    del.mockResolvedValue(undefined);

    await projectDashboardsService.create({
      projectId: "p1",
      name: "Sales",
      url: "https://example.com",
    });
    await projectDashboardsService.update("d1", { name: "Updated" });
    await projectDashboardsService.remove("d1");

    expect(post).toHaveBeenCalledWith("/api/v1/project-dashboards", {
      projectId: "p1",
      name: "Sales",
      url: "https://example.com",
    });
    expect(patch).toHaveBeenCalledWith("/api/v1/project-dashboards/d1", { name: "Updated" });
    expect(del).toHaveBeenCalledWith("/api/v1/project-dashboards/d1");
  });
});
