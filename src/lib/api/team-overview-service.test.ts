import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import { teamOverviewService } from "./team-overview-service";

describe("authenticated overview API boundary", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    apiClient.setAccessToken("fictional-overview-test-token");
  });
  afterEach(() => {
    apiClient.clearAccessToken();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
  it("unwraps the original Summary and preserves all existing payload fields", async () => {
    const original = {
      modules: [
        {
          sectionKey: "sales_config_a",
          sales: { tiles: [{ key: "approved", value: 5 }] },
          followUp: { listedCount: 2 },
        },
      ],
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 200, data: original })),
    );
    const signal = new AbortController().signal;
    expect(
      await teamOverviewService.getSummary(
        { date: "2026-11-18", scope: "all" },
        signal,
      ),
    ).toEqual(original);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      "/api/v1/overview/team/summary?scope=all&date=2026-11-18",
    );
    expect(options).toMatchObject({
      credentials: "include",
      signal,
      headers: { Authorization: "Bearer fictional-overview-test-token" },
    });
  });
  it("encodes paging/search on the people endpoint without arbitrary project or subject overrides", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 200, data: { items: [] } })),
    );
    await teamOverviewService.getFollowUps({
      moduleKey: "form_builder_daily_audit",
      date: "2026-11-18",
      scope: "direct",
      view: "listed",
      search: " Sam & Co ",
      page: 2,
      limit: 20,
    });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe(
      "/api/v1/overview/team/follow-ups/form_builder_daily_audit/users",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      date: "2026-11-18",
      scope: "direct",
      view: "listed",
      search: "Sam & Co",
      page: "2",
      limit: "20",
    });
  });
});
