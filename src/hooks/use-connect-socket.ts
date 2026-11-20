"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  connectSocketClient,
  CONNECT_SOCKET_EVENTS,
  normalizeSocketMessage,
  type SocketNewMessagePayload,
  type SocketMessageDeletedPayload,
  type SocketRoomSummaryUpdatedPayload,
  type SocketRoomUpdatedPayload,
  type SocketRoomDeletedPayload,
  type SocketBadgeUpdatePayload,
} from "@/lib/api/connect-socket-client";
import { normalizeChatRoom, type ApiRoom } from "@/lib/api/connect-room-service";
import type { ChatRoom, RoomMessage } from "@/components/project-admin/connect/types";

// ─────────────────────────────────────────────────────────────
// Hook: useRoomSocket (Scenario 1: Direct In-Room Streaming)
// ─────────────────────────────────────────────────────────────

export interface UseRoomSocketOptions {
  roomId: string;
  onNewMessage?: (message: RoomMessage) => void;
  onMessageDeleted?: (messageId: string) => void;
  onRoomUpdated?: (name: string) => void;
  onRoomDeleted?: () => void;
  onReconnect?: () => void;
}

export function useRoomSocket({
  roomId,
  onNewMessage,
  onMessageDeleted,
  onRoomUpdated,
  onRoomDeleted,
  onReconnect,
}: UseRoomSocketOptions) {
  const onNewMessageRef = useRef(onNewMessage);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onRoomUpdatedRef = useRef(onRoomUpdated);
  const onRoomDeletedRef = useRef(onRoomDeleted);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    onMessageDeletedRef.current = onMessageDeleted;
    onRoomUpdatedRef.current = onRoomUpdated;
    onRoomDeletedRef.current = onRoomDeleted;
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

    // 4. Listen for room rename
    const unsubUpdatedRoom = connectSocketClient.on<SocketRoomUpdatedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_UPDATED,
      (payload) => {
        if (payload.roomId !== roomId) return;
        onRoomUpdatedRef.current?.(payload.name);
      },
    );

    // 5. Listen for room deletion
    const unsubDeletedRoom = connectSocketClient.on<SocketRoomDeletedPayload>(
      CONNECT_SOCKET_EVENTS.ROOM_DELETED,
      (payload) => {
        if (payload.roomId !== roomId) return;
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
  onBadgeUpdate?: (badge: SocketBadgeUpdatePayload) => void;
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
        optionsRef.current.onRoomDeleted?.(payload.roomId);
      },
    );

    const unsubBadge = connectSocketClient.on<SocketBadgeUpdatePayload>(
      CONNECT_SOCKET_EVENTS.BADGE_UPDATE,
      (payload) => {
        optionsRef.current.onBadgeUpdate?.(payload);
      },
    );

    return () => {
      unsubSummary();
      unsubAdded();
      unsubUpdated();
      unsubDeleted();
      unsubBadge();
    };
  }, []);
}
