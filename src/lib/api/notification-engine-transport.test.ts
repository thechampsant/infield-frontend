import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import {
  notificationEngineService as service,
  type CampaignInput,
  type Campaign,
} from "./notification-engine-service";

const projectId = "507f1f77bcf86cd799439011";
const campaignId = "507f1f77bcf86cd799439012";
const attachmentId = "507f1f77bcf86cd799439013";
const designationId = "507f1f77bcf86cd799439014";
const input: CampaignInput = {
  title: "Team update",
  message: "Read the update",
  types: ["IN_APP", "PUSH", "POP_UP"],
  designationIds: [designationId],
  schedule: "LATER",
  startsAt: "2026-12-01T06:30:00.000Z",
  durationDays: 7,
  frequencyPerDay: 3,
  attachmentId,
};
const campaign: Campaign = {
  startsAt: "2026-12-01T06:30:00.000Z",
  attachmentId,
  ...input,
  id: campaignId,
  projectId,
  endsAt: "2026-12-08T06:30:00.000Z",
  status: "ACTIVE" as const,
  version: 1,
  isScheduled: true,
  isExpired: false,
  designations: [{ id: designationId, code: "TL", name: "Team Leader" }],
  actionLabel: "OK",
  allowDismissByTapOutside: false,
};
const fetchMock = vi.fn<typeof fetch>();
const reply = (data: unknown, status = 200) =>
  new Response(
    JSON.stringify({
      statusCode: status,
      message: "Success",
      data,
      timestamp: "2026-11-13T06:30:00Z",
    }),
    { status },
  );
afterEach(() => {
  apiClient.clearAccessToken();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("notification engine HTTP integration with the whynest contracts", () => {
  it("unwraps defaults and campaign envelopes and uses authenticated project-scoped requests", async () => {
    vi.stubGlobal("fetch", fetchMock);
    apiClient.setAccessToken("test-jwt");
    const config = {
      projectId,
      actionLabel: "OK",
      allowDismissByTapOutside: false,
      timezone: "Asia/Kolkata",
    };
    fetchMock
      .mockResolvedValueOnce(reply(config))
      .mockResolvedValueOnce(reply(config))
      .mockResolvedValueOnce(reply(campaign, 201))
      .mockResolvedValueOnce(
        reply({ items: [campaign], nextCursor: "opaque+cursor=" }),
      );
    expect(await service.getDefaults(projectId)).toEqual(config);
    expect(
      await service.saveDefaults(projectId, {
        actionLabel: "OK",
        allowDismissByTapOutside: false,
      }),
    ).toEqual(config);
    expect(await service.create(projectId, input)).toEqual(campaign);
    expect(
      await service.list(projectId, { from: "2026-12-01", to: "2026-12-08" }),
    ).toEqual({ items: [campaign], nextCursor: "opaque+cursor=" });
    for (const [url, options] of fetchMock.mock.calls) {
      expect(String(url)).toContain(`/api/v1/notification-engine/`);
      expect(
        new URL(String(url), "http://localhost").searchParams.get("projectId"),
      ).toBe(projectId);
      expect(options?.credentials).toBe("include");
      expect(new Headers(options?.headers).get("Authorization")).toBe(
        "Bearer test-jwt",
      );
    }
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      actionLabel: "OK",
      allowDismissByTapOutside: false,
    });
    expect(fetchMock.mock.calls[2][1]?.method).toBe("POST");
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual(input);
  });
  it("uses multipart file uploads without forcing JSON content type and unwraps the attachment id", async () => {
    vi.stubGlobal("fetch", fetchMock);
    apiClient.setAccessToken("test-jwt");
    fetchMock.mockResolvedValueOnce(
      reply(
        { id: attachmentId, projectId, mimeType: "image/png", size: 5 },
        201,
      ),
    );
    const file = new File(["image"], "notice.png", { type: "image/png" });
    expect((await service.upload(projectId, file)).id).toBe(attachmentId);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(`/attachments?projectId=${projectId}`);
    expect(options?.method).toBe("POST");
    expect((options?.body as FormData).get("file")).toBe(file);
    expect(new Headers(options?.headers).has("Content-Type")).toBe(false);
    expect(options?.credentials).toBe("include");
  });
  it("receives authoritative transition versions and soft-delete responses", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(
        reply({
          ...campaign,
          status: "INACTIVE",
          version: 2,
          designations: [],
        }),
      )
      .mockResolvedValueOnce(
        reply({ ...campaign, version: 3, designations: [] }),
      )
      .mockResolvedValueOnce(reply({ id: campaignId, deleted: true }));
    const paused = await service.transition(projectId, campaign, "pause");
    expect(paused.status).toBe("INACTIVE");
    await service.transition(projectId, paused, "resume");
    await service.remove(projectId, campaignId);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      version: 1,
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      version: 2,
    });
    expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
  });
  it.each([
    [409, "NOTIFICATION_ENGINE_CONFLICT"],
    [409, "NOTIFICATION_ENGINE_EXPIRED"],
    [503, "NOTIFICATION_ENGINE_DISABLED"],
    [403, "FORBIDDEN"],
  ])("preserves backend %s errors (%s)", async (status, errorCode) => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          statusCode: status,
          errorCode,
          message: "Backend explanation",
        }),
        { status: Number(status) },
      ),
    );
    await expect(
      service.transition(projectId, campaign, "resume"),
    ).rejects.toMatchObject({
      status,
      errorCode,
      message: "Backend explanation",
    });
  });
});
