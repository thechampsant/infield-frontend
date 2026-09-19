/**
 * Project dashboards — named iframe embed URLs Super Admin adds per project.
 */

import { apiClient } from "./api-client";

/** Pull the iframe src when Super Admin pastes embed markup instead of a bare URL. */
export function extractDashboardEmbedUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/<iframe/i.test(trimmed)) {
    const quoted = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(trimmed);
    if (quoted?.[1]) return quoted[1].trim();
    const unquoted = /\bsrc\s*=\s*([^\s>]+)/i.exec(trimmed);
    if (unquoted?.[1]) return unquoted[1].trim();
  }
  return trimmed;
}

export type ParsedDashboardEmbed =
  | { kind: "onvo"; src: string; baseUrl: string; dashboardId: string; token: string }
  | { kind: "iframe"; src: string };

/** Onvo's Next app sends X-Frame-Options: SAMEORIGIN, so those embeds cannot be iframed. */
export function parseDashboardEmbed(raw: string): ParsedDashboardEmbed | null {
  const src = extractDashboardEmbedUrl(raw);
  if (!src) return null;
  try {
    const url = new URL(src);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const token = url.searchParams.get("token")?.trim() ?? "";
    const match = url.pathname.match(/^\/embed\/dashboards\/([^/]+)\/?$/i);
    const host = url.hostname.toLowerCase();
    if (token && match?.[1] && (host === "dashboard.onvo.ai" || host.endsWith(".onvo.ai"))) {
      return {
        kind: "onvo",
        src,
        baseUrl: `${url.protocol}//${url.host}`,
        dashboardId: decodeURIComponent(match[1]),
        token,
      };
    }
    return { kind: "iframe", src };
  } catch {
    return null;
  }
}

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
    const res = await apiClient.post<RawProjectDashboard>(BASE, {
      ...input,
      url: extractDashboardEmbedUrl(input.url),
    });
    return normalizeDashboard(res ?? {});
  },

  async update(id: string, input: { name?: string; url?: string }): Promise<ProjectDashboard> {
    const res = await apiClient.patch<RawProjectDashboard>(`${BASE}/${encodeURIComponent(id)}`, {
      ...input,
      ...(input.url !== undefined ? { url: extractDashboardEmbedUrl(input.url) } : {}),
    });
    return normalizeDashboard(res ?? {});
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`${BASE}/${encodeURIComponent(id)}`);
  },
};
