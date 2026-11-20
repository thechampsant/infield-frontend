"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useConnectSettings } from "@/hooks/use-connect-settings";
import { SettingsTab } from "./settings/settings-tab";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { projectAdminBase } from "@/lib/nav/nav";
import { ExternalLink } from "lucide-react";

interface ConnectModuleConfigPageProps {
  showBackToModules?: boolean;
}

export function ConnectModuleConfigPage({
  showBackToModules = true,
}: ConnectModuleConfigPageProps) {
  const { projectId, projectName, accountCode, projectCode } = useProjectContext();
  const { user } = useAuth();
  const currentUserName =
    user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Project Admin"
      : "Project Admin";

  const effectiveProjectName = projectName || "Sample Retail Program";
  const base = projectAdminBase(accountCode, projectCode);
  const [toast, setToast] = useState<ToastState | null>(null);

  const {
    settings,
    auditHistory,
    saving,
    error,
    toggleConnect,
    toggleWall,
    toggleChatRooms,
  } = useConnectSettings(projectId, currentUserName, {
    onSuccess: (field, val) => {
      setToast({
        type: "success",
        message: `${field} ${val ? "enabled" : "disabled"}. Changes take effect immediately.`,
      });
    },
  });

  return (
    <div className="w-full pb-16 font-sans text-slate-800">
      {/* Page Header / Breadcrumbs */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            {showBackToModules ? (
              <span className="flex items-center gap-1.5">
                <Link
                  href={`${base}/modules`}
                  className="hover:text-blue-600 transition-colors"
                >
                  PROJECT › MODULES
                </Link>
                <span>›</span>
                <span className="text-slate-700">CONNECT</span>
              </span>
            ) : (
              "PROJECT › MODULES › CONNECT"
            )}
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Connect
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Wall and chat rooms configuration for {effectiveProjectName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`${base}/connect/wall`}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
          >
            <span>Open Wall & Rooms</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* VIEW: SETTINGS */}
      <SettingsTab
        projectName={effectiveProjectName}
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

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
