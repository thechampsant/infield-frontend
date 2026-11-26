"use client";

import { useEffect, useState } from "react";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useConnectPermission } from "@/hooks/use-connect-permission";
import { useConnectSettings } from "@/hooks/use-connect-settings";
import { connectWallService } from "@/lib/api/connect-wall-service";
import type { ProjectUser } from "@/types/project-admin";
import { ChatRoomsTab } from ".";
import { ConnectStatusBanner } from "../connect-status-banner";
import { projectAdminBase } from "@/lib/nav/nav";

export function ConnectRoomPage() {
  const { projectId, accountCode, projectCode } = useProjectContext();
  const { isAdmin, currentUserName } = useConnectPermission();
  const settingsHref = `${projectAdminBase(accountCode, projectCode)}/connect/setting`;
  const { settings } = useConnectSettings(projectId, currentUserName);
  const [eligibleUsers, setEligibleUsers] = useState<ProjectUser[]>([]);

  useEffect(() => {
    if (!projectId || !isAdmin) return;
    let cancelled = false;
    connectWallService.getActiveProjectUsers(projectId).then((result) => {
      if (!cancelled) setEligibleUsers(result.data);
    }).catch((error) => {
      console.warn("Could not fetch project users for chat rooms", error);
    });
    return () => { cancelled = true; };
  }, [projectId, isAdmin]);

  return (
    <div className="w-full pb-12 font-sans text-slate-800">
      {isAdmin && <ConnectStatusBanner surface="rooms" settings={settings} settingsHref={settingsHref} />}
      <ChatRoomsTab
        projectId={projectId}
        roomsEnabled={settings.rooms}
        eligibleUsers={eligibleUsers}
        isAdmin={isAdmin}
      />
    </div>
  );
}
