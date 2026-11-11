"use client";

import React from "react";
import type { AuditEntry } from "@/types/project-admin";
import { ShieldCheck, Lock } from "lucide-react";
import ConnectConfigurationAuditHistory from "./ConnectConfigurationAuditHistory";

export interface SettingsTabProps {
  projectName: string;
  connectEnabled: boolean;
  wallEnabled: boolean;
  chatRoomsEnabled: boolean;
  onToggleConnect: () => void;
  onToggleWall: () => void;
  onToggleChatRooms: () => void;
  savingConnect?: boolean;
  settingsError?: string | null;
  auditHistory?: AuditEntry[];
}

export function SettingsTab({
  projectName,
  connectEnabled,
  wallEnabled,
  chatRoomsEnabled,
  onToggleConnect,
  onToggleWall,
  onToggleChatRooms,
  savingConnect = false,
  settingsError = null,
  auditHistory = [],
}: SettingsTabProps) {
  const wallOrRoomsDisabled = !connectEnabled || savingConnect;

  return (
    <div className="space-y-6">
      {/* Subheader */}
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Connect settings · {projectName}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Changes apply at once and are written to the configuration audit history.
        </p>
      </div>

      {/* Two-card layout: Module switches & Fixed rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Card: Module switches */}
        <section
          aria-label="Module switches"
          className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs"
        >
          <div>
            <h3 className="text-sm font-bold text-slate-900">Module</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The three switches the Admin controls
            </p>
          </div>

          <div className="divide-y divide-slate-100 mt-5">
            {/* Switch 1: Connect */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Connect</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Shows the Connect tab in the field app
                </div>
              </div>
              <button
                type="button"
                id="s-connect"
                role="switch"
                aria-checked={connectEnabled}
                onClick={onToggleConnect}
                disabled={savingConnect}
                aria-label="Connect"
                className={`connect-switch ${connectEnabled ? "connect-switch--on" : ""}`}
              >
                <span className="connect-switch-thumb" />
              </button>
            </div>

            {/* Switch 2: Wall */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Wall</div>
                {!connectEnabled && (
                  <div className="text-[11px] text-amber-600 mt-0.5">
                    Disabled while Connect is Off
                  </div>
                )}
              </div>
              <button
                type="button"
                id="s-wall"
                role="switch"
                aria-checked={wallEnabled}
                onClick={onToggleWall}
                disabled={wallOrRoomsDisabled}
                aria-label="Wall"
                aria-disabled={wallOrRoomsDisabled}
                className={`connect-switch ${wallEnabled ? "connect-switch--on" : ""} ${wallOrRoomsDisabled ? "connect-switch--disabled opacity-40 cursor-not-allowed" : ""
                  }`}
              >
                <span className="connect-switch-thumb" />
              </button>
            </div>

            {/* Switch 3: Chat Rooms */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Chat Rooms</div>
                {!connectEnabled && (
                  <div className="text-[11px] text-amber-600 mt-0.5">
                    Disabled while Connect is Off
                  </div>
                )}
              </div>
              <button
                type="button"
                id="s-rooms"
                role="switch"
                aria-checked={chatRoomsEnabled}
                onClick={onToggleChatRooms}
                disabled={wallOrRoomsDisabled}
                aria-label="Chat Rooms"
                aria-disabled={wallOrRoomsDisabled}
                className={`connect-switch ${chatRoomsEnabled ? "connect-switch--on" : ""} ${wallOrRoomsDisabled ? "connect-switch--disabled opacity-40 cursor-not-allowed" : ""
                  }`}
              >
                <span className="connect-switch-thumb" />
              </button>
            </div>
          </div>

          {!connectEnabled && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
              <span className="font-semibold">Note:</span>
              <span>
                When Connect is Off, Wall and Chat Rooms switches are disabled. Field users cannot see the Connect tab.
              </span>
            </div>
          )}

          {settingsError ? (
            <p role="alert" className="mt-3 text-xs text-red-600 font-medium">
              {settingsError}
            </p>
          ) : null}
        </section>

        {/* Right Card: Fixed read-only rules */}
        <section
          aria-label="Fixed card"
          className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>Fixed</span>
                <Lock size={13} className="text-slate-400" aria-hidden="true" />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The same for every project · None of them editable
              </p>
            </div>
            <span className="border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 px-2.5 py-0.5 rounded-full">
              Read-only
            </span>
          </div>

          <div className="divide-y divide-slate-100 mt-5">
            {/* Rule 1: Admin-only posting and room creation */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-800">
                Who can post and create rooms
              </span>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 shrink-0">
                Admin-only posting and room creation
              </span>
            </div>

            {/* Rule 2: Reactions on */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-800">
                Reactions on Wall posts
              </span>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 shrink-0">
                Reactions on
              </span>
            </div>

            {/* Rule 3: Text-only room messages */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-800">
                Room messages
              </span>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 shrink-0">
                Text-only room messages
              </span>
            </div>

            {/* Rule 4: Up to 1,000 members per room */}
            <div className="py-3 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold text-slate-800">
                Members per room
              </span>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 shrink-0">
                Up to 1,000 members per room
              </span>
            </div>

            {/* Rule 5: At most one room push per 5 minutes */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-800">Room push</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Members can mute a room
                </div>
              </div>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 shrink-0">
                At most one room push per 5 minutes
              </span>
            </div>

            {/* Rule 6: Every UDF available as a room filter */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-800">Room filters</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Filter members by user attributes
                </div>
              </div>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 shrink-0">
                Every UDF available as a room filter
              </span>
            </div>

            {/* Rule 7: Messages kept indefinitely */}
            <div className="py-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-800">Message retention</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Covers the POSH complaint and inquiry window
                </div>
              </div>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 shrink-0">
                Messages kept indefinitely
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck size={14} className="text-slate-400" />
            <span>Fixed system policy · none of them editable.</span>
          </div>
        </section>
      </div>

      {/* Configuration Audit History Card */}
      {/* <ConnectConfigurationAuditHistory auditHistory={auditHistory} /> */}
    </div>
  );
}
