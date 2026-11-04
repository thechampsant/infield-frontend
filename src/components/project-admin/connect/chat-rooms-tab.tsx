"use client";

import React from "react";
import { Plus } from "lucide-react";
import type { ChatRoom } from "./types";

interface ChatRoomsTabProps {
  rooms: ChatRoom[];
  onCreateRoom: () => void;
  onSelectRoom: (roomId: string) => void;
}

export function ChatRoomsTab({
  rooms,
  onCreateRoom,
  onSelectRoom,
}: ChatRoomsTabProps) {
  return (
    <div>
      {/* Section Subheader */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Chat rooms</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Group conversations for people you pick. Every member can message; members get at most one push per room every 5 minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateRoom}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b4ea2] hover:bg-[#093e82] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create room</span>
        </button>
      </div>

      {/* Rooms Table */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-white">
              <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-5/12">
                ROOM
              </th>
              <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-3/12">
                MEMBERS
              </th>
              <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-2/12">
                MESSAGES
              </th>
              <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-2/12">
                LAST ACTIVITY
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.map((room) => (
              <tr
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 font-extrabold text-xs flex items-center justify-center border border-sky-100 flex-shrink-0">
                      {room.initials}
                    </span>
                    <span className="text-sm font-bold text-slate-900 hover:text-blue-700 transition-colors">
                      {room.name}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      {room.memberCount}
                    </span>
                    {room.hasDemoPhone && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2 py-0.5">
                        incl. demo phone
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3.5 px-5">
                  <span className="text-sm font-semibold text-slate-700">
                    {room.messageCount}
                  </span>
                </td>

                <td className="py-3.5 px-5">
                  <span className="text-sm font-medium text-slate-600">
                    {room.lastActivity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
