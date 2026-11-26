"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { useConnectPermission } from "@/hooks/use-connect-permission";
import { ConnectSettingsPage } from "@/components/project-admin/connect/settings/settings-page";

export default function ConnectSettingRoute() {
  const { isLoading, isAuthorized } = useConnectPermission({ requireAdmin: true });

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#0b4ea2] mb-2" />
        <p className="text-xs text-slate-500">Loading settings...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div
        role="status"
        className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center"
      >
        <ShieldAlert className="w-6 h-6 text-slate-400 mb-2" />
        <p className="text-sm font-semibold text-slate-700">Admin access required</p>
        <p className="text-xs text-slate-500 mt-1">
          Connect Settings is limited to project admins.
        </p>
      </div>
    );
  }

  return <ConnectSettingsPage />;
}
