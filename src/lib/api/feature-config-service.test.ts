import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const boundary = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("./api-client", () => ({ apiClient: boundary, ApiError: class extends Error {} }));

describe("Helpdesk project module persistence", () => {
  let service: typeof import("./feature-config-service").featureConfigService;
  let modules: Array<{ key: string; isActive: boolean }>;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.clearAllMocks();
    modules = [];
    boundary.get.mockImplementation(async () => ({ statusCode: 200, data: { projectId: "project-a", modules } }));
    boundary.put.mockImplementation(async (_path, body) => {
      modules = [{ key: "helpdesk", isActive: body.isActive }];
      return { statusCode: 200, data: { projectId: "project-a", modules } };
    });
    service = (await import("./feature-config-service")).featureConfigService;
  });
  afterEach(() => vi.unstubAllEnvs());

  async function loadHelpdesk() {
    return (await service.getByProject("project-a")).find((module) => module.definition.id === "helpdesk")!;
  }

  it("defaults to disabled and reloads persisted enable/disable values", async () => {
    expect((await loadHelpdesk()).enabled).toBe(false);
    await service.updateModuleStatus("project-a", "helpdesk", true);
    expect(boundary.put).toHaveBeenCalledWith("/api/v1/feature-config/project-a/module/helpdesk", { isActive: true });
    expect((await loadHelpdesk()).enabled).toBe(true);
    await service.updateModuleStatus("project-a", "helpdesk", false);
    const disabled = await loadHelpdesk();
    expect(disabled.enabled).toBe(false);
    expect(disabled.definition.toggleOnly).toBe(true);
    expect(disabled.definition.configPath).toBeUndefined();
  });

  it("propagates save failures and reloads the unchanged project setting", async () => {
    const failure = new Error("Activation rejected");
    boundary.put.mockRejectedValueOnce(failure);
    await expect(service.updateModuleStatus("project-a", "helpdesk", true)).rejects.toBe(failure);
    expect((await loadHelpdesk()).enabled).toBe(false);
  });
});
