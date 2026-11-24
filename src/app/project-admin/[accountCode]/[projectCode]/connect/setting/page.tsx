"use client";

import { useConnectPermission } from "@/hooks/use-connect-permission";
import { ConnectSettingsPage } from "@/components/project-admin/connect/settings/settings-page";

export default function ConnectSettingRoute() {
  const { isAuthorized } = useConnectPermission({ requireAdmin: true });
  if (!isAuthorized) return null;
  return <ConnectSettingsPage />;
}
