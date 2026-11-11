/**
 * Connect Room Service — API integration for Connect Chat Rooms.
 * Follows Infield Connect API Integration Guide (Sections 6, 7, 17.3).
 */

import { apiClient } from "./api-client";
import type { ChatRoom, RoomMember, RoomMessage } from "@/components/project-admin/connect/types";

export const ROOMS_BASE = "/api/v1/connect/rooms";

export interface RoomContextConfig {
  projectId?: string;
  accountId?: string;
}

let defaultRoomContext: RoomContextConfig = {};

/**
 * Configure default projectId and accountId for Connect Room requests.
 */
export function setRoomContext(context: RoomContextConfig): void {
  defaultRoomContext = { ...defaultRoomContext, ...context };
}

/**
 * Get current configured default room context.
 */
export function getRoomContext(): RoomContextConfig {
  return { ...defaultRoomContext };
}

/**
 * Clear configured default room context.
 */
export function clearRoomContext(): void {
  defaultRoomContext = {};
}

/**
 * Common configuration variable for ROOMS_BASE that bundles the endpoint base path
 * and common headers generator passing projectid and accountid.
 */
export const ROOMS_BASE_CONFIG = {
  url: ROOMS_BASE,
  setContext: setRoomContext,
  getContext: getRoomContext,
  clearContext: clearRoomContext,
};

// In-memory cache TTL: 60 seconds
const CACHE_TTL_MS = 60_000;

export interface ApiRoomMember {
  userId: string;
  name: string;
  employeeCode?: string;
  designation?: string;
  phoneNumber?: string;
  joinedAt?: string;
  isMuted?: boolean;
}

export interface ApiRoomLastMessage {
  messageId: string;
  text: string;
  senderDisplayName?: string;
  sentAt?: string;
  isRemoved?: boolean;
}

export interface ApiRoom {
  roomId?: string;
  _id?: string;
  id?: string;
  name: string;
  memberCount?: number;
  members?: Array<ApiRoomMember | string>;
  lastMessage?: ApiRoomLastMessage | null;
  lastMessageAt?: string;
  unreadCount?: number;
  lastReadMessageId?: string | null;
  isMuted?: boolean;
  isLegalHold?: boolean;
  joinedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  messageCount?: number;
}

export interface ApiMessage {
  messageId?: string;
  _id?: string;
  id?: string;
  roomId: string;
  senderId?: string | null;
  senderType?: "ADMIN" | "USER" | "SYSTEM";
  senderDisplayName?: string;
  text: string;
  isRemoved?: boolean;
  isSystem?: boolean;
  sentAt?: string;
  createdAt?: string;
  clientMessageId?: string | null;
}

export interface CreateRoomInput {
  name: string;
  memberUserIds: string[];
  projectId?: string;
  accountId?: string;
}

export interface EligibleMember {
  userId: string;
  name: string;
  employeeCode?: string;
  designation?: string;
}

export interface RoomCacheEntry {
  data: ChatRoom[];
  timestamp: number;
}

const roomsCache = new Map<string, RoomCacheEntry>();
const inFlightRooms = new Map<string, Promise<ChatRoom[]>>();

/**
 * Derives uppercase initials from a room or user name (e.g. "Mumbai South" -> "MS").
 */
export function getRoomInitials(name: string): string {
  if (!name || !name.trim()) return "RM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return ((parts[0][0] || "") + (parts[1][0] || "")).toUpperCase();
}

/**
 * Format ISO date string into human-friendly room activity timestamp.
 */
export function formatRoomDate(isoString?: string): string {
  if (!isoString) return "Just now";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Just now";

    const now = new Date();
    const isSameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isSameDay) {
      return timeStr;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const dayName = date.toLocaleDateString([], { weekday: "short" });
      return `${dayName}, ${timeStr}`;
    }

    const datePart = date.toLocaleDateString([], { day: "numeric", month: "short" });
    return `${datePart}, ${timeStr}`;
  } catch {
    return "Just now";
  }
}

/**
 * Normalize an API room document into the frontend ChatRoom model.
 */
export function normalizeChatRoom(raw: ApiRoom): ChatRoom {
  const id = raw.roomId || raw._id || raw.id || `room-${Date.now()}`;
  const name = raw.name || "Untitled Room";
  const initials = getRoomInitials(name);
  const memberCount =
    typeof raw.memberCount === "number"
      ? raw.memberCount
      : Array.isArray(raw.members)
        ? raw.members.length
        : 2;

  const rawLastTime = raw.lastMessageAt || raw.lastMessage?.sentAt || raw.updatedAt || raw.createdAt;
  const lastActivity = formatRoomDate(rawLastTime);
  const messageCount = raw.messageCount ?? (raw.lastMessage ? 1 : 0);

  return {
    _id: id,
    id,
    initials,
    name,
    memberCount,
    hasDemoPhone: Boolean((raw as unknown as Record<string, unknown>).hasDemoPhone),
    messageCount,
    lastActivity,
    tag: "Discussion",
  };
}

export const connectRoomService = {
  /**
   * Set global project and account context for all room API calls.
   */
  setContext: setRoomContext,

  /**
   * Get current room context.
   */
  getContext: getRoomContext,

  /**
   * Clear current room context.
   */
  clearContext: clearRoomContext,

  /**
   * Fetch caller's active rooms with in-memory caching (60s TTL) and in-flight request deduplication.
   * GET /api/v1/connect/rooms
   */
  async listRooms(
    projectId?: string,
    forceRefresh = false,
    accountId?: string,
  ): Promise<ChatRoom[]> {
    const cacheKey = projectId || "default";

    if (!forceRefresh) {
      const cached = roomsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
      const pending = inFlightRooms.get(cacheKey);
      if (pending) {
        return pending;
      }
    }

    const fetchPromise = (async () => {
      try {
        const res = await apiClient.get<{ rooms?: ApiRoom[] } | ApiRoom[]>(ROOMS_BASE);
        const rawList = Array.isArray(res) ? res : res.rooms || [];
        const normalized = rawList.map(normalizeChatRoom);

        roomsCache.set(cacheKey, { data: normalized, timestamp: Date.now() });
        return normalized;
      } finally {
        inFlightRooms.delete(cacheKey);
      }
    })();

    inFlightRooms.set(cacheKey, fetchPromise);
    return fetchPromise;
  },

  /**
   * Create a new chat room.
   * POST /api/v1/connect/rooms
   */
  async createRoom(input: CreateRoomInput): Promise<ChatRoom> {
    const payload: Record<string, unknown> = {
      name: input.name.trim(),
      memberUserIds: input.memberUserIds,
    };
    if (input.projectId) {
      payload.projectId = input.projectId;
    }

    const res = await apiClient.post<ApiRoom>(ROOMS_BASE, payload);
    this.clearCache(input.projectId);
    return normalizeChatRoom(res);
  },

  /**
   * Rename an existing chat room.
   * PATCH /api/v1/connect/rooms/:roomId
   */
  async renameRoom(
    roomId: string,
    name: string,
    projectId?: string,
    accountId?: string,
  ): Promise<{ roomId: string; name: string }> {
    const res = await apiClient.patch<{ roomId: string; name: string }>(
      `${ROOMS_BASE}/${roomId}`,
      { name: name.trim() },
    );
    this.clearCache(projectId);
    return res;
  },

  /**
   * Soft-delete a chat room.
   * DELETE /api/v1/connect/rooms/:roomId
   */
  async deleteRoom(
    roomId: string,
    projectId?: string,
    accountId?: string,
  ): Promise<boolean> {
    await apiClient.delete<{ roomId: string; deleted: boolean }>(
      `${ROOMS_BASE}/${roomId}`,
    );
    this.clearCache(projectId);
    return true;
  },

  /**
   * Fetch room details and active member roster.
   * GET /api/v1/connect/rooms/:roomId
   */
  async getRoomDetails(
    roomId: string,
    projectId?: string,
    accountId?: string,
  ): Promise<{
    roomId: string;
    name: string;
    memberCount: number;
    isLegalHold: boolean;
    members: RoomMember[];
  }> {
    const res = await apiClient.get<{
      roomId: string;
      name: string;
      memberCount: number;
      isLegalHold?: boolean;
      members?: ApiRoomMember[];
    }>(`${ROOMS_BASE}/${roomId}`);

    const rawMembers = res.members || [];
    const members: RoomMember[] = rawMembers.map((m, index) => {
      const colors = ["bg-blue-900", "bg-emerald-600", "bg-indigo-600", "bg-sky-600", "bg-amber-700"];
      return {
        id: m.userId,
        initials: getRoomInitials(m.name),
        name: m.name,
        role: m.designation || "Brand Ambassador",
        location: m.employeeCode ? `Emp ${m.employeeCode}` : "Project Member",
        hasDemoPhone: index === 0,
        avatarColorClass: colors[index % colors.length],
      };
    });

    const id = res.roomId || (res as Record<string, unknown>)._id || (res as Record<string, unknown>).id || roomId;

    return {
      roomId: String(id),
      name: res.name,
      memberCount: res.memberCount || members.length,
      isLegalHold: res.isLegalHold ?? false,
      members,
    };
  },

  /**
   * Fetch paginated message history.
   * GET /api/v1/connect/rooms/:roomId/messages?limit=50&cursor=<messageObjectId>
   */
  async getMessages(
    roomId: string,
    options: {
      limit?: number;
      cursor?: string;
      projectId?: string;
      accountId?: string;
    } = {},
  ): Promise<{ messages: RoomMessage[]; nextCursor: string | null; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.cursor) params.set("cursor", options.cursor);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await apiClient.get<{
      messages: ApiMessage[];
      nextCursor?: string | null;
      hasMore?: boolean;
    }>(`${ROOMS_BASE}/${roomId}/messages${qs}`);

    const rawMessages = res.messages || [];
    const messages: RoomMessage[] = rawMessages.map((m) => ({
      id: m.messageId || m._id || m.id || `msg-${Date.now()}`,
      senderName: m.senderDisplayName || (m.senderType === "ADMIN" ? "Program Team" : "Member"),
      timestamp: formatRoomDate(m.sentAt || m.createdAt),
      content: m.isRemoved ? "Removed by admin" : m.text,
      initials: getRoomInitials(m.senderDisplayName || "PT"),
    }));

    return {
      messages,
      nextCursor: res.nextCursor ?? null,
      hasMore: res.hasMore ?? false,
    };
  },

  /**
   * Send a message to a room.
   * POST /api/v1/connect/rooms/:roomId/messages
   */
  async sendMessage(
    roomId: string,
    text: string,
    clientMessageId?: string,
    projectId?: string,
    accountId?: string,
  ): Promise<RoomMessage> {
    const body: Record<string, unknown> = {
      text: text.trim(),
    };
    if (clientMessageId) {
      body.clientMessageId = clientMessageId;
    }

    const res = await apiClient.post<ApiMessage>(`${ROOMS_BASE}/${roomId}/messages`, body);
    return {
      id: res.messageId || res._id || res.id || `msg-${Date.now()}`,
      senderName: res.senderDisplayName || "Program Team",
      timestamp: formatRoomDate(res.sentAt || res.createdAt),
      content: res.isRemoved ? "Removed by admin" : res.text,
      initials: getRoomInitials(res.senderDisplayName || "PT"),
    };
  },

  /**
   * Delete an inappropriate message for everyone.
   * DELETE /api/v1/connect/rooms/:roomId/messages/:messageId
   */
  async deleteMessage(
    roomId: string,
    messageId: string,
    projectId?: string,
    accountId?: string,
  ): Promise<boolean> {
    await apiClient.delete<{ messageId: string; isRemoved: boolean }>(
      `${ROOMS_BASE}/${roomId}/messages/${messageId}`,
    );
    return true;
  },

  /**
   * Search active project users eligible to be added to rooms.
   * GET /api/v1/connect/rooms/eligible-members?query=<text>&roomId=<optional>&limit=20
   */
  async searchEligibleMembers(
    query: string,
    roomId?: string,
    limit = 20,
    projectId?: string,
    accountId?: string,
  ): Promise<EligibleMember[]> {
    const params = new URLSearchParams({ query: query.trim(), limit: String(limit) });
    if (roomId) params.set("roomId", roomId);

    const res = await apiClient.get<{ members: EligibleMember[] }>(
      `${ROOMS_BASE}/eligible-members?${params.toString()}`,
    );
    return res.members || [];
  },

  /**
   * Manage room members (add or remove).
   * PATCH /api/v1/connect/rooms/:roomId/members
   */
  async manageMembers(
    roomId: string,
    payload: { addMemberUserIds?: string[]; removeMemberUserIds?: string[] },
    projectId?: string,
    accountId?: string,
  ): Promise<{ roomId: string; memberCount: number }> {
    return apiClient.patch<{ roomId: string; memberCount: number }>(
      `${ROOMS_BASE}/${roomId}/members`,
      payload,
    );
  },

  /**
   * Clear in-memory room cache.
   */
  clearCache(projectId?: string): void {
    if (!projectId) {
      roomsCache.clear();
      return;
    }
    roomsCache.delete(projectId);
  },
};

