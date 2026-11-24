/**
 * Connect Socket Client — Real-time Socket.IO client for Infield Connect.
 * Follows Infield Connect API Integration Guide:
 *   - Section 2: Features, Roles & Limits
 *   - Section 3 & 4: Context, JWT Authentication & User Room Join
 *   - Section 5: Origin & /connect namespace
 *   - Section 8.4: The Three Real-Time Scenarios (In-Room Streaming, Main Screen Reorder, Cross-Room Activity)
 *   - Section 12 & 18.4: Socket.IO Event Contract & Acknowledgements
 *   - Section 23: Instructions for AI Agents Integrating This API
 */

import { io, type Socket } from "socket.io-client";
import { apiClient } from "./api-client";
import {
  formatRoomDate,
  getRoomInitials,
  type ApiRoom,
} from "./connect-room-service";
import type { RoomMessage } from "@/components/project-admin/connect/types";

// ─────────────────────────────────────────────────────────────
// Event Name Constants (matching CONNECT_SOCKET_EVENTS)
// ─────────────────────────────────────────────────────────────

export const CONNECT_SOCKET_EVENTS = {
  // Client -> Server
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_READ: "room:read",

  // Server -> Client
  MESSAGE_NEW: "message:new",
  ROOM_SUMMARY_UPDATED: "room:summary_updated",
  ROOM_ADDED: "room:added",
  ROOM_UPDATED: "room:updated",
  ROOM_DELETED: "room:deleted",
  ROOM_MEMBER_REMOVED: "room:member_removed",
  MESSAGE_DELETED: "message:deleted",
  BADGE_UPDATE: "badge:update",
  CONNECT_BADGE_UPDATE: "connect:badge_update",
  WALL_BADGE_UPDATE: "wall:badge_update",
  ROOM_BADGE_UPDATE: "room:badge_update",
} as const;

// ─────────────────────────────────────────────────────────────
// Socket Event Payloads
// ─────────────────────────────────────────────────────────────

export interface SocketConnectBadgeUpdatePayload {
  connectCount?: number;
  wallUnseenCount?: number;
  roomUnreadCount?: number;
  increment?: number;
  timestamp?: string | Date;
}

export interface SocketWallBadgeUpdatePayload {
  wallUnseenCount?: number;
  hasUnseenWallPosts?: boolean;
  increment?: number;
  timestamp?: string | Date;
}

export interface SocketRoomBadgeUpdatePayload {
  roomUnreadCount?: number;
  roomMessagesCount?: number;
  unreadRoomsCount?: number;
  timestamp?: string | Date;
}

export interface SocketNewMessagePayload {
  messageId?: string;
  _id?: string;
  id?: string;
  roomId: string;
  senderId?: string | null;
  senderType?: "ADMIN" | "USER" | "SYSTEM";
  senderDisplayName?: string;
  text: string;
  sentAt?: string;
  createdAt?: string;
  isRemoved?: boolean;
  isSystem?: boolean;
  clientMessageId?: string | null;
  isDuplicate?: boolean;
}

export interface SocketMessageDeletedPayload {
  roomId: string;
  messageId: string;
  isRemoved: true;
  text: string;
}

export interface SocketRoomSummaryUpdatedPayload {
  roomId: string;
  lastMessage?: {
    messageId: string;
    text: string;
    senderDisplayName?: string;
    sentAt?: string;
    isRemoved?: boolean;
  };
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface SocketRoomUpdatedPayload {
  roomId: string;
  name: string;
}

export interface SocketRoomDeletedPayload {
  roomId: string;
}

export interface SocketRoomMemberRemovedPayload {
  roomId: string;
}

export interface SocketBadgeUpdatePayload {
  connectCount?: number;
  wallUnseenCount?: number;
  roomUnreadCount?: number;
  roomMessagesCount?: number;
  unreadRoomsCount?: number;
  totalUnreadMessages?: number;
  hasUnseenWallPosts?: boolean;
  timestamp?: string | Date;
}

export interface SocketAckResponse<T = unknown> {
  event?: string;
  data?: T;
  error?: string;
}

// ─────────────────────────────────────────────────────────────
// Socket Origin Resolution
// ─────────────────────────────────────────────────────────────

export function getSocketOrigin(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://services.infield.co.in";
  try {
    const parsed = new URL(apiUrl);
    return parsed.origin;
  } catch {
    return "https://services.infield.co.in";
  }
}

function getAuthToken(): string | null {
  const token =
    apiClient.getAccessToken() ||
    (typeof window !== "undefined" && typeof localStorage !== "undefined"
      ? localStorage.getItem("infield_token")
      : null);
  if (!token) return null;
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

/**
 * Normalizes an incoming Socket.IO message payload into the frontend RoomMessage model.
 */
export function normalizeSocketMessage(msg: SocketNewMessagePayload): RoomMessage {
  const id = msg.messageId || msg._id || msg.id || msg.clientMessageId || `msg-${Date.now()}`;
  const senderDisplayName =
    msg.senderDisplayName || (msg.senderType === "ADMIN" ? "Program Team" : "Member");

  return {
    id,
    senderName: senderDisplayName,
    timestamp: formatRoomDate(msg.sentAt || msg.createdAt),
    content: msg.isRemoved ? "Removed by admin" : msg.text,
    initials: getRoomInitials(senderDisplayName),
    isSystem: Boolean(msg.isSystem || msg.senderType === "SYSTEM"),
    clientMessageId: msg.clientMessageId ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// ConnectSocketClient (Singleton Manager)
// ─────────────────────────────────────────────────────────────

type EventCallback<T = unknown> = (data: T) => void;

class ConnectSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private joinedRooms: Set<string> = new Set();
  private reconnectSubscribers: Set<() => void> = new Set();
  private isConnecting = false;

  /**
   * Initializes or returns the active Socket.IO connection.
   */
  getSocket(): Socket | null {
    if (typeof window === "undefined" && process.env.NODE_ENV !== "test") return null;

    if (!this.socket) {
      const token = getAuthToken();
      if (!token) return null;

      const origin = getSocketOrigin();
      this.isConnecting = true;

      this.socket = io(`${origin}/connect`, {
        transports: ["websocket", "polling"],
        auth: (cb) => {
          const currentToken = getAuthToken();
          cb({ token: currentToken || "" });
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        withCredentials: true,
      });

      this.registerSocketInternalListeners();
    }

    return this.socket;
  }

  /**
   * Ensure the socket is connected.
   */
  connect(): Socket | null {
    const s = this.getSocket();
    if (s && !s.connected) {
      s.connect();
    }
    return s;
  }

  /**
   * Disconnects the socket and clears state.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.joinedRooms.clear();
    this.isConnecting = false;
  }

  /**
   * Check connection status.
   */
  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  /**
   * Join a chat room over Socket.IO (Scenario 1: Direct In-Room Streaming).
   */
  async joinRoom(roomId: string): Promise<boolean> {
    if (!roomId) return false;
    this.joinedRooms.add(roomId);

    const s = this.connect();
    if (!s) return false;

    return new Promise((resolve) => {
      s.emit(CONNECT_SOCKET_EVENTS.ROOM_JOIN, { roomId }, (ack?: SocketAckResponse<{ roomId: string }>) => {
        if (ack?.error) {
          console.warn(`[ConnectSocket] Failed to join room ${roomId}:`, ack.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  /**
   * Leave a chat room over Socket.IO when navigating away.
   */
  leaveRoom(roomId: string): void {
    if (!roomId) return;
    this.joinedRooms.delete(roomId);

    if (this.socket?.connected) {
      this.socket.emit(CONNECT_SOCKET_EVENTS.ROOM_LEAVE, { roomId });
    }
  }

  /**
   * Advance read watermark silently (auto mark-read).
   */
  markRoomRead(roomId: string, lastReadMessageId?: string): void {
    if (!roomId) return;
    const s = this.connect();
    if (!s) return;
    s.emit(CONNECT_SOCKET_EVENTS.ROOM_READ, {
      roomId,
      ...(lastReadMessageId ? { lastReadMessageId } : {}),
    });
  }

  /**
   * Subscribe to a typed server event. Returns an unsubscribe cleanup callback.
   */
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(callback as EventCallback);

    // Ensure socket is initialized and listening
    this.connect();

    return () => {
      set.delete(callback as EventCallback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Subscribe to reconnect events for REST history reconciliation.
   */
  onReconnect(callback: () => void): () => void {
    this.reconnectSubscribers.add(callback);
    return () => {
      this.reconnectSubscribers.delete(callback);
    };
  }

  private dispatch<T>(event: string, data: T): void {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return;
    for (const listener of set) {
      try {
        listener(data);
      } catch (err) {
        console.error(`[ConnectSocket] Error in listener for ${event}:`, err);
      }
    }
  }

  private registerSocketInternalListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.isConnecting = false;

      // Re-join all active rooms upon connection or reconnection
      for (const roomId of this.joinedRooms) {
        this.socket?.emit(CONNECT_SOCKET_EVENTS.ROOM_JOIN, { roomId });
      }

      // Notify reconciliation listeners
      for (const subscriber of this.reconnectSubscribers) {
        try {
          subscriber();
        } catch (err) {
          console.error("[ConnectSocket] Reconnect subscriber error:", err);
        }
      }
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnecting = false;
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, reconnect manually
        this.socket?.connect();
      }
    });

    this.socket.on("connect_error", (error) => {
      this.isConnecting = false;
      console.warn("[ConnectSocket] Connection error:", error.message);
    });

    // Wire up server-to-client events from the guide
    this.socket.on(CONNECT_SOCKET_EVENTS.MESSAGE_NEW, (data: SocketNewMessagePayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.MESSAGE_NEW, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.MESSAGE_DELETED, (data: SocketMessageDeletedPayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.MESSAGE_DELETED, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.ROOM_SUMMARY_UPDATED, (data: SocketRoomSummaryUpdatedPayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.ROOM_SUMMARY_UPDATED, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.ROOM_ADDED, (data: ApiRoom) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.ROOM_ADDED, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.ROOM_UPDATED, (data: SocketRoomUpdatedPayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.ROOM_UPDATED, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.ROOM_DELETED, (data: SocketRoomDeletedPayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.ROOM_DELETED, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, (data: SocketRoomMemberRemovedPayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.BADGE_UPDATE, (data: SocketBadgeUpdatePayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.BADGE_UPDATE, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.CONNECT_BADGE_UPDATE, (data: SocketConnectBadgeUpdatePayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.CONNECT_BADGE_UPDATE, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.WALL_BADGE_UPDATE, (data: SocketWallBadgeUpdatePayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.WALL_BADGE_UPDATE, data);
    });

    this.socket.on(CONNECT_SOCKET_EVENTS.ROOM_BADGE_UPDATE, (data: SocketRoomBadgeUpdatePayload) => {
      this.dispatch(CONNECT_SOCKET_EVENTS.ROOM_BADGE_UPDATE, data);
    });
  }
}

export const connectSocketClient = new ConnectSocketClient();
