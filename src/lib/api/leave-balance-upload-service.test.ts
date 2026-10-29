import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { leaveBalanceUploadService } from "./leave-balance-upload-service";

vi.mock("./api-client", () => ({
  apiClient: {
    getBlob: vi.fn(),
    postFormData: vi.fn(),
  },
}));

const getBlob = vi.mocked(apiClient.getBlob);
const postFormData = vi.mocked(apiClient.postFormData);

describe("leaveBalanceUploadService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("downloads the template with projectId in the query", async () => {
    getBlob.mockResolvedValue(new Blob(["xlsx"]));

    await leaveBalanceUploadService.downloadTemplate("proj 1");

    expect(getBlob).toHaveBeenCalledWith(
      "/api/v1/leave-balances/bulk/template?projectId=proj%201",
    );
  });

  it("uploads the file as multipart with projectId in the query", async () => {
    postFormData.mockResolvedValue({ total: 1, successCount: 1, invalidCount: 0 });
    const file = new File(["xlsx"], "Leave_Balance.xlsx");

    await leaveBalanceUploadService.bulkUpload("proj-1", file);

    expect(postFormData).toHaveBeenCalledTimes(1);
    const [url, formData] = postFormData.mock.calls[0];
    expect(url).toBe("/api/v1/leave-balances/bulk/excel?projectId=proj-1");
    expect((formData as FormData).get("file")).toBeInstanceOf(File);
    expect((formData as FormData).has("projectId")).toBe(false);
  });
});
