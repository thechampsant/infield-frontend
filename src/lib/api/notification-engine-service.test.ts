import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import {
  notificationEngineService as service,
  notificationStartIso,
  validateCampaign,
  validateNotificationImage,
  type Campaign,
  type CampaignInput,
} from "./notification-engine-service";
vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
  },
}));
const valid = (): CampaignInput => ({
  title: "Announcement",
  types: ["IN_APP"],
  designationIds: ["d1"],
  schedule: "NOW",
  durationDays: 0,
  frequencyPerDay: 1,
});
beforeEach(() => vi.clearAllMocks());
describe("notification validation", () => {
  it("accepts indefinite campaigns and all channel combinations", () => {
    expect(validateCampaign(valid())).toEqual({});
    expect(
      validateCampaign({
        ...valid(),
        types: ["IN_APP", "PUSH", "POP_UP"],
        durationDays: 7,
        frequencyPerDay: 10,
        actionLabel: "Continue",
      }),
    ).toEqual({});
  });
  it("rejects blank titles and missing selections", () => {
    expect(
      validateCampaign({
        ...valid(),
        title: "  ",
        types: [],
        designationIds: [],
      }),
    ).toMatchObject({
      title: expect.any(String),
      types: expect.any(String),
      designationIds: expect.any(String),
    });
  });
  it.each([-1, 1.5, NaN])("rejects invalid duration %s", (durationDays) => {
    expect(
      validateCampaign({ ...valid(), durationDays }).durationDays,
    ).toBeTruthy();
  });
  it.each([0, 11, 1.5, NaN])(
    "rejects invalid frequency %s",
    (frequencyPerDay) => {
      expect(
        validateCampaign({ ...valid(), frequencyPerDay }).frequencyPerDay,
      ).toBeTruthy();
    },
  );
  it("enforces the backend text limits", () => {
    expect(
      validateCampaign({
        ...valid(),
        title: "a".repeat(201),
        message: "m".repeat(4001),
        types: ["POP_UP"],
        actionLabel: "b".repeat(51),
      }),
    ).toMatchObject({
      title: expect.any(String),
      message: expect.any(String),
      actionLabel: expect.any(String),
    });
    expect(
      validateCampaign({
        ...valid(),
        title: "a".repeat(200),
        message: "m".repeat(4000),
        types: ["POP_UP"],
        actionLabel: "b".repeat(50),
      }),
    ).toEqual({});
  });
  it("requires a future start for scheduled campaigns", () => {
    const now = Date.parse("2026-11-13T06:00:00Z");
    for (const startsAt of [
      undefined,
      "invalid",
      "2026-11-13T06:00:00Z",
      "2026-11-12T06:00:00Z",
    ])
      expect(
        validateCampaign({ ...valid(), schedule: "LATER", startsAt }, now)
          .startsAt,
      ).toBeTruthy();
    expect(
      validateCampaign(
        { ...valid(), schedule: "LATER", startsAt: "2026-11-13T06:01:00Z" },
        now,
      ),
    ).toEqual({});
  });
  it("converts the project IST time independently of the computer timezone", () => {
    expect(notificationStartIso("2026-11-13T12:00")).toBe(
      "2026-11-13T06:30:00.000Z",
    );
    expect(notificationStartIso("")).toBeUndefined();
    expect(notificationStartIso("invalid")).toBeUndefined();
  });
  it("restricts image type and size, including the exact boundary", () => {
    expect(
      validateNotificationImage({ type: "image/png", size: 5 * 1024 * 1024 }),
    ).toBeNull();
    expect(
      validateNotificationImage({ type: "image/jpeg", size: 20 }),
    ).toBeNull();
    expect(validateNotificationImage({ type: "image/gif", size: 20 })).toMatch(
      /PNG or JPG/,
    );
    expect(
      validateNotificationImage({
        type: "image/png",
        size: 5 * 1024 * 1024 + 1,
      }),
    ).toMatch(/5 MB/);
    expect(validateNotificationImage({ type: "image/png", size: 0 })).toMatch(
      /empty/,
    );
  });
});
describe("notification API contracts", () => {
  it("scopes defaults and writes only the supported fields", async () => {
    const input = { actionLabel: "OK", allowDismissByTapOutside: false };
    await service.getDefaults("project 1");
    await service.saveDefaults("project 1", input);
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/notification-engine/config?projectId=project+1",
    );
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/api/v1/notification-engine/config?projectId=project+1",
      input,
    );
  });
  it("passes inclusive date filters and opaque pagination cursors", async () => {
    await service.list("p1", {
      from: "2026-11-01",
      to: "2026-11-13",
      cursor: "a+b/c=",
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/notification-engine/campaigns?projectId=p1&from=2026-11-01&to=2026-11-13&cursor=a%2Bb%2Fc%3D",
    );
    await service.list("p1", { from: "", to: "" });
    expect(apiClient.get).toHaveBeenLastCalledWith(
      "/api/v1/notification-engine/campaigns?projectId=p1",
    );
  });
  it("creates campaigns and sends the current version on transitions", async () => {
    const input = valid();
    const campaign = { id: "campaign1", version: 3 } as Campaign;
    await service.create("p1", input);
    await service.transition("p1", campaign, "pause");
    await service.transition("p1", campaign, "resume");
    await service.remove("p1", campaign.id);
    expect(apiClient.post).toHaveBeenCalledWith(
      "/api/v1/notification-engine/campaigns?projectId=p1",
      input,
    );
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/api/v1/notification-engine/campaigns/campaign1/pause?projectId=p1",
      { version: 3 },
    );
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/api/v1/notification-engine/campaigns/campaign1/resume?projectId=p1",
      { version: 3 },
    );
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/api/v1/notification-engine/campaigns/campaign1?projectId=p1",
    );
  });
  it("uploads the attachment using the backend multipart file field", async () => {
    const file = new File(["image"], "notice.png", { type: "image/png" });
    await service.upload("p1", file);
    const [url, data] = vi.mocked(apiClient.postFormData).mock.calls[0];
    expect(url).toBe("/api/v1/notification-engine/attachments?projectId=p1");
    expect(data.get("file")).toBe(file);
  });
});

describe("notification review regressions", () => {
  it("supports seconds and rejects normalized invalid dates or times", async () => {
    const { notificationStartIso } =
      await import("./notification-engine-service");
    expect(notificationStartIso("2026-11-13T12:00:30")).toBe(
      "2026-11-13T06:30:30.000Z",
    );
    for (const value of [
      "2026-02-30T12:00",
      "2026-02-29T12:00",
      "2026-11-13T24:00",
      "0000-01-01T12:00",
      "2026-11-13T12:00Z",
    ])
      expect(notificationStartIso(value)).toBeUndefined();
    expect(notificationStartIso("2028-02-29T00:00")).toBe(
      "2028-02-28T18:30:00.000Z",
    );
  });
  it("validates date filters before applying them", async () => {
    const { validateNotificationFilters } =
      await import("./notification-engine-service");
    expect(validateNotificationFilters({})).toBeNull();
    expect(
      validateNotificationFilters({ from: "2026-11-13", to: "2026-11-13" }),
    ).toBeNull();
    expect(
      validateNotificationFilters({ from: "2026-11-14", to: "2026-11-13" }),
    ).toMatch(/on or before/);
    expect(validateNotificationFilters({ from: "2026-02-30" })).toMatch(
      /valid/,
    );
  });
  it("omits hidden popup settings and stale scheduled times from the create payload", async () => {
    const { notificationCampaignInput } =
      await import("./notification-engine-service");
    const payload = notificationCampaignInput(
      {
        ...valid(),
        title: "  Update  ",
        actionLabel: "Old label",
        startsAt: "2026-12-01T00:00:00Z",
      },
      "2026-12-01T12:00",
    );
    expect(payload.title).toBe("Update");
    expect(payload).not.toHaveProperty("actionLabel");
    expect(payload).not.toHaveProperty("startsAt");
    expect(
      notificationCampaignInput(
        { ...valid(), types: ["POP_UP"], actionLabel: "  " },
        "",
      ),
    ).not.toHaveProperty("actionLabel");
    expect(
      notificationCampaignInput(
        {
          ...valid(),
          types: ["POP_UP"],
          actionLabel: "  Continue  ",
          schedule: "LATER",
        },
        "2026-12-01T12:00",
      ),
    ).toMatchObject({
      actionLabel: "Continue",
      startsAt: "2026-12-01T06:30:00.000Z",
    });
  });
  it("retains designation labels when a pause response updates status and version", async () => {
    const { mergeCampaignTransition } =
      await import("./notification-engine-service");
    const current = {
      id: "c1",
      status: "ACTIVE",
      version: 1,
      designations: [{ id: "d1", name: "Team Leader", code: "TL" }],
    } as Campaign;
    const updated = {
      ...current,
      status: "INACTIVE",
      version: 2,
      designations: [],
    } as Campaign;
    expect(mergeCampaignTransition(current, updated)).toMatchObject({
      status: "INACTIVE",
      version: 2,
      designations: current.designations,
    });
  });
});
