import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignationCard } from "./designation-card";
import type { Designation } from "@/lib/api";

const fixture = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => actual.useState(
      initial && typeof initial === "object" && "targetModule" in initial
        ? { ...initial, ...fixture.state }
        : initial,
    ),
  };
});
vi.mock("@/lib/api", () => ({ documentsService: {}, formatApiError: String }));
// The repository's test transform uses the classic JSX runtime.
vi.stubGlobal("React", React);
afterEach(() => { fixture.state = {}; });

function renderCard(overrides: Record<string, unknown> = {}) {
  fixture.state = {
    title: "Youtube video", documentType: "YouTube", targetModule: "Product Training 2",
    youtubeUrl: "https://youtu.be/PQNLbQpp-hk?si=fdI0hLLtH_9Oobp3",
    fromDate: "2026-11-11", toDate: "2026-11-12", file: null,
    ...overrides,
  };
  return renderToStaticMarkup(React.createElement(DesignationCard, {
    designation: { id: "d1", name: "IT" } as Designation,
    targetModules: ["Product Training 2"], categoryRenames: {}, projectId: "p1",
    onUploadSuccess: () => {}, onUploadError: () => {},
  }));
}

function actionButton(html: string) {
  return html.match(/<button\b[^>]*>(?:Add Link|Upload Document)<\/button>/)?.[0];
}

describe("document upload readiness", () => {
  it("enables Add Link for the screenshot's valid video URL without a file", () => {
    const html = renderCard();
    expect(actionButton(html)).toBeDefined();
    expect(actionButton(html)).not.toContain("disabled");
    expect(html).toContain("Ready");
  });
  it("enables Add Link for a supported playlist without a file", () => {
    expect(actionButton(renderCard({ youtubeUrl: "https://www.youtube.com/playlist?list=PL1234567890abcdefghij" }))).not.toContain("disabled");
  });
  it.each([
    { youtubeUrl: "" }, { youtubeUrl: "https://www.youtube.com/@channel" },
    { title: " " }, { targetModule: "Removed" }, { toDate: "2026-11-10" },
  ])("keeps incomplete or invalid links disabled: %j", (overrides) => {
    expect(actionButton(renderCard(overrides))).toContain("disabled");
  });
  it("still requires a file for file uploads", () => {
    expect(actionButton(renderCard({ documentType: "PDF" }))).toContain("disabled");
    expect(actionButton(renderCard({ documentType: "PDF", file: new File(["pdf"], "guide.pdf", { type: "application/pdf" }) }))).not.toContain("disabled");
  });
});
