import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  connectWallService,
  normalizeWallPost,
  formatWallDate,
  type ApiWallPost,
} from "./connect-wall-service";
import { apiClient } from "./api-client";

describe("connectWallService Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    connectWallService.clearCache();
  });

  it("normalizeWallPost correctly maps API payload to WallPost structure", () => {
    const rawPost: ApiWallPost = {
      postId: "post-12345",
      authorDisplayName: "Program Team",
      text: "Team update for Q4",
      mediaType: "IMAGES",
      images: [
        { url: "https://storage.example/img1.webp", originalName: "checklist.jpg", sizeBytes: 15000 },
      ],
      reactions: { like: 5, clap: 2, celebrate: 1, useful: 8 },
      seenCount: 14,
      createdAt: "2026-11-04T09:00:00.000Z",
    };

    const normalized = normalizeWallPost(rawPost, 20);

    expect(normalized.id).toBe("post-12345");
    expect(normalized.content).toBe("Team update for Q4");
    expect(normalized.mediaType).toBe("IMAGES");
    expect(normalized.hasImages).toBe(true);
    expect(normalized.imageCount).toBe(1);
    expect(normalized.images?.[0].url).toBe("https://storage.example/img1.webp");
    expect(normalized.totalUsers).toBe(20);
    expect(normalized.seenCount).toBe(14);
    expect(normalized.likes).toBe(5);
    expect(normalized.usefuls).toBe(8);
    expect(normalized.authorDisplayName).toBe("Program Team");
  });

  it("formatWallDate handles undefined or invalid timestamps gracefully", () => {
    expect(formatWallDate(undefined)).toBe("Just now");
    expect(formatWallDate("invalid-date")).toBe("Just now");
  });

  it("formatWallDate handles today timestamps", () => {
    const todayIso = new Date().toISOString();
    const formatted = formatWallDate(todayIso);
    expect(formatted).toContain("Today");
  });

  it("listPosts queries /api/v1/connect/wall/posts with limit and cursor", async () => {
    const mockFeedResponse = {
      posts: [
        {
          postId: "p-1",
          authorDisplayName: "Program Team",
          text: "Post 1",
          mediaType: "NONE" as const,
          reactions: { like: 1, clap: 0, celebrate: 0, useful: 0 },
          seenCount: 3,
        },
      ],
      nextCursor: "cursor-next",
      hasMore: true,
    };

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockFeedResponse);

    const result = await connectWallService.listPosts({ limit: 10, cursor: "c1", projectId: "proj-1" });

    expect(getSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/connect/wall/posts?limit=10&cursor=c1&projectId=proj-1"),
    );
    expect(result.posts.length).toBe(1);
    expect(result.posts[0].id).toBe("p-1");
    expect(result.nextCursor).toBe("cursor-next");
    expect(result.hasMore).toBe(true);
  });

  it("createPost posts payload to /api/v1/connect/wall/posts", async () => {
    const mockCreated: ApiWallPost = {
      postId: "p-new",
      authorDisplayName: "Program Team",
      text: "Broadcast message",
      mediaType: "NONE",
      reactions: { like: 0, clap: 0, celebrate: 0, useful: 0 },
      seenCount: 0,
      createdAt: new Date().toISOString(),
    };

    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(mockCreated);

    const created = await connectWallService.createPost({
      text: "Broadcast message",
      mediaType: "NONE",
      projectId: "proj-123",
    });

    expect(postSpy).toHaveBeenCalledWith("/api/v1/connect/wall/posts", {
      text: "Broadcast message",
      mediaType: "NONE",
      authorDisplayName: "Program Team",
      projectId: "proj-123",
    });
    expect(created.id).toBe("p-new");
    expect(created.content).toBe("Broadcast message");
  });

  it("deletePost sends DELETE request to /api/v1/connect/wall/posts/:postId", async () => {
    const deleteSpy = vi.spyOn(apiClient, "delete").mockResolvedValue({ postId: "p-del", deleted: true });

    const success = await connectWallService.deletePost("p-del");

    expect(deleteSpy).toHaveBeenCalledWith("/api/v1/connect/wall/posts/p-del");
    expect(success).toBe(true);
  });

  it("getReach sends GET request to /api/v1/connect/wall/posts/:postId/reach", async () => {
    const mockReach = {
      postId: "p-reach",
      seenCount: 15,
      totalEligibleUsers: 20,
      reachPercentage: 75,
      reactions: { like: 2, clap: 1, celebrate: 0, useful: 3 },
    };

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockReach);

    const reach = await connectWallService.getReach("p-reach");

    expect(getSpy).toHaveBeenCalledWith("/api/v1/connect/wall/posts/p-reach/reach");
    expect(reach.reachPercentage).toBe(75);
    expect(reach.totalEligibleUsers).toBe(20);
  });

  it("exportUnseen calls getBlob for unseen export endpoint", async () => {
    const mockBlob = new Blob(["test-data"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const getBlobSpy = vi.spyOn(apiClient, "getBlob").mockResolvedValue(mockBlob);

    const blob = await connectWallService.exportUnseen("p-export");

    expect(getBlobSpy).toHaveBeenCalledWith("/api/v1/connect/wall/posts/p-export/unseen/export");
    expect(blob).toBe(mockBlob);
  });

  describe("Caching & In-Flight Deduplication", () => {
    it("listPosts caches responses and avoids repeated network calls", async () => {
      const mockResponse = {
        posts: [
          { postId: "p-cache-1", text: "Cache 1", mediaType: "NONE" as const },
        ],
        nextCursor: null,
        hasMore: false,
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockResponse);

      const res1 = await connectWallService.listPosts({ projectId: "proj-cache" });
      const res2 = await connectWallService.listPosts({ projectId: "proj-cache" });

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(res1.posts[0].id).toBe("p-cache-1");
      expect(res2.posts[0].id).toBe("p-cache-1");
    });

    it("listPosts bypasses cache when forceRefresh is true", async () => {
      const mockResponse = { posts: [], nextCursor: null, hasMore: false };
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockResponse);

      await connectWallService.listPosts({ projectId: "proj-refresh" });
      await connectWallService.listPosts({ projectId: "proj-refresh", forceRefresh: true });

      expect(getSpy).toHaveBeenCalledTimes(2);
    });

    it("createPost and deletePost invalidate the feed cache", async () => {
      const mockFeed = { posts: [], nextCursor: null, hasMore: false };
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockFeed);
      vi.spyOn(apiClient, "post").mockResolvedValue({
        postId: "p-new",
        text: "New",
        mediaType: "NONE",
      });
      vi.spyOn(apiClient, "delete").mockResolvedValue({ postId: "p-new", deleted: true });

      await connectWallService.listPosts({ projectId: "proj-inval" });
      expect(getSpy).toHaveBeenCalledTimes(1);

      // Create post invalidates cache for the project
      await connectWallService.createPost({
        text: "New",
        mediaType: "NONE",
        projectId: "proj-inval",
      });

      await connectWallService.listPosts({ projectId: "proj-inval" });
      expect(getSpy).toHaveBeenCalledTimes(2);

      // Delete post invalidates cache
      await connectWallService.deletePost("p-new", "proj-inval");
      await connectWallService.listPosts({ projectId: "proj-inval" });
      expect(getSpy).toHaveBeenCalledTimes(3);
    });

    it("getActiveProjectUsers caches users and deduplicates concurrent in-flight requests", async () => {
      const mockUsersResponse = {
        data: [
          { _id: "u-1", fullName: "User 1", status: "active" },
          { _id: "u-2", fullName: "User 2", status: "active" },
        ],
        meta: { totalCount: 2, activeCount: 2, page: 1, pageSize: 100, totalPages: 1 },
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockUsersResponse);

      // Concurrent in-flight requests
      const [call1, call2] = await Promise.all([
        connectWallService.getActiveProjectUsers("proj-users-test"),
        connectWallService.getActiveProjectUsers("proj-users-test"),
      ]);

      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(call1.activeCount).toBe(2);
      expect(call2.activeCount).toBe(2);

      // Sequential call from cache
      const call3 = await connectWallService.getActiveProjectUsers("proj-users-test");
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(call3.activeCount).toBe(2);
    });
  });
});

