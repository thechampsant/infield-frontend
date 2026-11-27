import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { odConfigService } from "./od-config-service";

afterEach(() => vi.restoreAllMocks());

describe("OD City Master", () => {
  it("downloads the Excel template for the active project", async () => {
    const workbook = new Blob(["template"]);
    const get = vi.spyOn(apiClient, "getBlob").mockResolvedValue(workbook);
    await expect(odConfigService.downloadCityTemplate("project-a")).resolves.toBe(workbook);
    expect(get).toHaveBeenCalledWith("/api/v1/od-config/project-a/cities/template");
  });

  it("posts the file as multipart to the project-scoped upload route", async () => {
    const report = { totalRows: 2, invalidRows: 0, added: 1, skipped: 1, errors: [], cityMasterCount: 12 };
    const post = vi.spyOn(apiClient, "postFormData").mockResolvedValue(report);
    const file = new File(["workbook"], "Cities.xlsx");
    await expect(odConfigService.uploadCities("project-a", file)).resolves.toEqual(report);
    const [path, form] = post.mock.calls[0];
    expect(path).toBe("/api/v1/od-config/project-a/cities/upload");
    expect(form.get("file")).toBe(file);
  });
});
