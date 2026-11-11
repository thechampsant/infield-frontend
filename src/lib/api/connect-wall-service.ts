/**
 * Connect Wall Service — API integration for Connect Wall feed, publishing, media upload, reach & export.
 * Follows Infield Connect API Integration Guide (Sections 8, 9, 17.2).
 */

import { apiClient } from "./api-client";
import { projectUsersService } from "./project-users-service";
import type { ProjectUser } from "@/types/project-admin";
import type {
  WallPost,
  WallImageMetadata,
  WallVideoMetadata,
  ConnectMediaType,
  ConnectReactionType,
} from "@/components/project-admin/connect/types";

const WALL_BASE = "/api/v1/connect/wall";
const MEDIA_BASE = "/api/v1/connect/media";

// Cache TTL: 60 seconds of fresh in-memory data
const CACHE_TTL_MS = 60_000;

interface FeedCacheEntry {
  data: {
    posts: WallPost[];
    nextCursor: string | null;
    hasMore: boolean;
  };
  timestamp: number;
}

interface UsersCacheEntry {
  data: ProjectUser[];
  activeCount: number;
  timestamp: number;
}

// In-memory caches to prevent redundant network hits during tab transitions
const feedCache = new Map<string, FeedCacheEntry>();
const inFlightFeed = new Map<string, Promise<{ posts: WallPost[]; nextCursor: string | null; hasMore: boolean }>>();

const usersCache = new Map<string, UsersCacheEntry>();
const inFlightUsers = new Map<string, Promise<{ data: ProjectUser[]; activeCount: number }>>();

export interface ApiWallPost {
  postId: string;
  authorDisplayName?: string;
  text: string;
  mediaType: ConnectMediaType;
  images?: Array<{
    url: string;
    originalName?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
  }>;
  video?: {
    url: string;
    originalName?: string;
    title?: string;
    duration?: string;
    durationSeconds?: number;
    sizeBytes?: number;
  } | null;
  videoMetadata?: {
    url: string;
    originalName?: string;
    title?: string;
    duration?: string;
    durationSeconds?: number;
    sizeBytes?: number;
  } | null;
  reactions?: {
    like?: number;
    clap?: number;
    celebrate?: number;
    useful?: number;
  };
  myReaction?: ConnectReactionType | null;
  hasSeen?: boolean;
  seenCount?: number;
  seenUserIds?: string[];
  createdAt?: string;
}

export interface WallFeedResponse {
  posts: ApiWallPost[];
  nextCursor?: string | null;
  hasMore?: boolean;
}

export interface WallReachResponse {
  postId: string;
  seenCount: number;
  totalEligibleUsers: number;
  reachPercentage: number;
  reactions: {
    like: number;
    clap: number;
    celebrate: number;
    useful: number;
  };
}

export interface CreateWallPostInput {
  text: string;
  mediaType: ConnectMediaType;
  images?: WallImageMetadata[];
  video?: WallVideoMetadata | null;
  authorDisplayName?: string;
  projectId?: string;
}

/**
 * Format ISO createdAt into human-readable wall timestamp.
 */
export function formatWallDate(isoString?: string): string {
  if (!isoString) return "Just now";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Just now";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    // Same day
    if (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return `Today, ${timeStr}`;
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()
    ) {
      return `Yesterday, ${timeStr}`;
    }

    // Within last 6 days: show Day name, e.g. "Fri, 7:45 PM"
    if (diffHours < 24 * 6) {
      const dayName = date.toLocaleDateString([], { weekday: "short" });
      return `${dayName}, ${timeStr}`;
    }

    // Older: "4 Nov, 9:00 AM"
    const datePart = date.toLocaleDateString([], { day: "numeric", month: "short" });
    return `${datePart}, ${timeStr}`;
  } catch {
    return "Just now";
  }
}

/**
 * Normalize an API wall post to the frontend WallPost format.
 */
export function normalizeWallPost(raw: ApiWallPost, totalUsers = 0): WallPost {
  const videoObj = raw.video || raw.videoMetadata || null;
  const rawImages = raw.images || [];

  const images: WallImageMetadata[] = rawImages.map((img) => ({
    url: img.url,
    name: img.originalName || "image.webp",
    originalName: img.originalName,
    sizeBytes: img.sizeBytes,
    width: img.width,
    height: img.height,
  }));

  const video: WallVideoMetadata | null = videoObj
    ? {
      url: videoObj.url,
      title: videoObj.title || videoObj.originalName || "Video",
      duration: videoObj.duration || (videoObj.durationSeconds ? `${Math.floor(videoObj.durationSeconds / 60)}:${(videoObj.durationSeconds % 60).toString().padStart(2, "0")}` : ""),
      durationSeconds: videoObj.durationSeconds,
      sizeBytes: videoObj.sizeBytes,
      originalName: videoObj.originalName,
    }
    : null;

  return {
    id: raw.postId,
    timestamp: formatWallDate(raw.createdAt),
    content: raw.text || "",
    mediaType: raw.mediaType || "NONE",
    hasImages: raw.mediaType === "IMAGES" || images.length > 0,
    imageCount: images.length,
    images,
    hasVideo: raw.mediaType === "VIDEO" || !!video,
    videoDuration: video?.duration || "",
    video,
    audience: "Everyone",
    seenCount: raw.seenCount ?? 0,
    totalUsers: totalUsers > 0 ? totalUsers : (raw.seenCount ?? 0),
    likes: raw.reactions?.like ?? 0,
    claps: raw.reactions?.clap ?? 0,
    celebrates: raw.reactions?.celebrate ?? 0,
    usefuls: raw.reactions?.useful ?? 0,
    authorDisplayName: raw.authorDisplayName || "Program Team",
    seenUserIds: raw.seenUserIds ?? [],
    createdAt: raw.createdAt,
  };
}

export const connectWallService = {
  /**
   * Fetch active project users with in-memory caching (60s TTL) and in-flight request deduplication.
   * Prevents repeated /api/v1/users network calls when toggling between Connect tabs.
   */
  async getActiveProjectUsers(
    projectId: string,
    forceRefresh = false,
  ): Promise<{ data: ProjectUser[]; activeCount: number }> {
    if (!projectId) {
      return { data: [], activeCount: 36 };
    }

    if (!forceRefresh) {
      const cached = usersCache.get(projectId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { data: cached.data, activeCount: cached.activeCount };
      }
      const pending = inFlightUsers.get(projectId);
      if (pending) {
        return pending;
      }
    }

    const fetchPromise = (async () => {
      try {
        const result = await projectUsersService.listByProject(projectId, 1, 100);
        const usersList = result.data || [];
        const activeList = usersList.filter((u) => u.status !== "inactive");
        const activeCount =
          result.meta?.activeCount ?? result.meta?.totalCount ?? activeList.length;

        const payload = { data: usersList, activeCount };
        usersCache.set(projectId, { ...payload, timestamp: Date.now() });
        return payload;
      } finally {
        inFlightUsers.delete(projectId);
      }
    })();

    inFlightUsers.set(projectId, fetchPromise);
    return fetchPromise;
  },

  /**
   * Fetch paginated Wall posts feed with in-memory cache (60s TTL) and request deduplication.
   * GET /api/v1/connect/wall/posts?limit=10&cursor=<postObjectId>
   */
  async listPosts(
    options: {
      limit?: number;
      cursor?: string;
      projectId?: string;
      forceRefresh?: boolean;
    } = {},
  ): Promise<{
    posts: WallPost[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const cacheKey = `${options.projectId || ""}_${options.limit || 10}_${options.cursor || ""}`;

    if (!options.forceRefresh) {
      const cached = feedCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
      const pending = inFlightFeed.get(cacheKey);
      if (pending) {
        return pending;
      }
    }

    const fetchPromise = (async () => {
      try {
        const params = new URLSearchParams();
        if (options.limit) params.set("limit", String(options.limit));
        if (options.cursor) params.set("cursor", options.cursor);
        if (options.projectId) params.set("projectId", options.projectId);

        const qs = params.toString() ? `?${params.toString()}` : "";
        const res = await apiClient.get<WallFeedResponse | ApiWallPost[]>(
          `${WALL_BASE}/posts${qs}`,
        );

        const rawPosts = Array.isArray(res) ? res : res.posts || [];
        const nextCursor = !Array.isArray(res) ? (res.nextCursor ?? null) : null;
        const hasMore = !Array.isArray(res) ? (res.hasMore ?? false) : false;

        const result = {
          posts: rawPosts.map((p) => normalizeWallPost(p)),
          nextCursor,
          hasMore,
        };

        feedCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      } finally {
        inFlightFeed.delete(cacheKey);
      }
    })();

    inFlightFeed.set(cacheKey, fetchPromise);
    return fetchPromise;
  },

  /**
   * Upload image files (1-10 images).
   * POST /api/v1/connect/media/upload/images
   */
  async uploadImages(files: File[]): Promise<WallImageMetadata[]> {
    if (!files.length) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const res = await apiClient.postFormData<Array<{
      url: string;
      originalName?: string;
      sizeBytes?: number;
      width?: number;
      height?: number;
    }>>(`${MEDIA_BASE}/upload/images`, formData);

    return (res || []).map((item) => ({
      url: item.url,
      name: item.originalName || "image.webp",
      originalName: item.originalName,
      sizeBytes: item.sizeBytes,
      width: item.width,
      height: item.height,
    }));
  },

  /**
   * Upload single video file (max 200MB, max 180s).
   * POST /api/v1/connect/media/upload/video
   */
  async uploadVideo(file: File, durationSeconds = 108): Promise<WallVideoMetadata> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("durationSeconds", String(Math.round(durationSeconds)));

    const res = await apiClient.postFormData<{
      url: string;
      originalName?: string;
      sizeBytes?: number;
      durationSeconds?: number;
    }>(`${MEDIA_BASE}/upload/video`, formData);

    const mins = Math.floor(durationSeconds / 60);
    const secs = Math.floor(durationSeconds % 60);
    const duration = `${mins}:${secs.toString().padStart(2, "0")}`;

    return {
      url: res.url,
      title: res.originalName ? res.originalName.replace(/\.[^/.]+$/, "") : file.name.replace(/\.[^/.]+$/, ""),
      duration,
      durationSeconds: res.durationSeconds || durationSeconds,
      sizeBytes: res.sizeBytes || file.size,
      originalName: res.originalName || file.name,
    };
  },

  /**
   * Publish a new Wall post.
   * POST /api/v1/connect/wall/posts
   */
  async createPost(input: CreateWallPostInput): Promise<WallPost> {
    const body: Record<string, unknown> = {
      text: input.text.trim(),
      mediaType: input.mediaType,
      authorDisplayName: input.authorDisplayName || "Program Team",
    };

    if (input.projectId) {
      body.projectId = input.projectId;
    }

    if (input.mediaType === "IMAGES" && input.images && input.images.length > 0) {
      body.images = input.images.map((img) => ({
        url: img.url,
        originalName: img.originalName || img.name,
        sizeBytes: img.sizeBytes,
        width: img.width,
        height: img.height,
      }));
    }

    if (input.mediaType === "VIDEO" && input.video) {
      body.videoMetadata = {
        url: input.video.url,
        originalName: input.video.originalName || input.video.title,
        durationSeconds: input.video.durationSeconds || 108,
        sizeBytes: input.video.sizeBytes,
      };
    }

    const res = await apiClient.post<ApiWallPost>(`${WALL_BASE}/posts`, body);
    this.clearFeedCache(input.projectId);
    return normalizeWallPost(res);
  },

  /**
   * Delete a Wall post (soft delete with audit logging).
   * DELETE /api/v1/connect/wall/posts/:postId
   */
  async deletePost(postId: string, projectId?: string): Promise<boolean> {
    await apiClient.delete<{ postId: string; deleted: boolean }>(`${WALL_BASE}/posts/${postId}`);
    this.clearFeedCache(projectId);
    return true;
  },

  /**
   * Clear in-memory feed cache.
   */
  clearFeedCache(projectId?: string): void {
    if (!projectId) {
      feedCache.clear();
      return;
    }
    for (const key of Array.from(feedCache.keys())) {
      if (key.startsWith(`${projectId}_`)) {
        feedCache.delete(key);
      }
    }
  },

  /**
   * Clear in-memory users cache.
   */
  clearUsersCache(projectId?: string): void {
    if (!projectId) {
      usersCache.clear();
      return;
    }
    usersCache.delete(projectId);
  },

  /**
   * Clear both feed and users cache.
   */
  clearCache(projectId?: string): void {
    this.clearFeedCache(projectId);
    this.clearUsersCache(projectId);
  },

  /**
   * Fetch reach statistics for a Wall post.
   * GET /api/v1/connect/wall/posts/:postId/reach
   */
  async getReach(postId: string): Promise<WallReachResponse> {
    return apiClient.get<WallReachResponse>(`${WALL_BASE}/posts/${postId}/reach`);
  },

  /**
   * Export unseen users as an Excel attachment (.xlsx).
   * Streams GET /api/v1/connect/wall/posts/:postId/unseen/export
   */
  async exportUnseen(postId: string): Promise<Blob> {
    return apiClient.getBlob(`${WALL_BASE}/posts/${postId}/unseen/export`);
  },

  /**
   * Trigger download of the unseen XLSX spreadsheet.
   */
  async downloadUnseenXlsx(postId: string): Promise<void> {
    const blob = await this.exportUnseen(postId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = postId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "export";
    link.href = url;
    link.setAttribute("download", `unseen_users_post_${suffix}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
