"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  connectSocketClient,
  CONNECT_SOCKET_EVENTS,
  normalizeSocketMessage,
  type SocketNewMessagePayload,
  type SocketMessageDeletedPayload,
  type SocketRoomSummaryUpdatedPayload,
  type SocketRoomUpdatedPayload,
  type SocketRoomDeletedPayload,
  type SocketRoomMemberRemovedPayload,
  type SocketBadgeUpdatePayload,
  type SocketConnectBadgeUpdatePayload,
  type SocketWallBadgeUpdatePayload,
  type SocketRoomBadgeUpdatePayload,
  type SocketMeRemovedFromRoomPayload,
} from "@/lib/api/connect-socket-client";
import {
  connectRoomService,
  normalizeChatRoom,
  type ApiRoom,
} from "@/lib/api/connect-room-service";
import { connectBadgeService } from "@/lib/api/connect-badge-service";
import type { ChatRoom, RoomMessage } from "@/components/project-admin/connect/types";

// ─────────────────────────────────────────────────────────────
// Hook: useRoomSocket (Scenario 1: Direct In-Room Streaming)
// ─────────────────────────────────────────────────────────────

export interface UseRoomSocketOptions {
  roomId: string;
  onNewMessage?: (message: RoomMessage) => void;
  onMessageDeleted?: (messageId: string) => void;
  onRoomUpdated?: (nameOrPayload: string | SocketRoomUpdatedPayload) => void;
  onRoomDeleted?: () => void;
  onMeRemovedFromRoom?: (payload: SocketMeRemovedFromRoomPayload) => void;
  onReconnect?: () => void;
}

export function useRoomSocket({
  roomId,
  onNewMessage,
  onMessageDeleted,
  onRoomUpdated,
  onRoomDeleted,
  onMeRemovedFromRoom,
  onReconnect,
}: UseRoomSocketOptions) {
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onRoomUpdatedRef = useRef(onRoomUpdated);
  const onRoomDeletedRef = useRef(onRoomDeleted);
  const onMeRemovedFromRoomRef = useRef(onMeRemovedFromRoom);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageDeletedRef.current = onMessageDeleted;
    onRoomUpdatedRef.current = onRoomUpdated;
    onRoomDeletedRef.current = onRoomDeleted;
    onMeRemovedFromRoomRef.current = onMeRemovedFromRoom;
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => {
    if (!roomId) return;

    // 1. Join room on connect / mount
    connectSocketClient.joinRoom(roomId);

    // 2. Listen for new messages (Scenario 1)
    const unsubNewMessage = connectSocketClient.on<SocketNewMessagePayload>(
      CONNECT_SOCKET_EVENTS.MESSAGE_NEW,
      (payload) => {
        if (payload.roomId !== roomId) return;
        const normalized = normalizeSocketMessage(payload);

        // Advance read watermark silently
        const msgId = payload.messageId || payload._id || payload.id;
        if (msgId) {
          connectSocketClient.markRoomRead(roomId, msgId);
        }

        onNewMessageRef.current?.(normalized);
      },
    );

    // 3. Listen for message deletion
    const unsubDeletedMessage = connectSocketClient.on<SocketMessageDeletedPayload>(
      CONNECT_SOCKET_EVENTS.MESSAGE_DELETED,
      (payload) => {
        if (payload.roomId !== roomId) return;
        onMessageDeletedRef.current?.(payload.messageId);
      },
    );

    // 4. Listen for room rename or update
    const unsubUpdatedRoom = connectSocketClient.on<SocketRoomUpdatedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_UPDATED,
      (payload) => {
        if (payload.roomId !== roomId) return;
        onRoomUpdatedRef.current?.(payload.name || payload);
      },
    );

    // 5. Listen for room deletion
    const unsubDeletedRoom = connectSocketClient.on<SocketRoomDeletedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_DELETED,
      (payload) => {
        if (payload.roomId !== roomId) return;
        connectRoomService.clearCache();
        onRoomDeletedRef.current?.();
      },
    );

    // 5b. Listen for current user being removed from room: me-removed-from-room
    const unsubMeRemoved = connectSocketClient.on<SocketMeRemovedFromRoomPayload>(
      CONNECT_SOCKET_EVENTS.ME_REMOVED_FROM_ROOM,
      (payload) => {
        const targetId = payload.room_id || payload.roomId;
        if (targetId !== roomId) return;
        connectRoomService.clearCache();
        onMeRemovedFromRoomRef.current?.(payload);
        onRoomDeletedRef.current?.();
      },
    );

    // 5c. Listen for room:member_removed
    const unsubMemberRemoved = connectSocketClient.on<SocketRoomMemberRemovedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_MEMBER_REMOVED,
      (payload) => {
        if (payload?.roomId !== roomId) return;
        connectRoomService.clearCache();
        onMeRemovedFromRoomRef.current?.({
          room_id: roomId,
          room_name: "",
          roomId,
          roomName: "",
          message: "You were removed from this room",
        });
        onRoomDeletedRef.current?.();
      },
    );

    // 6. Listen for reconnection to reconcile missed messages
    const unsubReconnect = connectSocketClient.onReconnect(() => {
      connectSocketClient.joinRoom(roomId);
      onReconnectRef.current?.();
    });

    return () => {
      unsubNewMessage();
      unsubDeletedMessage();
      unsubUpdatedRoom();
      unsubDeletedRoom();
      unsubMeRemoved();
      unsubMemberRemoved();
      unsubReconnect();
      connectSocketClient.leaveRoom(roomId);
    };
  }, [roomId]);

  const markRead = useCallback(
    (lastReadMessageId?: string) => {
      if (roomId) {
        connectSocketClient.markRoomRead(roomId, lastReadMessageId);
      }
    },
    [roomId],
  );

  return { markRead };
}

// ─────────────────────────────────────────────────────────────
// Hook: useRoomsListSocket (Scenario 2: Main Screen Reorder & Updates)
// ─────────────────────────────────────────────────────────────

export interface UseRoomsListSocketOptions {
  onSummaryUpdated?: (summary: SocketRoomSummaryUpdatedPayload) => void;
  onRoomAdded?: (room: ChatRoom) => void;
  onRoomUpdated?: (update: SocketRoomUpdatedPayload) => void;
  onRoomDeleted?: (roomId: string) => void;
  onRoomMemberRemoved?: (payload: { roomId: string }) => void;
  onMeRemovedFromRoom?: (payload: SocketMeRemovedFromRoomPayload) => void;
  onBadgeUpdate?: (badge: SocketBadgeUpdatePayload) => void;
  onConnectBadgeUpdate?: (badge: SocketConnectBadgeUpdatePayload) => void;
  onWallBadgeUpdate?: (badge: SocketWallBadgeUpdatePayload) => void;
  onRoomBadgeUpdate?: (badge: SocketRoomBadgeUpdatePayload) => void;
}

export function useRoomsListSocket(options: UseRoomsListSocketOptions = {}) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    connectSocketClient.connect();

    const unsubSummary = connectSocketClient.on<SocketRoomSummaryUpdatedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_SUMMARY_UPDATED,
      (payload) => {
        optionsRef.current.onSummaryUpdated?.(payload);
      },
    );

    const unsubAdded = connectSocketClient.on<ApiRoom>(
      CONNECT_SOCKET_EVENTS.ROOM_ADDED,
      (payload) => {
        const normalized = normalizeChatRoom(payload);
        optionsRef.current.onRoomAdded?.(normalized);
      },
    );

    const unsubUpdated = connectSocketClient.on<SocketRoomUpdatedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_UPDATED,
      (payload) => {
        optionsRef.current.onRoomUpdated?.(payload);
      },
    );

    const unsubDeleted = connectSocketClient.on<SocketRoomDeletedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_DELETED,
      (payload) => {
        connectRoomService.clearCache();
        optionsRef.current.onRoomDeleted?.(payload.roomId);
      },
    );

    const unsubRoomMemberRemoved = connectSocketClient.on<SocketRoomMemberRemovedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_MEMBER_REMOVED,
      (payload) => {
        if (payload?.roomId) {
          connectRoomService.clearCache();
          optionsRef.current.onRoomDeleted?.(payload.roomId);
          optionsRef.current.onRoomMemberRemoved?.(payload);
        }
      },
    );

    const unsubBadge = connectSocketClient.on<SocketBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.BADGE_UPDATE,
      (payload) => {
        optionsRef.current.onBadgeUpdate?.(payload);
      },
    );

    const unsubConnectBadge = connectSocketClient.on<SocketConnectBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.CONNECT_BADGE_UPDATE,
      (payload) => {
        optionsRef.current.onConnectBadgeUpdate?.(payload);
      },
    );

    const unsubWallBadge = connectSocketClient.on<SocketWallBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.WALL_BADGE_UPDATE,
      (payload) => {
        optionsRef.current.onWallBadgeUpdate?.(payload);
      },
    );

    const unsubRoomBadge = connectSocketClient.on<SocketRoomBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.ROOM_BADGE_UPDATE,
      (payload) => {
        optionsRef.current.onRoomBadgeUpdate?.(payload);
      },
    );

    const unsubMeRemoved = connectSocketClient.on<SocketMeRemovedFromRoomPayload>(
      CONNECT_SOCKET_EVENTS.ME_REMOVED_FROM_ROOM,
      (payload) => {
        const rid = payload.room_id || payload.roomId;
        if (rid) {
          connectRoomService.clearCache();
          optionsRef.current.onRoomDeleted?.(rid);
          optionsRef.current.onRoomMemberRemoved?.({ roomId: rid });
        }
        optionsRef.current.onMeRemovedFromRoom?.(payload);
      },
    );

    return () => {
      unsubSummary();
      unsubAdded();
      unsubUpdated();
      unsubDeleted();
      unsubRoomMemberRemoved();
      unsubMeRemoved();
      unsubBadge();
      unsubConnectBadge();
      unsubWallBadge();
      unsubRoomBadge();
    };
  }, []);
}

// ─────────────────────────────────────────────────────────────
// Hook: useConnectBadge (Real-time badge counts for Connect, Wall, and Room)
// ─────────────────────────────────────────────────────────────

export interface ConnectBadgeState {
  connectCount: number;
  wallUnseenCount: number;
  roomUnreadCount: number;
  hasUnseenWallPosts: boolean;
  lastWallOpenedAt: string | null;
  isLoading: boolean;
}

export function useConnectBadge(projectId?: string) {
  const [badge, setBadge] = useState<ConnectBadgeState>({
    connectCount: 0,
    wallUnseenCount: 0,
    roomUnreadCount: 0,
    hasUnseenWallPosts: false,
    lastWallOpenedAt: null,
    isLoading: true,
  });

  const fetchBadge = useCallback(async () => {
    try {
      const data = await connectBadgeService.getConnectBadge(projectId);
      if (data) {
        setBadge({
          connectCount: data.connectCount ?? ((data.roomUnreadCount ?? data.totalUnreadMessages ?? 0) + (data.wallUnseenCount ?? 0)),
          wallUnseenCount: data.wallUnseenCount ?? (data.hasUnseenWallPosts ? 1 : 0),
          roomUnreadCount: data.roomUnreadCount ?? data.totalUnreadMessages ?? 0,
          hasUnseenWallPosts: Boolean(data.hasUnseenWallPosts || (data.wallUnseenCount && data.wallUnseenCount > 0)),
          lastWallOpenedAt: data.lastWallOpenedAt ?? null,
          isLoading: false,
        });
      }
    } catch {
      setBadge((prev) => ({ ...prev, isLoading: false }));
    }
  }, [projectId]);

  useEffect(() => {
    fetchBadge();
  }, [fetchBadge]);

  useEffect(() => {
    connectSocketClient.connect();

    // 1. Overall Connect badge event: connect:badge_update
    const unsubConnect = connectSocketClient.on<SocketConnectBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.CONNECT_BADGE_UPDATE,
      (payload) => {
        setBadge((prev) => {
          const nextWall = payload.wallUnseenCount ?? prev.wallUnseenCount;
          const nextRoom = payload.roomUnreadCount ?? prev.roomUnreadCount;
          const nextConnect = payload.connectCount ?? (nextWall + nextRoom);
          return {
            ...prev,
            connectCount: nextConnect,
            wallUnseenCount: nextWall,
            roomUnreadCount: nextRoom,
            hasUnseenWallPosts: nextWall > 0,
          };
        });
      },
    );

    // 2. Wall unseen badge event: wall:badge_update
    const unsubWall = connectSocketClient.on<SocketWallBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.WALL_BADGE_UPDATE,
      (payload) => {
        setBadge((prev) => {
          let nextWall = prev.wallUnseenCount;
          if (payload.wallUnseenCount !== undefined) {
            nextWall = payload.wallUnseenCount;
          } else if (payload.increment) {
            nextWall = prev.wallUnseenCount + payload.increment;
          }
          const nextConnect = nextWall + prev.roomUnreadCount;
          return {
            ...prev,
            wallUnseenCount: nextWall,
            hasUnseenWallPosts: payload.hasUnseenWallPosts ?? (nextWall > 0),
            connectCount: nextConnect,
          };
        });
      },
    );

    // 3. Room unread messages count event: room:badge_update
    const unsubRoom = connectSocketClient.on<SocketRoomBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.ROOM_BADGE_UPDATE,
      (payload) => {
        setBadge((prev) => {
          const nextRoom = payload.roomUnreadCount ?? payload.roomMessagesCount ?? payload.unreadRoomsCount ?? prev.roomUnreadCount;
          const nextConnect = prev.wallUnseenCount + nextRoom;
          return {
            ...prev,
            roomUnreadCount: nextRoom,
            connectCount: nextConnect,
          };
        });
      },
    );

    // 4. Combined badge event: badge:update
    const unsubBadge = connectSocketClient.on<SocketBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.BADGE_UPDATE,
      (payload) => {
        setBadge((prev) => {
          const nextRoom = payload.roomUnreadCount ?? payload.roomMessagesCount ?? payload.unreadRoomsCount ?? payload.totalUnreadMessages ?? prev.roomUnreadCount;
          const nextWall = payload.wallUnseenCount !== undefined ? payload.wallUnseenCount : (payload.hasUnseenWallPosts ? 1 : 0);
          const nextConnect = payload.connectCount ?? (nextRoom + nextWall);
          return {
            ...prev,
            connectCount: nextConnect,
            roomUnreadCount: nextRoom,
            wallUnseenCount: nextWall,
            hasUnseenWallPosts: Boolean(payload.hasUnseenWallPosts || nextWall > 0),
          };
        });
      },
    );

    return () => {
      unsubConnect();
      unsubWall();
      unsubRoom();
      unsubBadge();
    };
  }, []);

  const clearWallUnseen = useCallback(async () => {
    try {
      await connectBadgeService.recordWallOpen(projectId);
      setBadge((prev) => ({
        ...prev,
        wallUnseenCount: 0,
        hasUnseenWallPosts: false,
        connectCount: prev.roomUnreadCount,
      }));
    } catch {
      // non-blocking
    }
  }, [projectId]);

  const clearRoomUnread = useCallback(async (roomId?: string, lastReadMessageId?: string) => {
    try {
      if (roomId) {
        await connectRoomService.markRead(roomId, lastReadMessageId);
        connectSocketClient.markRoomRead(roomId, lastReadMessageId);
      }
      const fresh = await connectBadgeService.getConnectBadge(projectId);
      if (fresh) {
        setBadge({
          connectCount: fresh.connectCount ?? ((fresh.roomUnreadCount ?? fresh.totalUnreadMessages ?? 0) + (fresh.wallUnseenCount ?? 0)),
          wallUnseenCount: fresh.wallUnseenCount ?? (fresh.hasUnseenWallPosts ? 1 : 0),
          roomUnreadCount: fresh.roomUnreadCount ?? fresh.totalUnreadMessages ?? 0,
          hasUnseenWallPosts: Boolean(fresh.hasUnseenWallPosts || (fresh.wallUnseenCount && fresh.wallUnseenCount > 0)),
          lastWallOpenedAt: fresh.lastWallOpenedAt ?? null,
          isLoading: false,
        });
      }
    } catch {
      setBadge((prev) => ({
        ...prev,
        roomUnreadCount: 0,
        connectCount: prev.wallUnseenCount,
      }));
    }
  }, [projectId]);

  return {
    ...badge,
    refresh: fetchBadge,
    clearWallUnseen,
    clearRoomUnread,
  };
}
