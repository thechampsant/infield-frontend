import { apiClient } from "./api-client";
import type {
  TeamOverviewApi,
  TeamSummary,
  FollowUpList,
} from "@/lib/team-follow-ups/types";

export const teamOverviewService: TeamOverviewApi = {
  getSummary(query, signal) {
    const params = new URLSearchParams({ scope: query.scope });
    if ("date" in query) params.set("date", query.date);
    else {
      params.set("month", String(query.month));
      params.set("year", String(query.year));
    }
    return apiClient.request<TeamSummary>(
      `/api/v1/overview/team/summary?${params}`,
      { method: "GET", signal },
    );
  },
  getFollowUps({ moduleKey, date, scope, view, search, page, limit }, signal) {
    const params = new URLSearchParams({
      date,
      scope,
      view,
      page: String(page),
      limit: String(limit),
    });
    if (search.trim()) params.set("search", search.trim());
    return apiClient.request<FollowUpList>(
      `/api/v1/overview/team/follow-ups/${encodeURIComponent(moduleKey)}/users?${params}`,
      { method: "GET", signal },
    );
  },
};
