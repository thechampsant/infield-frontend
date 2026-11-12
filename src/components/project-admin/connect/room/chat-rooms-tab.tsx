"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Info, Loader2 } from "lucide-react";
import type {
  ChatRoom,
} from "@/components/project-admin/connect/types";
import type { ProjectUser } from "@/types/project-admin";
import { connectRoomService } from "@/lib/api/connect-room-service";
import { useOptionalProjectContext } from "@/lib/project-admin/project-context";
import { CreateRoomModal } from "./create-room-modal";
import type { CreateRoomFormValues } from "./room-schema";

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export interface ChatRoomsTabProps {
  projectId?: string;
  roomsEnabled?: boolean;
  eligibleUsers?: ProjectUser[];
  initialRooms?: ChatRoom[];
  rooms?: ChatRoom[];
}

export function ChatRoomsTab({
  projectId,
  roomsEnabled = true,
  eligibleUsers = [],
  initialRooms,
  rooms: propRooms,
}: ChatRoomsTabProps) {
  const router = useSafeRouter();
  const projectContext = useOptionalProjectContext();
  const accountCode = projectContext?.accountCode;
  const projectCode = projectContext?.projectCode;
  const accountId = (projectContext as unknown as Record<string, string>)?.accountId;

  // Rooms state — purely dynamic, no fake INITIAL_ROOMS data
  const [rooms, setRooms] = useState<ChatRoom[]>(() => propRooms || initialRooms || []);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(projectId));

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // 1. Dynamic fetch of Chat Rooms list (cached & deduplicated)
  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      return;
    }

    async function loadRooms() {
      try {
        setIsLoading(true);
        if (projectId || accountId) {
          connectRoomService.setContext({ projectId, accountId });
        }
        const data = await connectRoomService.listRooms(projectId, false, accountId);
        if (cancelled) return;
        setRooms(data || []);
      } catch (err) {
        if (cancelled) return;
        console.warn("Could not fetch chat rooms from backend", err);
        setRooms(initialRooms || []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [projectId, accountId, initialRooms]);

  // Room details live at the dedicated /connect/room/:id route.
  function handleSelectRoom(roomId: string) {
    if (!accountCode || !projectCode || !router) {
      console.warn("Cannot open room details without project route context.");
      return;
    }
    router.push(`/project-admin/${accountCode}/${projectCode}/connect/room/${roomId}`);
  }

  // Create Room Handler
  async function handleCreateRoom(values: CreateRoomFormValues) {
    try {
      setIsCreatingRoom(true);
      const created = await connectRoomService.createRoom({
        name: values.name,
        memberUserIds: values.memberUserIds,
        projectId,
        accountId,
      });
      if (created) {
        const cId = created._id || created.id;
        setRooms((prev) => [created, ...prev]);
        setIsCreateModalOpen(false);
        if (cId) {
          handleSelectRoom(cId);
        }
      }
    } catch (err) {
      console.warn("Backend create room failed, falling back to local creation", err);
    } finally {
      setIsCreatingRoom(false);
    }
  }

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
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!roomsEnabled}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b4ea2] hover:bg-[#093e82] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create room</span>
        </button>
      </div>

      {/* Feature Disabled Notice */}
      {!roomsEnabled && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-2.5 text-xs text-blue-900 font-medium"
        >
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>Chat rooms are switched off in Settings. Field users don&apos;t see the Rooms tab.</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="border border-slate-200 rounded-xl bg-white p-12 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-medium">Loading chat rooms...</span>
        </div>
      ) : rooms.length === 0 ? (
        /* Empty State */
        <div className="border border-slate-200 rounded-xl bg-white p-12 text-center shadow-xs">
          <p className="text-sm font-bold text-slate-800">No chat rooms yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create a room to start group discussions with your promoters and field team members.
          </p>
          {roomsEnabled && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0b4ea2] hover:bg-[#093e82] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create room</span>
            </button>
          )}
        </div>
      ) : (
        /* Rooms Table */
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
              {rooms.map((room) => {
                const rId = room._id || room.id || "";
                return (
                  <tr
                    key={rId}
                    onClick={() => handleSelectRoom(rId)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectRoom(rId);
                      }
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer focus:bg-slate-50 focus:outline-hidden"
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
              );
            })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRoom}
        eligibleUsers={eligibleUsers}
        isSubmitting={isCreatingRoom}
      />
    </div>
  );
}
