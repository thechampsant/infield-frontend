"use client";

import Link from "next/link";
import { AlertCircle, SlidersHorizontal } from "lucide-react";
import type { ConnectSettings } from "@/lib/api/connect-config-service";

type ConnectSurface = "wall" | "rooms";

interface ConnectStatusBannerProps {
  surface: ConnectSurface;
  settings: ConnectSettings;
  settingsHref: string;
}

export function ConnectStatusBanner({ surface, settings, settingsHref }: ConnectStatusBannerProps) {
  if (!settings.connect) {
    return (
      <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-2.5">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold">Connect is off for this project.</div>
            <div className="text-xs text-amber-800 mt-0.5">
              Field users can&apos;t see Connect. Posts, rooms, and messages are kept and will reappear when it is switched back on.
            </div>
          </div>
        </div>
        <Link href={settingsHref} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1">
          <SlidersHorizontal size={12} />
          <span>Settings</span>
        </Link>
      </div>
    );
  }

  const enabled = surface === "wall" ? settings.wall : settings.rooms;
  if (enabled) return null;

  const label = surface === "wall" ? "Wall" : "Chat Rooms";
  const description = surface === "wall"
    ? "Field users cannot see the Wall section. Existing posts are kept."
    : "Field users cannot see Chat Rooms. Existing rooms and messages are kept.";

  return (
    <div className="mb-6 p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <AlertCircle size={16} className="text-slate-500" />
        <span><strong>{label} is disabled in Settings.</strong> {description}</span>
      </div>
      <Link href={settingsHref} className="text-blue-600 hover:underline font-bold">Turn on in Settings</Link>
    </div>
  );
}
