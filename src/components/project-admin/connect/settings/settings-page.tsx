"use client";

import { useProjectContext } from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useConnectSettings } from "@/hooks/use-connect-settings";
import { SettingsTab } from "./settings-tab";

export function ConnectSettingsPage() {
  const { projectName, projectId } = useProjectContext();
  const { user } = useAuth();
  const currentUserName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Project Admin"
    : "Project Admin";
  const {
    settings,
    auditHistory,
    saving,
    error,
    toggleConnect,
    toggleWall,
    toggleChatRooms,
  } = useConnectSettings(projectId, currentUserName);

  return (
    <div className="w-full pb-12 font-sans text-slate-800">
      <SettingsTab
        projectName={projectName || "Sample Retail Program"}
        connectEnabled={settings.connect}
        wallEnabled={settings.wall}
        chatRoomsEnabled={settings.rooms}
        onToggleConnect={toggleConnect}
        onToggleWall={toggleWall}
        onToggleChatRooms={toggleChatRooms}
        savingConnect={saving}
        settingsError={error}
        auditHistory={auditHistory}
      />
    </div>
  );
}
