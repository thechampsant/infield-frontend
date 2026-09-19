/**
 * Project dashboards — named embed URLs Super Admin adds per project.
 */

import { apiClient } from "./api-client";

const BASE = "/api/v1/project-dashboards";

export interface ProjectDashboard {
  id: string;
  projectId: string;
  name: string;
  url: string;
}

interface RawProjectDashboard {
  _id?: string;
  id?: string;
  projectId?: string;
  name?: string;
  url?: string;
}

function normalizeDashboard(raw: RawProjectDashboard): ProjectDashboard {
  return {
    id: String(raw._id ?? raw.id ?? ""),
    projectId: String(raw.projectId ?? ""),
    name: String(raw.name ?? ""),
    url: String(raw.url ?? ""),
  };
}

function asList(res: unknown): RawProjectDashboard[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray((res as { data?: unknown }).data)) {
    return (res as { data: RawProjectDashboard[] }).data;
  }
  return [];
}

export const projectDashboardsService = {
  async list(projectId: string): Promise<ProjectDashboard[]> {
    const res = await apiClient.get<RawProjectDashboard[] | { data?: RawProjectDashboard[] }>(
      `${BASE}?projectId=${encodeURIComponent(projectId)}`,
    );
    return asList(res).map(normalizeDashboard).filter((row) => row.id);
  },

  async getById(id: string): Promise<ProjectDashboard> {
    const res = await apiClient.get<RawProjectDashboard>(`${BASE}/${encodeURIComponent(id)}`);
    return normalizeDashboard(res ?? {});
  },

  async create(input: { projectId: string; name: string; url: string }): Promise<ProjectDashboard> {
    const res = await apiClient.post<RawProjectDashboard>(BASE, input);
    return normalizeDashboard(res ?? {});
  },

  async update(id: string, input: { name?: string; url?: string }): Promise<ProjectDashboard> {
    const res = await apiClient.patch<RawProjectDashboard>(
      `${BASE}/${encodeURIComponent(id)}`,
      input,
    );
    return normalizeDashboard(res ?? {});
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${encodeURIComponent(id)}`);
  },
};
