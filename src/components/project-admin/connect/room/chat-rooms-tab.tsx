"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Info, Loader2 } from "lucide-react";
import type {
  ChatRoom,
} from "@/components/project-admin/connect/types";
import type { ProjectUser } from "@/types/project-admin";
import {
  connectRoomService,
  formatRoomDate,
  getRoomInitials,
} from "@/lib/api/connect-room-service";
import { useOptionalProjectContext } from "@/lib/project-admin/project-context";
import { CreateRoomModal } from "../modals/create-room-modal";
import type { CreateRoomFormValues } from "./room-schema";
import type { MembershipRuleOptions } from "@/lib/api/connect-room-service";
import { useRoomsListSocket } from "@/hooks/use-connect-socket";
import { connectSocketClient } from "@/lib/api/connect-socket-client";

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

function dedupeRooms(list: ChatRoom[]): ChatRoom[] {
  const seen = new Set<string>();
  const result: ChatRoom[] = [];
  for (const room of list) {
    const id = room._id || room.id;
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(room);
    }
  }
  return result;
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
  const [rooms, setRooms] = useState<ChatRoom[]>(() => dedupeRooms(propRooms || initialRooms || []));
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(projectId));

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [ruleOptions, setRuleOptions] = useState<MembershipRuleOptions | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [removalNotice, setRemovalNotice] = useState<string | null>(null);

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
        const data = await connectRoomService.listRooms(projectId, true, accountId);
        if (cancelled) return;
        setRooms(dedupeRooms(data || []));
        const offlineRemovals = connectRoomService.consumePendingOfflineRemovals();
        if (offlineRemovals.length > 0) {
          const names = offlineRemovals
            .map((r) => r.room_name || r.roomName || "a chat room")
            .filter(Boolean)
            .join(", ");
          setRemovalNotice(`You were removed from ${names}`);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("Could not fetch chat rooms from backend", err);
        setRooms(dedupeRooms(initialRooms || []));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [projectId, accountId, initialRooms]);

  useEffect(() => {
    if (!projectId) return;
    connectRoomService.getMembershipRuleOptions().then(setRuleOptions).catch((error) => console.warn("Could not load membership rule options", error));
  }, [projectId]);

  // 2. Real-time Socket.IO integration for rooms list (Guide Section 18.4 Scenario 2 & 3)
  useRoomsListSocket({
    onSummaryUpdated: (summary) => {
      setRooms((prev) => {
        const index = prev.findIndex(
          (r) => (r.id && r.id === summary.roomId) || (r._id && r._id === summary.roomId),
        );
        if (index === -1) return prev;
        const target = prev[index];
        const lastTime = summary.lastMessageAt || summary.lastMessage?.sentAt;
        const nextUnread = typeof summary.unreadCount === "number"
          ? summary.unreadCount
          : (target.unreadCount || 0) + 1;
        const updated: ChatRoom = {
          ...target,
          lastActivity: formatRoomDate(lastTime),
          messageCount: target.messageCount + 1,
          unreadCount: nextUnread,
        };
        // Reorder room to top of list smoothly and remove any duplicate occurrences
        const remaining = prev.filter(
          (r, i) => i !== index && (r._id || r.id) !== summary.roomId,
        );
        return [updated, ...remaining];
      });
    },
    onRoomAdded: (newRoom) => {
      setRooms((prev) => {
        const newId = newRoom._id || newRoom.id;
        if (!newId || prev.some((r) => (r._id || r.id) === newId)) {
          return prev;
        }
        return [newRoom, ...prev];
      });
    },
    onRoomUpdated: (update) => {
      setRooms((prev) =>
        prev.map((r) =>
          (r.id && r.id === update.roomId) || (r._id && r._id === update.roomId)
            ? {
                ...r,
                ...(update.name ? { name: update.name, initials: getRoomInitials(update.name) } : {}),
                ...(typeof update.memberCount === "number" ? { memberCount: update.memberCount } : {}),
              }
            : r,
        ),
      );
    },
    onRoomDeleted: (deletedRoomId) => {
      setRooms((prev) => prev.filter((r) => (r._id || r.id) !== deletedRoomId));
    },
    onRoomMemberRemoved: (payload) => {
      if (payload.roomId) {
        setRooms((prev) => prev.filter((r) => (r._id || r.id) !== payload.roomId));
      }
    },
    onMeRemovedFromRoom: (payload) => {
      const rid = payload.room_id || payload.roomId;
      if (rid) {
        setRooms((prev) => prev.filter((r) => (r._id || r.id) !== rid));
      }
      setRemovalNotice(
        payload.message ||
          `You were removed from ${payload.room_name || payload.roomName || "this room"}`,
      );
    },
  });

  // Room details live at the dedicated /connect/room/:id route.
  function handleSelectRoom(roomId: string) {
    if (!accountCode || !projectCode || !router) {
      console.warn("Cannot open room details without project route context.");
      return;
    }
    // Optimistically clear unread count for this room locally
    setRooms((prev) =>
      prev.map((r) =>
        (r._id && r._id === roomId) || (r.id && r.id === roomId)
          ? { ...r, unreadCount: 0 }
          : r,
      ),
    );
    connectRoomService.markRead(roomId).catch(() => {});
    connectSocketClient.markRoomRead(roomId);
    router.push(`/project-admin/${accountCode}/${projectCode}/connect/room/${roomId}`);
  }

  // Create Room Handler
  async function handleCreateRoom(values: CreateRoomFormValues) {
    try {
      setIsCreatingRoom(true);
      setCreateError(null);
      const created = await connectRoomService.createRoom({
        name: values.name,
        memberUserIds: values.memberUserIds,
        membershipType: values.membershipType,
        membershipRule: values.membershipRule,
        projectId,
        accountId,
      });
      if (created) {
        const cId = created._id || created.id;
        setRooms((prev) => {
          if (cId && prev.some((r) => (r._id || r.id) === cId)) {
            return prev;
          }
          return [created, ...prev];
        });
        setIsCreateModalOpen(false);
        if (cId) {
          handleSelectRoom(cId);
        }
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create this room.");
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
      {removalNotice && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 font-medium"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{removalNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setRemovalNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 text-sm cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

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
                  MEMBERSHIP
                </th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-2/12">
                  MEMBERS
                </th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-2/12">
                  LAST ACTIVITY
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dedupeRooms(rooms).map((room, index) => {
                const rId = room._id || room.id || `room-${index}`;
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
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${(room.unreadCount || 0) > 0 ? "font-extrabold text-slate-950" : "font-bold text-slate-900"} hover:text-blue-700 transition-colors`}>
                          {room.name}
                        </span>
                        {(room.unreadCount || 0) > 0 && (
                          <span
                            aria-label={`${room.unreadCount} unread message${room.unreadCount === 1 ? "" : "s"}`}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 shadow-xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            <span>{room.unreadCount} new</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-5">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${room.membershipType === "rule" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-700"}`}>{room.membershipType === "rule" ? "Follows a rule" : "Fixed list"}</span>
                    {room.membershipSummary && <p className="mt-1 text-[11px] text-slate-500">{room.membershipSummary}</p>}
                    {room.needsAttention && <span className="mt-1 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Needs attention</span>}
                    {room.waitingCount ? <p className="mt-1 text-[11px] text-slate-500">{room.waitingCount} waiting for a place</p> : null}
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
        projectId={projectId}
        ruleOptions={ruleOptions}
        error={createError}
      />
    </div>
  );
}
