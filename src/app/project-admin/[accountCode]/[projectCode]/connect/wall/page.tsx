"use client";

import { useConnectPermission } from "@/hooks/use-connect-permission";
import { ConnectWallPage } from "@/components/project-admin/connect/wall/wall-page";

export default function ConnectWallRoute() {
  const { isAuthorized } = useConnectPermission();
  if (!isAuthorized) return null;
  return <ConnectWallPage />;
}
