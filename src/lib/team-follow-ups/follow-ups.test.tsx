import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fixtures from "../../../test/fixtures/team-daily-follow-ups.json";
import { TeamFollowUpStore } from "./store";
import { attendanceTime, denominator, followUpMessage } from "./presentation";
import type { FollowUpList, TeamScope, TeamSummary } from "./types";
import {
  TeamFollowUpBox,
  TeamFollowUpProvider,
  TeamFollowUpTable,
} from "@/components/team-follow-ups/team-follow-ups";
import { canAccessOverview } from "@/lib/overview/access";
import {
  recordDrillUrl,
  submissionDetailUrl,
} from "@/lib/overview/record-drills";

type Fixture = {
  key: string;
  date: string;
  scope: TeamScope;
  summary: { data: TeamSummary };
  lists: Record<
    string,
    Record<string, { statusCode: number; data: FollowUpList }>
  >;
};
const scenarios = fixtures.scenarios as unknown as Fixture[];
const today = scenarios.find((s) => s.key === "today_direct")!;
const key = today.summary.data.modules[0].sectionKey;
const list = today.lists[key].listed.data;
const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
afterEach(() => vi.useRealTimers());

describe("shared web follow-up behavior", () => {
  it.each(scenarios)(
    "renders the shared $key scenario without rewriting existing card fields",
    (fixture) => {
      const summary = structuredClone(fixture.summary.data);
      const getFollowUps = vi.fn();
      const html = renderToStaticMarkup(
        <TeamFollowUpProvider
          summary={summary}
          date={fixture.key === "month" ? undefined : fixture.date}
          scope={fixture.scope}
          onOpenReportee={() => {}}
          api={{ getFollowUps }}
        >
          <div>
            {summary.modules.map((card) => (
              <TeamFollowUpBox key={card.sectionKey} card={card} />
            ))}
          </div>
        </TeamFollowUpProvider>,
      );
      expect(summary).toEqual(fixture.summary.data);
      expect(getFollowUps).not.toHaveBeenCalled();
      expect(html).not.toContain("tel:");
      if (["month", "before_publication"].includes(fixture.key))
        expect(html).not.toContain("so far");
      for (const card of summary.modules)
        if (card.followUp?.state === "unavailable")
          expect(html).toContain(followUpMessage(card, card.followUp));
    },
  );

  it("uses server denominators, attendance nulls and recorded times", () => {
    expect(
      denominator({
        ...list.followUp!,
        denominatorKind: "expected_reports",
        expectedCount: 8,
      }),
    ).toBe("of 8 expected reports");
    expect(attendanceTime(null, true)).toBe("");
    expect(
      attendanceTime(
        {
          type: "Present",
          checkInAt: "2026-11-17T04:10:00Z",
          checkOutAt: "2026-11-17T06:40:00Z",
          state: "checked_out",
        },
        false,
      ),
    ).toMatch(/9:40.*to.*12:10/);
    expect(
      followUpMessage(today.summary.data.modules[0], {
        ...list.followUp!,
        state: "all_clear",
        unverifiedCount: 1,
      }),
    ).not.toContain("have a sale");
  });

  it("renders six web columns, backend row order, manager context and text-only phone from shared mocks", async () => {
    const fixture = scenarios.find((s) => s.key === "today_all")!;
    const response = fixture.lists[key].listed.data;
    const api = { getFollowUps: vi.fn().mockResolvedValue(response) };
    const store = new TeamFollowUpStore(api);
    store.configure({
      date: fixture.date,
      scope: fixture.scope,
      summary: fixture.summary.data,
    });
    store.select(key);
    await tick();
    const html = renderToStaticMarkup(
      <TeamFollowUpProvider
        summary={fixture.summary.data}
        date={fixture.date}
        scope={fixture.scope}
        onOpenReportee={() => {}}
        controller={store}
      >
        <TeamFollowUpTable />
      </TeamFollowUpProvider>,
    );
    for (const label of [
      "Name",
      "Why",
      "Attendance type",
      "Time",
      "Store",
      "Phone",
    ])
      expect(html).toContain(label);
    expect(html).toContain("day locked");
    expect(html).not.toContain("tel:");
    expect(html).not.toContain("Call now");
    const names = response.items.map((row) => html.indexOf(row.user.name));
    expect(names.every((i) => i >= 0)).toBe(true);
    expect(names).toEqual([...names].sort((a, b) => a - b));
    store.cancel();
  });

  it("loads only a selected card and ignores an old response after scope changes", async () => {
    const first = deferred<FollowUpList>(),
      second = deferred<FollowUpList>();
    const getFollowUps = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const store = new TeamFollowUpStore({ getFollowUps });
    store.configure({
      date: today.date,
      scope: "direct",
      summary: today.summary.data,
    });
    expect(getFollowUps).not.toHaveBeenCalled();
    store.select(key);
    const oldSignal = getFollowUps.mock.calls[0][1] as AbortSignal;
    const all = scenarios.find((s) => s.key === "today_all")!;
    store.configure({
      date: all.date,
      scope: "all",
      summary: all.summary.data,
    });
    expect(oldSignal.aborted).toBe(true);
    second.resolve(all.lists[key].listed.data);
    await tick();
    first.resolve(list);
    await tick();
    expect(store.getSnapshot().data?.scope).toBe("all");
    expect(getFollowUps.mock.calls[1][0]).toMatchObject({
      page: 1,
      search: "",
      scope: "all",
    });
    store.cancel();
  });

  it("debounces server search, keeps full counts, uses server pages and closes hidden periods", async () => {
    vi.useFakeTimers();
    const getFollowUps = vi.fn().mockResolvedValue({
      ...list,
      pagination: { ...list.pagination, hasNextPage: true },
    });
    const store = new TeamFollowUpStore({ getFollowUps });
    store.configure({
      date: today.date,
      scope: "direct",
      summary: today.summary.data,
    });
    store.select(key);
    await tick();
    store.changePage("next");
    await tick();
    expect(getFollowUps.mock.lastCall?.[0].page).toBe(2);
    store.setSearch("Al");
    store.setSearch("Alex");
    expect(store.getSnapshot().data).toBeNull();
    vi.advanceTimersByTime(300);
    await tick();
    expect(getFollowUps).toHaveBeenCalledTimes(3);
    expect(getFollowUps.mock.lastCall?.[0]).toMatchObject({
      search: "Alex",
      page: 1,
    });
    expect(store.getSnapshot().data?.followUp).toEqual(list.followUp);
    store.configure({ scope: "direct", summary: today.summary.data });
    expect(store.getSnapshot().moduleKey).toBeNull();
    store.cancel();
  });

  it("keeps errors distinct from all clear and retries only the selected endpoint", async () => {
    const getFollowUps = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce(list);
    const store = new TeamFollowUpStore({ getFollowUps });
    store.configure({
      date: today.date,
      scope: "direct",
      summary: today.summary.data,
    });
    store.select(key);
    await tick();
    expect(store.getSnapshot()).toMatchObject({
      status: "error",
      data: null,
      error: "Unavailable",
    });
    store.retry();
    await tick();
    expect(store.getSnapshot()).toMatchObject({ status: "ready", data: list });
    store.configure({
      date: today.date,
      scope: "direct",
      summary: { ...today.summary.data, modules: [] },
    });
    expect(store.getSnapshot().moduleKey).toBeNull();
    store.cancel();
  });

  it.each(["WEB", "BOTH", "MOBILE", null, undefined] as const)(
    "gates Overview for %s without granting setup permissions",
    (access) => {
      expect(canAccessOverview({ access })).toBe(
        access === "WEB" || access === "BOTH",
      );
    },
  );

  it("keeps submission and form header routes independent of follow-up people routes", () => {
    const sales = today.summary.data.modules[0];
    const form = today.summary.data.modules.find((c) => c.isFormBuilder)!;
    const salesUrl = recordDrillUrl(
      { card: sales, status: "approved" },
      { date: today.date },
      "all",
      2,
      "Sam",
    );
    expect(salesUrl).toContain("/overview/team/sales/");
    expect(salesUrl).toContain("status=approved");
    expect(salesUrl).not.toContain("follow-ups");
    const formUrl = recordDrillUrl(
      { card: form, status: "total" },
      { date: today.date },
      "direct",
      1,
      "",
    );
    expect(formUrl).toContain(`/team/forms/${form.sectionKey}/users`);
    expect(formUrl).not.toContain("page=");
    expect(
      new URL(formUrl!, "https://example.test").searchParams.get("scope"),
    ).toBe("direct");
    const submissionsUrl = recordDrillUrl(
      { card: form, status: "total", formUserId: "reportee-one" },
      { date: today.date },
      "all",
      2,
      "Sam",
    );
    const submissions = new URL(submissionsUrl!, "https://example.test");
    expect(submissions.pathname).toContain("/users/reportee-one/submissions");
    expect(Object.fromEntries(submissions.searchParams)).toEqual({
      date: today.date,
      page: "2",
      limit: "20",
    });
    expect(
      recordDrillUrl(
        {
          card: {
            sectionKey: "attendance",
            label: "Attendance",
            isFormBuilder: false,
          },
          status: "present",
        },
        { month: 11, year: 2026 },
        "direct",
        1,
        "",
      ),
    ).not.toContain("limit=");
    expect(
      submissionDetailUrl(sales, {
        id: "record-one",
        recordType: "zero_sales",
      }),
    ).toContain("/zero-sales/record-one");
  });
});
