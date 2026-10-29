import { describe, expect, it } from "vitest";
import { uploadersTabs } from "./nav";

describe("uploadersTabs", () => {
  it("hides the Leave Balance tab unless Leave is enabled", () => {
    const labels = uploadersTabs("ACC", "PRJ").map((tab) => tab.label);

    expect(labels).not.toContain("Leave Balance");
    expect(labels).toContain("Target Master");
  });

  it("adds the Leave Balance tab last when Leave is enabled", () => {
    const tabs = uploadersTabs("ACC", "PRJ", { leaveEnabled: true });

    expect(tabs[tabs.length - 1].label).toBe("Leave Balance");
    expect(tabs[tabs.length - 1].href).toMatch(/\/uploaders\/leave-balance$/);
  });
});
