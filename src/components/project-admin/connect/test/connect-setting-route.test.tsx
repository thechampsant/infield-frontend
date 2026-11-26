import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUseConnectPermission = vi.fn();

vi.mock("@/hooks/use-connect-permission", () => ({
  useConnectPermission: (...args: unknown[]) => mockUseConnectPermission(...args),
}));

vi.mock("@/components/project-admin/connect/settings/settings-page", () => ({
  ConnectSettingsPage: () => <div data-testid="connect-settings-page">Settings Content</div>,
}));

import ConnectSettingRoute from "@/app/project-admin/[accountCode]/[projectCode]/connect/setting/page";

describe("ConnectSettingRoute", () => {
  beforeEach(() => {
    mockUseConnectPermission.mockReset();
  });

  it("renders loading state while auth is loading", () => {
    mockUseConnectPermission.mockReturnValue({
      isLoading: true,
      isAuthorized: false,
      isAdmin: false,
    });

    const html = renderToStaticMarkup(<ConnectSettingRoute />);
    expect(html).toContain("Loading settings...");
    expect(html).not.toContain("Settings Content");
  });

  it("renders admin-limited message when user is not an admin", () => {
    mockUseConnectPermission.mockReturnValue({
      isLoading: false,
      isAuthorized: false,
      isAdmin: false,
    });

    const html = renderToStaticMarkup(<ConnectSettingRoute />);
    expect(html).toContain("Connect Settings is limited to project admins.");
    expect(html).not.toContain("Settings Content");
  });

  it("renders ConnectSettingsPage when user is authorized", () => {
    mockUseConnectPermission.mockReturnValue({
      isLoading: false,
      isAuthorized: true,
      isAdmin: true,
    });

    const html = renderToStaticMarkup(<ConnectSettingRoute />);
    expect(html).toContain("Settings Content");
  });
});
