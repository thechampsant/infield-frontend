import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { uploadAuditService } from "./upload-audit-service";

vi.mock("./api-client", () => ({
  apiClient: {
    getRaw: vi.fn(),
    getBlob: vi.fn(),
  },
}));

const getRaw = vi.mocked(apiClient.getRaw);
const getBlob = vi.mocked(apiClient.getBlob);

describe("uploadAuditService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists with kind and paging query params", async () => {
    getRaw.mockResolvedValue({
      data: [],
      meta: { page: 2, pageSize: 20, totalCount: 0, totalPages: 1 },
    });

    const result = await uploadAuditService.list("proj-1", ["users"], 2, 20);

    expect(getRaw).toHaveBeenCalledTimes(1);
    const url = String(getRaw.mock.calls[0][0]);
    expect(url).toContain("/api/v1/upload-audits?");
    expect(url).toContain("projectId=proj-1");
    expect(url).toContain("kind=users");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=20");
    expect(result.meta.page).toBe(2);
  });

  it("joins multiple kinds and clamps page size", async () => {
    getRaw.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 100, totalCount: 0, totalPages: 1 } });

    await uploadAuditService.list("proj-1", ["target-master", "focus-target"], 1, 500);

    const url = String(getRaw.mock.calls[0][0]);
    expect(url).toContain("kind=target-master%2Cfocus-target");
    expect(url).toContain("pageSize=100");
  });

  it("downloads file and error log as xlsx blobs", async () => {
    getBlob.mockResolvedValue(new Blob(["xlsx"]));

    await uploadAuditService.downloadFile("abc", "proj-1");
    await uploadAuditService.downloadErrorLog("abc", "proj-1");

    expect(getBlob).toHaveBeenNthCalledWith(
      1,
      "/api/v1/upload-audits/abc/file?projectId=proj-1",
    );
    expect(getBlob).toHaveBeenNthCalledWith(
      2,
      "/api/v1/upload-audits/abc/error-log?projectId=proj-1",
    );
  });
});
