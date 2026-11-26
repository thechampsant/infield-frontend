/**
 * Connect Badge Service — API client for fetching aggregate and domain badge counts.
 */
import { apiClient } from "./api-client";

export interface ConnectBadgeResponse {
  connectCount: number;
  totalCount: number;
  roomUnreadCount: number;
  roomMessagesCount: number;
  totalUnreadMessages: number;
  wallUnseenCount: number;
  hasUnseenWallPosts: boolean;
  lastWallOpenedAt: string | null;
}

export const connectBadgeService = {
  /**
   * Fetch aggregate and domain badge counts for Connect.
   * GET /api/v1/connect/badge
   */
  async getConnectBadge(projectId?: string): Promise<ConnectBadgeResponse> {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return apiClient.get<ConnectBadgeResponse>(`/api/v1/connect/badge${qs}`);
  },

  /**
   * Record that the user opened the Wall feed to clear unseen dot/count.
   * POST /api/v1/connect/wall/open
   */
  async recordWallOpen(projectId?: string): Promise<{ lastWallOpenedAt: string }> {
    const qs = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return apiClient.post<{ lastWallOpenedAt: string }>(`/api/v1/connect/wall/open${qs}`, {});
  },

  /**
   * Record DPDP one-time notice consent.
   * POST /api/v1/connect/consent
   */
  async recordConsent(noticeVersion?: string): Promise<{ hasConsented: boolean; consentedAt: string }> {
    return apiClient.post<{ hasConsented: boolean; consentedAt: string }>("/api/v1/connect/consent", {
      noticeVersion,
    });
  },
};
