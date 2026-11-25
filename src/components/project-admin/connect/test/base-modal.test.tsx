import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BaseModal, ConnectBaseModal } from "../modals/base-modal";

describe("BaseModal Component", () => {
  it("renders null when isOpen is false", () => {
    const html = renderToStaticMarkup(
      <BaseModal isOpen={false} onClose={vi.fn()}>
        <div>Modal Content</div>
      </BaseModal>,
    );
    expect(html).toBe("");
  });

  it("renders dialog with max height, y-scroll, and no x-scroll", () => {
    const html = renderToStaticMarkup(
      <BaseModal
        isOpen={true}
        onClose={vi.fn()}
        title="Test Modal"
        subtitle="Test Subtitle"
        maxWidth="xl"
      >
        <div>Scrollable Body Content</div>
      </BaseModal>,
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("max-h-[90vh]");
    expect(html).toContain("overflow-x-hidden");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("max-w-xl");
    expect(html).toContain("Test Modal");
    expect(html).toContain("Test Subtitle");
    expect(html).toContain("Scrollable Body Content");

    // role="dialog" must be on the panel, not the backdrop
    expect(html).toMatch(/^<div class="fixed inset-0[^"]*"><div tabindex="-1" role="dialog"/);

    // aria-labelledby must be auto-linked to the title heading id
    const labelledByMatch = html.match(/aria-labelledby="([^"]+)"/);
    expect(labelledByMatch).not.toBeNull();
    expect(html).toContain(`<h3 id="${labelledByMatch![1]}"`);
  });

  it("resolves various maxWidth prop values correctly", () => {
    const htmlSm = renderToStaticMarkup(
      <BaseModal isOpen={true} onClose={vi.fn()} maxWidth="sm">
        Content
      </BaseModal>,
    );
    expect(htmlSm).toContain("max-w-sm");

    const htmlMd = renderToStaticMarkup(
      <BaseModal isOpen={true} onClose={vi.fn()} maxWidth="md">
        Content
      </BaseModal>,
    );
    expect(htmlMd).toContain("max-w-md");

    const htmlLg = renderToStaticMarkup(
      <BaseModal isOpen={true} onClose={vi.fn()} maxWidth="lg">
        Content
      </BaseModal>,
    );
    expect(htmlLg).toContain("max-w-lg");

    const html2xl = renderToStaticMarkup(
      <BaseModal isOpen={true} onClose={vi.fn()} maxWidth="2xl">
        Content
      </BaseModal>,
    );
    expect(html2xl).toContain("max-w-2xl");

    const html720 = renderToStaticMarkup(
      <BaseModal isOpen={true} onClose={vi.fn()} maxWidth="720px">
        Content
      </BaseModal>,
    );
    expect(html720).toContain("max-w-[720px]");
  });

  it("renders form wrapper and pinned footer when formProps and footer are provided", () => {
    const html = renderToStaticMarkup(
      <BaseModal
        isOpen={true}
        onClose={vi.fn()}
        title="Form Modal"
        formProps={{ method: "post" }}
        footer={<button type="submit">Submit</button>}
      >
        <input name="testInput" defaultValue="123" />
      </BaseModal>,
    );

    expect(html).toContain("<form");
    expect(html).toContain('method="post"');
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain('type="submit"');
    expect(html).toContain("Submit");
  });

  it("supports compound components BaseModal.Header, BaseModal.Body, and BaseModal.Footer", () => {
    const html = renderToStaticMarkup(
      <ConnectBaseModal isOpen={true} onClose={vi.fn()} rawContent={true}>
        <BaseModal.Header>
          <h3>Custom Header</h3>
        </BaseModal.Header>
        <BaseModal.Body>
          <p>Custom Body</p>
        </BaseModal.Body>
        <BaseModal.Footer>
          <button type="button">Close</button>
        </BaseModal.Footer>
      </ConnectBaseModal>,
    );

    expect(html).toContain("Custom Header");
    expect(html).toContain("Custom Body");
    expect(html).toContain("Close");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("overflow-x-hidden");
  });
});
