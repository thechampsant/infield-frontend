"use client";

import React from "react";

interface SettingsTabProps {
  projectName: string;
  connectEnabled: boolean;
  wallEnabled: boolean;
  chatRoomsEnabled: boolean;
  onToggleConnect: () => void;
  onToggleWall: () => void;
  onToggleChatRooms: () => void;
  savingConnect: boolean;
  settingsError: string | null;
}

export function SettingsTab({
  projectName,
  connectEnabled,
  wallEnabled,
  chatRoomsEnabled,
  onToggleConnect,
  onToggleWall,
  onToggleChatRooms,
  savingConnect,
  settingsError,
}: SettingsTabProps) {
  return (
    <div>
      {/* Subheader */}
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-900">
          Connect settings · {projectName}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Changes apply at once and are written to the configuration audit history.
        </p>
      </div>

      {/* Two-card layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Card: Module switches */}
        <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs">
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
                role="switch"
                aria-checked={connectEnabled}
                onClick={onToggleConnect}
                disabled={savingConnect}
                aria-label="Enable Connect module"
                className={`connect-switch ${connectEnabled ? "connect-switch--on" : ""}`}
              >
                <span className="connect-switch-thumb" />
              </button>
            </div>

            {/* Switch 2: Wall */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Wall</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={wallEnabled}
                onClick={onToggleWall}
                className={`connect-switch ${wallEnabled ? "connect-switch--on" : ""}`}
              >
                <span className="connect-switch-thumb" />
              </button>
            </div>

            {/* Switch 3: Chat rooms */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">Chat rooms</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={chatRoomsEnabled}
                onClick={onToggleChatRooms}
                className={`connect-switch ${chatRoomsEnabled ? "connect-switch--on" : ""}`}
              >
                <span className="connect-switch-thumb" />
              </button>
            </div>
          </div>
          {settingsError ? <p role="alert" className="mt-3 text-xs text-red-600">{settingsError}</p> : null}
        </div>

        {/* Right Card: Fixed read-only rules */}
        <div className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Fixed</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The same for every project
            </p>
          </div>

          <div className="divide-y divide-slate-100 mt-5">
            {/* Rule 1 */}
            <div className="py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Who can post and create rooms
              </span>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-50">
                Admin only
              </span>
            </div>

            {/* Rule 2 */}
            <div className="py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Reactions on Wall posts
              </span>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-50">
                On
              </span>
            </div>

            {/* Rule 3 */}
            <div className="py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Room messages
              </span>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-50">
                Text only
              </span>
            </div>

            {/* Rule 4 */}
            <div className="py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Members per room
              </span>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-50">
                Up to 250
              </span>
            </div>

            {/* Rule 5 */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Room push</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Members can mute a room
                </div>
              </div>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-50">
                Max 1 per room per 5 min
              </span>
            </div>

            {/* Rule 6 */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Message retention</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Covers the POSH complaint and inquiry window
                </div>
              </div>
              <span className="border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-50">
                Set with legal
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
