import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { BackendUser } from "@/lib/api/types";
import { OverviewPage, SummaryCards } from "./overview-page";
import { managerNav } from "@/lib/nav/nav";
import { TeamFollowUpProvider } from "@/components/team-follow-ups/team-follow-ups";
import type { TeamSummary } from "@/lib/team-follow-ups/types";
import fixtures from "../../../test/fixtures/team-daily-follow-ups.json";
import { webOverviewCards } from "@/lib/overview/cards";

const auth = vi.hoisted(() => ({
  user: null as BackendUser | null,
  isLoading: false,
  isAuthenticated: true,
}));
vi.mock("@/lib/auth/auth-context", () => ({ useAuth: () => auth }));

describe("Overview page access and navigation", () => {
  it.each(["WEB", "BOTH", "MOBILE", null, undefined] as const)(
    "enforces designation access %s on direct page entry",
    (access) => {
      auth.user = {
        id: "user",
        email: "fictional@example.test",
        projectId: "project-a",
        access,
      };
      const html = renderToStaticMarkup(<OverviewPage projectId="project-a" />);
      if (access === "WEB" || access === "BOTH")
        expect(html).toContain("Loading your team");
      else expect(html).toContain("requires WEB or BOTH");
    },
  );
  it("does not silently load a different project's manager data", () => {
    auth.user = {
      id: "user",
      email: "fictional@example.test",
      projectId: "project-a",
      access: "BOTH",
    };
    expect(
      renderToStaticMarkup(<OverviewPage projectId="project-b" />),
    ).toContain("assigned to your current session");
  });
  it("preserves Inbox and Reports when Overview is not allowed", () => {
    const items = managerNav(4, false).flatMap((s) => s.items);
    expect(items.map((i) => i.label)).toEqual(["Inbox", "Reports"]);
    expect(items[0].badge).toBe(4);
    expect(managerNav(4, true)[0].items[0]).toMatchObject({
      label: "Overview",
      href: "/workspace",
    });
  });

  it("offers single-day date/scope controls without a day/month view selection", () => {
    auth.user = {
      id: "user",
      email: "fictional@example.test",
      projectId: "project-a",
      access: "BOTH",
    };
    const html = renderToStaticMarkup(<OverviewPage projectId="project-a" />);
    for (const label of [
      "Today",
      "Yesterday",
      "Direct",
      "+ Sub",
      "Overview date",
    ])
      expect(html).toContain(label);
    expect(html).not.toContain("My overview");
    expect(html).not.toContain("Overview period");
    expect(html).not.toContain('type="month"');
    expect(html).not.toContain('aria-label="Overview view"');
  });

  it("renders only Sales, Stock and forms when Summary includes other enabled modules", () => {
    const fixture = fixtures.scenarios.find((s) => s.key === "today_direct")!;
    const supported = structuredClone(
      fixture.summary.data,
    ) as unknown as TeamSummary;
    const cards = [
      ...supported.modules,
      ...[
        "attendance",
        "random_attendance",
        "ir_compliance",
        "visit",
        "claims",
        "target_vs_achievement_config_000000000000000000000123",
      ].map((sectionKey) => ({
        sectionKey,
        label: `Excluded ${sectionKey}`,
        isFormBuilder: false,
      })),
      {
        ...supported.modules[0],
        sectionKey: "sales_config_000000000000000000000999",
        label: "Disabled sales",
        isEnabled: false,
      },
    ];
    expect(webOverviewCards(cards)).toEqual(supported.modules);
    const html = renderToStaticMarkup(
      <TeamFollowUpProvider
        summary={{ ...supported, modules: cards }}
        date={fixture.date}
        scope="direct"
        onOpenReportee={() => {}}
      >
        <SummaryCards cards={cards} onOpenRecords={() => {}} />
      </TeamFollowUpProvider>,
    );
    expect(html).not.toContain("Excluded");
    expect(html).not.toContain("Disabled sales");
    for (const card of supported.modules) expect(html).toContain(card.label);
    expect(cards).toHaveLength(supported.modules.length + 7);
  });

  it("keeps record status tiles and form header submission navigation in the reference card layout", () => {
    const fixture = fixtures.scenarios.find((s) => s.key === "today_direct")!;
    const summary = structuredClone(
      fixture.summary.data,
    ) as unknown as TeamSummary;
    const html = renderToStaticMarkup(
      <TeamFollowUpProvider
        summary={summary}
        date={fixture.date}
        scope="direct"
        onOpenReportee={() => {}}
      >
        <SummaryCards cards={summary.modules} onOpenRecords={() => {}} />
      </TeamFollowUpProvider>,
    );
    const articles = [...html.matchAll(/<article[\s\S]*?<\/article>/g)].map(
      (match) => match[0],
    );
    expect(articles).toHaveLength(summary.modules.length);
    summary.modules.forEach((card, index) => {
      expect(articles[index]).toContain(card.label);
      expect(articles[index]).toContain(card.subtitle);
      if (card.sales || card.stock) {
        for (const tile of (card.sales ?? card.stock)!.tiles) {
          expect(articles[index]).toContain(tile.label);
          expect(articles[index]).toMatch(
            new RegExp(`>${tile.value}</strong>`),
          );
        }
      }
      if (card.isFormBuilder)
        expect(articles[index]).toMatch(
          /<button[^>]*>[^<]*Daily Audit<\/button>/,
        );
    });
    expect(summary).toEqual(fixture.summary.data);
  });
});
