import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SettingsTab } from "./settings-tab";
import { connectConfigService } from "@/lib/api/connect-config-service";
import { PROJECT_MODULE_CATALOG } from "@/lib/project-admin/module-catalog";

describe("Connect Acceptance Criteria Suite", () => {
  beforeEach(() => {
    connectConfigService.clearProjectSettings("project-alpha");
    connectConfigService.clearProjectSettings("project-beta");
    connectConfigService.clearProjectSettings("untouched-project");
  });

  /**
   * AC 1:
   * Given I am a Project Admin, when I open Project → Modules → Connect, then I see three switches: Connect, Wall and Chat Rooms.
   */
  it("AC 1: When opening Connect settings, displays three switches: Connect, Wall and Chat Rooms", () => {
    const html = renderToStaticMarkup(
      <SettingsTab
        projectName="Demo Program"
        connectEnabled={false}
        wallEnabled={true}
        chatRoomsEnabled={true}
        onToggleConnect={vi.fn()}
        onToggleWall={vi.fn()}
        onToggleChatRooms={vi.fn()}
      />,
    );

    // Three switches are rendered with IDs and labels
    expect(html).toContain('id="s-connect"');
    expect(html).toContain('id="s-wall"');
    expect(html).toContain('id="s-rooms"');

    // Switch labels appear in the document
    expect(html).toContain("Connect");
    expect(html).toContain("Wall");
    expect(html).toContain("Chat Rooms");

    // Module catalog configPath points to modules/connect
    const connectMod = PROJECT_MODULE_CATALOG.find((m) => m.id === "connect");
    expect(connectMod).toBeDefined();
    expect(connectMod?.configPath).toBe("modules/connect");
  });

  /**
   * AC 2:
   * Given a project where nobody has changed them, when I open the page, then Connect is Off, and Wall and Chat Rooms are On.
   */
  it("AC 2: For a project where nobody changed them, Connect is Off, and Wall and Chat Rooms are On", async () => {
    const defaults = await connectConfigService.getSettings("untouched-project");
    expect(defaults.connect).toBe(false); // Off
    expect(defaults.wall).toBe(true); // On
    expect(defaults.rooms).toBe(true); // On

    // Also in module catalog definition
    const connectMod = PROJECT_MODULE_CATALOG.find((m) => m.id === "connect");
    expect(connectMod?.defaultEnabled).toBe(false);

    // Render with defaults
    const html = renderToStaticMarkup(
      <SettingsTab
        projectName="Fresh Retail"
        connectEnabled={defaults.connect}
        wallEnabled={defaults.wall}
        chatRoomsEnabled={defaults.rooms}
        onToggleConnect={vi.fn()}
        onToggleWall={vi.fn()}
        onToggleChatRooms={vi.fn()}
      />,
    );

    // Connect is aria-checked="false"
    expect(html).toContain('id="s-connect" role="switch" aria-checked="false"');
    // Wall is aria-checked="true"
    expect(html).toContain('id="s-wall" role="switch" aria-checked="true"');
    // Chat Rooms is aria-checked="true"
    expect(html).toContain('id="s-rooms" role="switch" aria-checked="true"');
  });

  /**
   * AC 3:
   * Given Connect is Off, when I view the page, then the Wall and Chat Rooms switches are disabled.
   */
  it("AC 3: Given Connect is Off, Wall and Chat Rooms switches are disabled", () => {
    const html = renderToStaticMarkup(
      <SettingsTab
        projectName="Demo Program"
        connectEnabled={false}
        wallEnabled={true}
        chatRoomsEnabled={true}
        onToggleConnect={vi.fn()}
        onToggleWall={vi.fn()}
        onToggleChatRooms={vi.fn()}
      />,
    );

    // Wall switch has disabled attribute
    expect(html).toMatch(/id="s-wall"[^>]*disabled/);
    expect(html).toContain('id="s-wall" role="switch" aria-checked="true" disabled=""');

    // Chat Rooms switch has disabled attribute
    expect(html).toMatch(/id="s-rooms"[^>]*disabled/);
    expect(html).toContain('id="s-rooms" role="switch" aria-checked="true" disabled=""');

    // Connect switch itself is NOT disabled
    expect(html).not.toMatch(/id="s-connect"[^>]*disabled=""/);
  });

  it("AC 3 (enabled): Given Connect is On, Wall and Chat Rooms switches are enabled", () => {
    const html = renderToStaticMarkup(
      <SettingsTab
        projectName="Demo Program"
        connectEnabled={true}
        wallEnabled={true}
        chatRoomsEnabled={true}
        onToggleConnect={vi.fn()}
        onToggleWall={vi.fn()}
        onToggleChatRooms={vi.fn()}
      />,
    );

    // Neither Wall nor Chat Rooms should have disabled attribute
    expect(html).not.toMatch(/id="s-wall"[^>]*disabled=""/);
    expect(html).not.toMatch(/id="s-rooms"[^>]*disabled=""/);
  });

  /**
   * AC 4:
   * Given I change any switch, when it saves, then the change applies at once and the configuration audit history records it with my name and the time.
   */
  it("AC 4: Changing any switch applies at once and logs audit history with user name and time", async () => {
    const adminName = "Aarav Sharma";
    const beforeTime = Date.now();

    const updated = await connectConfigService.updateSetting(
      "project-alpha",
      "connect",
      true,
      adminName,
    );
    expect(updated.connect).toBe(true);

    const history = connectConfigService.getAuditHistory("project-alpha");
    expect(history.length).toBe(1);
    expect(history[0].field).toBe("Connect");
    expect(history[0].oldValue).toBe("Off");
    expect(history[0].newValue).toBe("On");
    expect(history[0].changedBy).toBe("Aarav Sharma");
    expect(new Date(history[0].changedAt).getTime()).toBeGreaterThanOrEqual(beforeTime);

    // Verify rendered audit history card
    const html = renderToStaticMarkup(
      <SettingsTab
        projectName="Alpha Program"
        connectEnabled={true}
        wallEnabled={true}
        chatRoomsEnabled={true}
        onToggleConnect={vi.fn()}
        onToggleWall={vi.fn()}
        onToggleChatRooms={vi.fn()}
        auditHistory={history}
      />,
    );

    expect(html).toContain("Configuration Audit History");
    expect(html).toContain("Aarav Sharma");
    expect(html).toContain("Off");
    expect(html).toContain("On");
  });

  /**
   * AC 5:
   * Given I view the Fixed card, then it lists Admin-only posting and room creation, reactions on, text-only room messages, up to 1,000 members per room, at most one room push per 5 minutes, every UDF available as a room filter, and messages kept indefinitely, none of them editable.
   */
  it("AC 5: Fixed card lists all required fixed policies and notes none are editable", () => {
    const html = renderToStaticMarkup(
      <SettingsTab
        projectName="Demo Program"
        connectEnabled={true}
        wallEnabled={true}
        chatRoomsEnabled={true}
        onToggleConnect={vi.fn()}
        onToggleWall={vi.fn()}
        onToggleChatRooms={vi.fn()}
      />,
    );

    // 1. Admin-only posting and room creation
    expect(html).toContain("Admin-only posting and room creation");

    // 2. reactions on
    expect(html).toContain("Reactions on");

    // 3. text-only room messages
    expect(html).toContain("Text-only room messages");

    // 4. up to 1,000 members per room
    expect(html).toContain("Up to 1,000 members per room");

    // 5. at most one room push per 5 minutes
    expect(html).toContain("At most one room push per 5 minutes");

    // 6. every UDF available as a room filter
    expect(html).toContain("Every UDF available as a room filter");

    // 7. messages kept indefinitely
    expect(html).toContain("Messages kept indefinitely");

    // 8. none of them editable
    expect(html).toContain("None of them editable");
  });

  /**
   * AC 8:
   * Given I changed switches in one project, when an admin opens another project, then its switches are unchanged.
   */
  it("AC 8: Changes in Project Alpha leave Project Beta switches unchanged", async () => {
    // Admin toggles switches in Project Alpha
    await connectConfigService.updateSetting("project-alpha", "connect", true, "Alpha Admin");
    await connectConfigService.updateSetting("project-alpha", "wall", false, "Alpha Admin");

    // Project Alpha state
    const alphaSettings = await connectConfigService.getSettings("project-alpha");
    expect(alphaSettings.connect).toBe(true);
    expect(alphaSettings.wall).toBe(false);
    expect(alphaSettings.rooms).toBe(true);

    // Admin opens Project Beta: its switches are completely unchanged
    const betaSettings = await connectConfigService.getSettings("project-beta");
    expect(betaSettings.connect).toBe(false); // Off by default
    expect(betaSettings.wall).toBe(true); // On by default
    expect(betaSettings.rooms).toBe(true); // On by default

    // Project Beta audit history has no records from Project Alpha
    const betaAudit = connectConfigService.getAuditHistory("project-beta");
    expect(betaAudit.length).toBe(0);

    const alphaAudit = connectConfigService.getAuditHistory("project-alpha");
    expect(alphaAudit.length).toBe(2);
  });
});
