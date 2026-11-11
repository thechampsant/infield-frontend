import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  connectConfigService,
  DEFAULT_CONNECT_SETTINGS,
} from "./connect-config-service";
import { useConnectSettings } from "@/hooks/use-connect-settings";

describe("connectConfigService", () => {
  beforeEach(() => {
    // Clear test storage before each test
    connectConfigService.clearProjectSettings("proj-test-1");
    connectConfigService.clearProjectSettings("proj-test-2");
    connectConfigService.clearProjectSettings("fresh-project");
  });

  it("returns default values when nobody has changed them: Connect Off, Wall On, Chat Rooms On", async () => {
    const settings = await connectConfigService.getSettings("fresh-project");
    expect(settings.connect).toBe(false);
    expect(settings.wall).toBe(true);
    expect(settings.rooms).toBe(true);
    expect(DEFAULT_CONNECT_SETTINGS).toEqual({
      connect: false,
      wall: true,
      rooms: true,
    });
  });

  it("updates switch immediately and logs in audit history with admin name and ISO timestamp", async () => {
    const adminName = "Kunal Verma";
    const res = await connectConfigService.updateSetting(
      "proj-test-1",
      "connect",
      true,
      adminName,
    );

    expect(res.connect).toBe(true);
    expect(res.wall).toBe(true);
    expect(res.rooms).toBe(true);

    const history = connectConfigService.getAuditHistory("proj-test-1");
    expect(history.length).toBe(1);
    expect(history[0].field).toBe("Connect");
    expect(history[0].oldValue).toBe("Off");
    expect(history[0].newValue).toBe("On");
    expect(history[0].changedBy).toBe("Kunal Verma");
    expect(new Date(history[0].changedAt).getTime()).not.toBeNaN();
  });

  it("records separate audit log entries for each switch change", async () => {
    await connectConfigService.updateSetting("proj-test-1", "connect", true, "Admin 1");
    await connectConfigService.updateSetting("proj-test-1", "wall", false, "Admin 2");
    await connectConfigService.updateSetting("proj-test-1", "rooms", false, "Admin 3");

    const history = connectConfigService.getAuditHistory("proj-test-1");
    expect(history.length).toBe(3);
    expect(history[0].field).toBe("Chat Rooms");
    expect(history[0].oldValue).toBe("On");
    expect(history[0].newValue).toBe("Off");
    expect(history[0].changedBy).toBe("Admin 3");

    expect(history[1].field).toBe("Wall");
    expect(history[1].oldValue).toBe("On");
    expect(history[1].newValue).toBe("Off");
    expect(history[1].changedBy).toBe("Admin 2");

    expect(history[2].field).toBe("Connect");
    expect(history[2].oldValue).toBe("Off");
    expect(history[2].newValue).toBe("On");
    expect(history[2].changedBy).toBe("Admin 1");
  });

  it("ensures project isolation: changing switches in one project does not change another project", async () => {
    // Project 1: Connect ON, Wall OFF, Chat Rooms ON
    await connectConfigService.updateSetting("proj-test-1", "connect", true, "Admin 1");
    await connectConfigService.updateSetting("proj-test-1", "wall", false, "Admin 1");

    // Project 2 has not been modified
    const p2Settings = await connectConfigService.getSettings("proj-test-2");
    expect(p2Settings.connect).toBe(false); // Connect remains Off
    expect(p2Settings.wall).toBe(true); // Wall remains On
    expect(p2Settings.rooms).toBe(true); // Chat Rooms remains On

    // Project 2 has no audit history from Project 1
    const p2History = connectConfigService.getAuditHistory("proj-test-2");
    expect(p2History.length).toBe(0);

    // Project 1 settings remain intact
    const p1Settings = await connectConfigService.getSettings("proj-test-1");
    expect(p1Settings.connect).toBe(true);
    expect(p1Settings.wall).toBe(false);
    expect(p1Settings.rooms).toBe(true);
  });

  it("useConnectSettings hook: initializes with project defaults and provides toggle methods", () => {
    let capturedHook: ReturnType<typeof useConnectSettings> | null = null;
    const onSuccess = vi.fn();

    function TestComp() {
      const hook = useConnectSettings("proj-test-1", "Admin Hook", { onSuccess });
      capturedHook = hook;
      return null;
    }

    renderToStaticMarkup(React.createElement(TestComp));

    expect(capturedHook).not.toBeNull();
    if (!capturedHook) return;

    expect((capturedHook as ReturnType<typeof useConnectSettings>).settings).toEqual({
      connect: false,
      wall: true,
      rooms: true,
    });
    expect(typeof (capturedHook as ReturnType<typeof useConnectSettings>).toggleConnect).toBe("function");
    expect(typeof (capturedHook as ReturnType<typeof useConnectSettings>).toggleWall).toBe("function");
    expect(typeof (capturedHook as ReturnType<typeof useConnectSettings>).toggleChatRooms).toBe("function");
    expect(typeof (capturedHook as ReturnType<typeof useConnectSettings>).toggleSwitch).toBe("function");
  });
});
