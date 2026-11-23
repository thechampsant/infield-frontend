/**
 * Connect Room Service — API integration for Connect Chat Rooms.
 * Follows Infield Connect API Integration Guide (Sections 6, 7, 17.3).
 */

import { getInitialsColor } from "@/components/project-admin/connect/utils";
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
  membershipSource?: 'rule' | 'hand';
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
  membershipType?: 'fixed' | 'rule';
  membershipSummary?: string;
  waitingCount?: number;
  needsAttention?: boolean;
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
  membershipType?: 'fixed' | 'rule';
  membershipRule?: MembershipRuleInput;
  projectId?: string;
  accountId?: string;
}

export interface MembershipRuleInput {
  filters: Array<{ fieldKey: string; source: 'user' | 'store' | 'designation' | 'manager'; values: string[] }>;
  reportingManagerIds: string[];
  reportingScope: 'direct' | 'subtree';
  includeReportingManagers: boolean;
  addedByHandUserIds: string[];
  keptOutByHandUserIds?: string[];
}

export interface MembershipRuleOption { value: string; count: number }
export interface MembershipRuleOptions {
  designation: { key: string; label: string; source: string; options: MembershipRuleOption[] };
  managers: Array<{ userId: string; name: string; designation: string; count: number; left?: boolean }>;
  storeFields: Array<{ key: string; label: string; source: string; options: MembershipRuleOption[] }>;
  userFields: Array<{ key: string; label: string; source: string; options: MembershipRuleOption[] }>;
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
const roomCacheVersions = new Map<string, number>();

function invalidateRoomCache(cacheKey: string): void {
  roomCacheVersions.set(cacheKey, (roomCacheVersions.get(cacheKey) || 0) + 1);
  roomsCache.delete(cacheKey);
  inFlightRooms.delete(cacheKey);
}

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
    membershipType: raw.membershipType || 'fixed',
    membershipSummary: raw.membershipSummary,
    waitingCount: raw.waitingCount || 0,
    needsAttention: Boolean(raw.needsAttention),
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

    const cacheVersion = roomCacheVersions.get(cacheKey) || 0;
    const fetchPromise = (async () => {
      try {
        const res = await apiClient.get<{ rooms?: ApiRoom[] } | ApiRoom[]>(ROOMS_BASE);
        const rawList = Array.isArray(res) ? res : res.rooms || [];
        const normalized = rawList.map(normalizeChatRoom);

        // A room read or send can invalidate this request while it is pending.
        // Don't let a stale response repopulate the room-list cache afterward.
        if ((roomCacheVersions.get(cacheKey) || 0) === cacheVersion) {
          roomsCache.set(cacheKey, { data: normalized, timestamp: Date.now() });
        }
        return normalized;
      } finally {
        if ((roomCacheVersions.get(cacheKey) || 0) === cacheVersion) {
          inFlightRooms.delete(cacheKey);
        }
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
      membershipType: input.membershipType || 'fixed',
      ...(input.membershipRule ? { membershipRule: input.membershipRule } : {}),
    };
    if (input.projectId) {
      payload.projectId = input.projectId;
    }

    const res = await apiClient.post<ApiRoom>(ROOMS_BASE, payload);
    this.clearCache(input.projectId);
    return normalizeChatRoom(res);
  },

  async getMembershipRuleOptions(roomId?: string): Promise<MembershipRuleOptions> {
    return apiClient.get<MembershipRuleOptions>(`${ROOMS_BASE}/membership-rule/options${roomId ? `?roomId=${encodeURIComponent(roomId)}` : ""}`);
  },

  async previewMembershipRule(rule: MembershipRuleInput) {
    return apiClient.post<{ count: number; userIds: string[]; users: Array<{ userId: string; name: string }> }>(`${ROOMS_BASE}/membership-rule/preview`, rule);
  },

  async getMembershipRule(roomId: string) {
    return apiClient.get<MembershipRuleInput | null>(`${ROOMS_BASE}/${roomId}/membership-rule`);
  },

  async updateMembershipRule(roomId: string, rule: MembershipRuleInput) {
    const result = await apiClient.put(`${ROOMS_BASE}/${roomId}/membership-rule`, rule);
    this.clearCache();
    return result;
  },

  async removeMembershipRule(roomId: string) {
    const result = await apiClient.delete(`${ROOMS_BASE}/${roomId}/membership-rule`);
    this.clearCache();
    return result;
  },

  async allowBackByHand(roomId: string, userId: string) {
    return apiClient.post(`${ROOMS_BASE}/${roomId}/membership-rule/allow-back/${userId}`, {});
  },

  async resolveHeldRemovals(roomId: string, decision: 'remove' | 'keep') {
    return apiClient.patch(`${ROOMS_BASE}/${roomId}/membership-rule/held-removals`, { decision });
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
    membershipType: 'fixed' | 'rule';
    members: RoomMember[];
    keptOutByHand: Array<{ userId: string; name: string }>;
    heldRemovals: Array<{ userId: string; name: string }>;
    removalHoldReason: string | null;
    waitingCount: number;
    needsAttentionReasons: string[];
  }> {
    const res = await apiClient.get<{
      roomId: string;
      name: string;
      memberCount: number;
      isLegalHold?: boolean;
      membershipType?: 'fixed' | 'rule';
      members?: ApiRoomMember[];
      keptOutByHand?: Array<{ userId: string; name: string }>;
      heldRemovals?: Array<{ userId: string; name: string }>;
      removalHoldReason?: string | null;
      waitingCount?: number;
      needsAttentionReasons?: string[];
    }>(`${ROOMS_BASE}/${roomId}`);

    const rawMembers = res.members || [];
    const members: RoomMember[] = rawMembers.map((m, index) => {
      return {
        id: m.userId,
        initials: getRoomInitials(m.name),
        name: m.name,
        role: m.designation || "Brand Ambassador",
        location: m.employeeCode ? `Emp ${m.employeeCode}` : "Project Member",
        hasDemoPhone: index === 0,
        avatarColorClass: getInitialsColor(m.userId || m.name),
        membershipSource: m.membershipSource || 'hand',
      };
    });

    const id = res.roomId || (res as Record<string, unknown>)._id || (res as Record<string, unknown>).id || roomId;

    return {
      roomId: String(id),
      name: res.name,
      memberCount: res.memberCount || members.length,
      isLegalHold: res.isLegalHold ?? false,
      membershipType: res.membershipType || 'fixed',
      members,
      keptOutByHand: res.keptOutByHand || [],
      heldRemovals: res.heldRemovals || [],
      removalHoldReason: res.removalHoldReason || null,
      waitingCount: res.waitingCount || 0,
      needsAttentionReasons: res.needsAttentionReasons || [],
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
    invalidateRoomCache(options.projectId || "default");

    const rawMessages = res.messages || [];
    // The API returns newest-first for cursor pagination. Render a conversation
    // chronologically so the newest message sits at the bottom of the pane.
    const messages: RoomMessage[] = [...rawMessages].reverse().map((m) => ({
      id: m.messageId || m._id || m.id || `msg-${Date.now()}`,
      senderName: m.senderDisplayName || (m.senderType === "ADMIN" ? "Program Team" : "Member"),
      timestamp: formatRoomDate(m.sentAt || m.createdAt),
      content: m.isRemoved ? "Removed by admin" : m.text,
      initials: getRoomInitials(m.senderDisplayName || "PT"),
      isSystem: Boolean(m.isSystem || m.senderType === "SYSTEM"),
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
    invalidateRoomCache(projectId || "default");
    return {
      id: res.messageId || res._id || res.id || `msg-${Date.now()}`,
      senderName: res.senderDisplayName || "Program Team",
      timestamp: formatRoomDate(res.sentAt || res.createdAt),
      content: res.isRemoved ? "Removed by admin" : res.text,
      initials: getRoomInitials(res.senderDisplayName || "PT"),
      isSystem: Boolean(res.isSystem || res.senderType === "SYSTEM"),
      clientMessageId: res.clientMessageId || clientMessageId,
    };
  },

  /**
   * Mark room as read.
   * POST /api/v1/connect/rooms/:roomId/read
   */
  async markRead(
    roomId: string,
    lastReadMessageId?: string,
  ): Promise<{ roomId: string; unreadCount: number }> {
    return apiClient.post<{ roomId: string; unreadCount: number }>(
      `${ROOMS_BASE}/${roomId}/read`,
      lastReadMessageId ? { lastReadMessageId } : {},
    );
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

  async addMembersByFilter(roomId: string, rule: MembershipRuleInput) {
    const result = await apiClient.post(`${ROOMS_BASE}/${roomId}/members/add-by-filter`, rule);
    this.clearCache();
    return result;
  },

  /**
   * Clear in-memory room cache.
   */
  clearCache(projectId?: string): void {
    if (!projectId) {
      const keys = new Set([
        "default",
        ...roomsCache.keys(),
        ...inFlightRooms.keys(),
        ...roomCacheVersions.keys(),
      ]);
      keys.forEach(invalidateRoomCache);
      return;
    }
    invalidateRoomCache(projectId);
  },
};
