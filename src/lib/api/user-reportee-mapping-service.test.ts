import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { userReporteeMappingService } from "./user-reportee-mapping-service";
import { projectUsersService } from "./project-users-service";

vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("./project-users-service", () => ({
  projectUsersService: {
    listByProject: vi.fn(),
  },
}));

const get = vi.mocked(apiClient.get);
const patch = vi.mocked(apiClient.patch);
const listByProject = vi.mocked(projectUsersService.listByProject);

describe("userReporteeMappingService.listPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("includes status and mapped in the list query", async () => {
    get.mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 1,
        mappedCount: 2,
        unmappedCount: 3,
        activeCount: 4,
        inactiveCount: 1,
      },
    });

    const result = await userReporteeMappingService.listPage(
      "proj-1",
      2,
      20,
      "ada",
      "mapped",
      "inactive",
    );

    expect(get).toHaveBeenCalledTimes(1);
    const url = String(get.mock.calls[0][0]);
    expect(url).toContain("/api/v1/users/reportee-mapping?");
    expect(url).toContain("projectId=proj-1");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=20");
    expect(url).toContain("mapped=mapped");
    expect(url).toContain("status=inactive");
    expect(url).toContain("search=ada");
    expect(result.meta.mappedCount).toBe(2);
    expect(result.meta.unmappedCount).toBe(3);
    expect(result.meta.activeCount).toBe(4);
    expect(result.meta.inactiveCount).toBe(1);
  });

  it("defaults mapped and status to all", async () => {
    get.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 1 } });

    await userReporteeMappingService.listPage("proj-1");

    const url = String(get.mock.calls[0][0]);
    expect(url).toContain("mapped=all");
    expect(url).toContain("status=all");
    expect(url).not.toContain("search=");
  });

  it("clamps pageSize to 100", async () => {
    get.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 100, totalCount: 0, totalPages: 1 } });

    await userReporteeMappingService.listPage("proj-1", 1, 500);

    const url = String(get.mock.calls[0][0]);
    expect(url).toContain("pageSize=100");
  });
});

describe("userReporteeMappingService.assign helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads mapped reportee ids for one user", async () => {
    get.mockResolvedValue({ userId: "u1", reporteeIds: ["r1", "r2"] });

    await expect(userReporteeMappingService.getMappedReporteeIds("proj-1", "u1")).resolves.toEqual([
      "r1",
      "r2",
    ]);
    expect(get).toHaveBeenCalledWith(
      "/api/v1/users/reportee-mapping/u1?projectId=proj-1",
    );
  });

  it("searches users with status=all", async () => {
    listByProject.mockResolvedValue({
      data: [],
      meta: { page: 1, pageSize: 100, totalCount: 0, totalPages: 1 },
    });

    await userReporteeMappingService.listUsersPage("proj-1", 3, 100, "ada");

    expect(listByProject).toHaveBeenCalledWith("proj-1", 3, 100, "ada", "all");
  });

  it("patches reportee ids for one user", async () => {
    patch.mockResolvedValue(undefined);

    await userReporteeMappingService.updateMapping("proj-1", "u1", ["r1"]);

    expect(patch).toHaveBeenCalledWith(
      "/api/v1/users/reportee-mapping/u1?projectId=proj-1",
      { reporteeIds: ["r1"] },
    );
  });
});
