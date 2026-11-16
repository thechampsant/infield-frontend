import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PROJECT_MODULE_CATALOG } from "@/lib/project-admin/module-catalog";
import { ModuleCard } from "./module-card";

// Match the repository's existing server-rendered component checks.
vi.stubGlobal("React", React);
afterEach(() => vi.clearAllMocks());
const helpdesk = PROJECT_MODULE_CATALOG.find((module) => module.id === "helpdesk")!;

describe("Helpdesk toggle-only module card", () => {
  it.each([false, true])("shows a toggle without navigation when enabled=%s", (enabled) => {
    const html = renderToStaticMarkup(React.createElement(ModuleCard, {
      module: { definition: helpdesk, enabled },
      // Even an accidentally provided destination must not create navigation.
      configHref: "/should-not-be-shown",
      alwaysShowConfig: true,
    }));
    expect(html).toContain("Helpdesk");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain(enabled ? "Enabled" : "Disabled");
    expect(html).not.toContain("Go to Configuration");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("disables the toggle for a viewer without module-management permission", () => {
    const html = renderToStaticMarkup(React.createElement(ModuleCard, {
      module: { definition: helpdesk, enabled: true }, readOnly: true,
    }));
    expect(html).toMatch(/<input[^>]*disabled/);
  });

  it("forwards a toggle change to the existing save handler", () => {
    const onToggle = vi.fn();
    const card = ModuleCard({ module: { definition: helpdesk, enabled: false }, onToggle });
    function findInput(node: React.ReactNode): React.ReactElement<{ onChange: (event: { target: { checked: boolean } }) => void }> | undefined {
      if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return;
      if (node.type === "input") return node as ReturnType<typeof findInput>;
      return React.Children.toArray(node.props.children).map(findInput).find(Boolean);
    }
    findInput(card)!.props.onChange({ target: { checked: true } });
    expect(onToggle).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("preserves configuration actions for existing modules", () => {
    const attendance = PROJECT_MODULE_CATALOG.find((module) => module.id === "attendance")!;
    const html = renderToStaticMarkup(React.createElement(ModuleCard, {
      module: { definition: attendance, enabled: true }, configHref: "/modules/attendance",
    }));
    expect(html).toContain('href="/modules/attendance"');
    expect(html).toContain("Go to Configuration");
    const notifications = PROJECT_MODULE_CATALOG.find((module) => module.id === "notifications")!;
    const fallback = renderToStaticMarkup(React.createElement(ModuleCard, {
      module: { definition: notifications, enabled: true },
    }));
    expect(fallback).toContain("<button");
    expect(fallback).toContain("Go to Configuration");
  });
});
