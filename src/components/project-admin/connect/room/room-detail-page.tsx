"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import type {
  ChatRoom,
  RoomMember,
  RoomMessage,
} from "@/components/project-admin/connect/types";
import {
  connectRoomService,
  getRoomInitials,
} from "@/lib/api/connect-room-service";
import { RoomDetail } from "./room-detail";
import { AddMemberModal } from "@/components/project-admin/connect/modals/add-member-modal";
import { useOptionalProjectContext } from "@/lib/project-admin/project-context";
import { projectAdminBase } from "@/lib/nav/nav";
import { connectWallService } from "@/lib/api/connect-wall-service";
import type { ProjectUser } from "@/types/project-admin";
import { useRoomMembership, type RoomDetails } from "./use-room-membership";

export interface RoomDetailPageProps {
  roomId: string;
}

export function RoomDetailPage({ roomId }: RoomDetailPageProps) {
  const router = useRouter();
  const projectContext = useOptionalProjectContext();
  const accountCode = projectContext?.accountCode;
  const projectCode = projectContext?.projectCode;
  const projectId = projectContext?.projectId;
  const accountId = (projectContext as unknown as Record<string, string>)?.accountId;
  const roomsListHref =
    accountCode && projectCode
      ? `${projectAdminBase(accountCode, projectCode)}/connect/room`
      : "";

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<ProjectUser[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const handleMembershipRefresh = useCallback((details: RoomDetails, refreshedMessages: RoomMessage[]) => {
    setMembers(details.members);
    setMessages(refreshedMessages);
    setRoom((prev) => prev ? {
      ...prev,
      id: details.roomId,
      _id: details.roomId,
      name: details.name,
      initials: getRoomInitials(details.name),
      memberCount: details.memberCount,
    } : prev);
  }, []);

  const roomMembership = useRoomMembership({
    roomId,
    projectId,
    accountId,
    onRoomRefreshed: handleMembershipRefresh,
    onEligibleUsersRefreshed: setEligibleUsers,
  });

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    connectWallService.getActiveProjectUsers(projectId).then((result) => {
      if (!cancelled) setEligibleUsers(result.data);
    }).catch((err) => console.warn("Could not fetch project users for room members", err));
    return () => { cancelled = true; };
  }, [projectId]);

  // Fetch real room details & real messages
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    async function loadRoomData() {
      try {
        setIsLoading(true);
        setError(null);

        if (projectId || accountId) {
          connectRoomService.setContext({ projectId, accountId });
        }

        const [detailsResult, msgsResult] = await Promise.allSettled([
          connectRoomService.getRoomDetails(roomId, projectId, accountId),
          connectRoomService.getMessages(roomId, { projectId, accountId }),
        ]);
        if (cancelled) return;

        let chatRoom: ChatRoom | null = null;
        let roomMembers: RoomMember[] = [];
        let roomMsgs: RoomMessage[] = [];

        if (detailsResult.status === "fulfilled") {
          const details = detailsResult.value;
          const msgsList = msgsResult.status === "fulfilled" ? msgsResult.value.messages : [];
          const roomIdStr = details.roomId || roomId;
          chatRoom = {
            id: roomIdStr,
            _id: roomIdStr,
            name: details.name,
            initials: getRoomInitials(details.name),
            memberCount: details.memberCount,
            messageCount: msgsList.length,
            lastActivity:
              msgsList.length > 0
                ? msgsList[msgsList.length - 1].timestamp
                : "Just now",
            tag: "Discussion",
          };
          roomMembers = details.members || [];
          roomMsgs = msgsList;
        } else {
          // If getRoomDetails was rejected, attempt lookup from listRooms
          const cachedRooms = await connectRoomService.listRooms(projectId, false, accountId).catch(() => []);
          const found = cachedRooms.find((r) => r.id === roomId || r._id === roomId);
          if (found) {
            chatRoom = found;
            if (msgsResult.status === "fulfilled") {
              roomMsgs = msgsResult.value.messages;
            }
          } else {
            throw detailsResult.reason || new Error("Failed to load chat room details.");
          }
        }

        setRoom(chatRoom);
        setMembers(roomMembers);
        setMessages(roomMsgs);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load chat room details.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadRoomData();
    return () => {
      cancelled = true;
    };
  }, [roomId, projectId, accountId]);

  function handleBack() {
    if (roomsListHref) {
      router.push(roomsListHref);
    } else {
      router.back();
    }
  }

  async function handleRenameRoom(newName: string) {
    if (!roomId) return;
    try {
      await connectRoomService.renameRoom(roomId, newName, projectId, accountId);
    } catch (err) {
      console.warn("Server rename room failed, updating locally", err);
    } finally {
      setRoom((prev) =>
        prev ? { ...prev, name: newName, initials: getRoomInitials(newName) } : null,
      );
    }
  }

  async function handleDeleteRoom(id: string) {
    try {
      await connectRoomService.deleteRoom(id, projectId, accountId);
    } catch (err) {
      console.warn("Server delete room failed, removing locally", err);
    } finally {
      handleBack();
    }
  }

  async function handleSendMessage(content: string) {
    if (!roomId) return;
    const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newMsg: RoomMessage = {
      id: clientMessageId,
      senderName: "Program Team",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content,
      initials: "PT",
    };

    setMessages((prev) => [...prev, newMsg]);
    setRoom((prev) => (prev ? { ...prev, messageCount: prev.messageCount + 1 } : null));

    try {
      await connectRoomService.sendMessage(roomId, content, clientMessageId, projectId, accountId);
    } catch (err) {
      console.warn("Server send message failed", err);
    }
  }

  async function handleDeleteMessage(msgId: string) {
    if (!roomId) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: "Removed by admin" } : m)),
    );
    try {
      await connectRoomService.deleteMessage(roomId, msgId, projectId, accountId);
    } catch (err) {
      console.warn("Server delete message failed", err);
    }
  }

  async function handleAddMember(users: ProjectUser[]) {
    await roomMembership.addMembers(users.map((user) => user.backendId || user.id));
    setIsAddMemberModalOpen(false);
  }

  async function handleRemoveMember(memberId: string) {
    await roomMembership.removeMember(memberId);
  }

  async function handleSimulateExit(memberId: string) {
    const member = members.find((candidate) => candidate.id === memberId);
    if (!member) throw new Error("Room member could not be found.");
    await roomMembership.simulateExit(memberId, member.name);
  }

  if (isLoading) {
    return (
      <div className="border border-slate-200 rounded-xl bg-white p-16 flex flex-col items-center justify-center text-slate-500 shadow-xs">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2.5" />
        <span className="text-sm font-medium">Loading chat room...</span>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="border border-slate-200 rounded-xl bg-white p-12 text-center shadow-xs">
        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Room not found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {error || "The requested chat room does not exist or has been deleted."}
        </p>
        <button
          type="button"
          onClick={handleBack}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to All rooms</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <RoomDetail
        room={room}
        onBack={handleBack}
        messages={messages}
        members={members}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onAddMember={() => setIsAddMemberModalOpen(true)}
        onRemoveMember={handleRemoveMember}
        onSimulateExit={handleSimulateExit}
        onRenameRoom={handleRenameRoom}
        onDeleteRoom={handleDeleteRoom}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSubmit={handleAddMember}
        eligibleUsers={eligibleUsers}
        existingMemberIds={members.map((member) => member.id)}
        memberCount={room?.memberCount ?? members.length}
        roomName={room?.name}
      />
    </div>
  );
}
