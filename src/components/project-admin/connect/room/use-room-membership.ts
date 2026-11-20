"use client";

import { useCallback } from "react";
import type { RoomMessage } from "@/components/project-admin/connect/types";
import type { ProjectUser } from "@/types/project-admin";
import { connectRoomService } from "@/lib/api/connect-room-service";
import { connectWallService } from "@/lib/api/connect-wall-service";
import { projectUsersService } from "@/lib/api/project-users-service";
import { deactivateProjectUser } from "@/lib/project-admin/user-deactivation";
import type { ChatRoom } from "@/components/project-admin/connect/types";

type RoomDetails = Awaited<ReturnType<typeof connectRoomService.getRoomDetails>>;

interface UseRoomMembershipOptions {
  roomId: string | null | undefined;
  projectId?: string;
  accountId?: string;
  onRoomRefreshed: (
    details: RoomDetails,
    messages: RoomMessage[],
    rooms?: ChatRoom[],
  ) => void;
  onEligibleUsersRefreshed?: (users: ProjectUser[]) => void;
}

export function useRoomMembership({
  roomId,
  projectId,
  accountId,
  onRoomRefreshed,
  onEligibleUsersRefreshed,
}: UseRoomMembershipOptions) {
  const refreshRoom = useCallback(async () => {
    if (!roomId) throw new Error("Select a room before changing members.");

    let details: RoomDetails;
    let messages: RoomMessage[];
    try {
      const [roomDetails, messageResult] = await Promise.all([
        connectRoomService.getRoomDetails(roomId, projectId, accountId),
        connectRoomService.getMessages(roomId, { projectId, accountId }),
      ]);
      details = roomDetails;
      messages = messageResult.messages;
    } catch (error) {
      console.warn("Room membership changed, but refreshing room details/messages failed", error);
      return;
    }

    let rooms: ChatRoom[] | undefined;
    try {
      rooms = await connectRoomService.listRooms(projectId, true, accountId);
    } catch (error) {
      console.warn("Room membership changed, but refreshing the room list failed", error);
    }

    onRoomRefreshed(details, messages, rooms);
  }, [roomId, projectId, accountId, onRoomRefreshed]);

  const addMembers = useCallback(async (userIds: string[]) => {
    if (!roomId) throw new Error("Select a room before adding members.");
    await connectRoomService.manageMembers(
      roomId,
      { addMemberUserIds: userIds },
      projectId,
      accountId,
    );
    await refreshRoom();
  }, [roomId, projectId, accountId, refreshRoom]);

  const removeMember = useCallback(async (userId: string) => {
    if (!roomId) throw new Error("Select a room before removing members.");
    await connectRoomService.manageMembers(
      roomId,
      { removeMemberUserIds: [userId] },
      projectId,
      accountId,
    );
    await refreshRoom();
  }, [roomId, projectId, accountId, refreshRoom]);

  const simulateExit = useCallback(async (userId: string, userName: string): Promise<boolean> => {
    const impact = await projectUsersService.getDeactivationImpact(userId).catch(() => null);
    if (impact?.canDeactivate === false) {
      window.alert(impact.message || `${userName} cannot be deactivated right now.`);
      return false;
    }

    const didDeactivate = await deactivateProjectUser(
      userId,
      (message) => window.alert(message),
    );
    if (!didDeactivate) return false;

    connectWallService.clearUsersCache(projectId);
    await refreshRoom();
    if (onEligibleUsersRefreshed) {
      const result = await connectWallService.getActiveProjectUsers(projectId || "", true);
      onEligibleUsersRefreshed(result.data);
    }
    return true;
  }, [projectId, refreshRoom, onEligibleUsersRefreshed]);

  return { addMembers, removeMember, simulateExit, refreshRoom };
}

export type { RoomDetails };
