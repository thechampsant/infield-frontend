"use client";

import { useEffect, useState } from "react";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useConnectSettings } from "@/hooks/use-connect-settings";
import { connectWallService } from "@/lib/api/connect-wall-service";
import type { ProjectUser } from "@/types/project-admin";
import { ChatRoomsTab } from ".";
import { ConnectStatusBanner } from "../connect-status-banner";
import { projectAdminBase } from "@/lib/nav/nav";

export function ConnectRoomPage() {
  const { projectId, accountCode, projectCode } = useProjectContext();
  const { user } = useAuth();
  const currentUserName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Project Admin"
    : "Project Admin";
  const settingsHref = `${projectAdminBase(accountCode, projectCode)}/connect/setting`;
  const { settings } = useConnectSettings(projectId, currentUserName);
  const [eligibleUsers, setEligibleUsers] = useState<ProjectUser[]>([]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    connectWallService.getActiveProjectUsers(projectId).then((result) => {
      if (!cancelled) setEligibleUsers(result.data);
    }).catch((error) => {
      console.warn("Could not fetch project users for chat rooms", error);
    });
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div className="w-full pb-12 font-sans text-slate-800">
      <ConnectStatusBanner surface="rooms" settings={settings} settingsHref={settingsHref} />
      <ChatRoomsTab
        projectId={projectId}
        roomsEnabled={settings.rooms}
        eligibleUsers={eligibleUsers}
      />
    </div>
  );
}
