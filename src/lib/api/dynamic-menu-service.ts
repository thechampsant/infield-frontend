/**
 * Dynamic Menu Configuration service.
 *
 * Endpoints:
 *   GET  /api/v1/dynamic-menu                        — List all menu items
 *   POST /api/v1/dynamic-menu                        — Create a menu item
 *   GET  /api/v1/dynamic-menu-config/:projectId      — Get project configs
 */

import { apiClient } from "./api-client";

const MENU_BASE = "/api/v1/dynamic-menu";
const CONFIG_BASE = "/api/v1/dynamic-menu-config";

// ─── Types ────────────────────────────────────────────────────────────────

export interface DynamicMenuItem {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  defaultOrder: number;
  isActive: boolean;
}

export interface DesignationVisibility {
  designationId: string;
  isVisible: boolean;
}

export interface UpdateMenuConfigInput {
  isEnabled?: boolean;
  label?: string;
  icon?: string;
  route?: string;
  displayOrder?: number;
  designationVisibility?: DesignationVisibility[];
}

export interface DynamicMenuConfig {
  id: string;
  projectId: string;
  menuId: string;
  menuKey: string;
  isEnabled: boolean;
  label: string;
  icon: string;
  route: string;
  displayOrder: number;
  designationVisibility: DesignationVisibility[];
}

// ─── Raw types (backend response shapes) ──────────────────────────────────

interface RawMenuItem {
  _id?: string;
  id?: string;
  key?: string;
  label?: string;
  description?: string;
  icon?: string;
  route?: string;
  defaultOrder?: number;
  isActive?: boolean;
}

interface RawMenuConfig {
  _id?: string;
  id?: string;
  projectId?: string;
  menuId?: string;
  menuKey?: string;
  isEnabled?: boolean;
  label?: string;
  icon?: string;
  route?: string;
  displayOrder?: number;
  designationVisibility?: DesignationVisibility[];
}

// ─── Normalizers ──────────────────────────────────────────────────────────

function normalizeMenuItem(raw: RawMenuItem): DynamicMenuItem {
  return {
    id: raw._id ?? raw.id ?? "",
    key: raw.key ?? "",
    label: raw.label ?? "",
    description: raw.description ?? "",
    icon: raw.icon ?? "",
    route: raw.route ?? "",
    defaultOrder: raw.defaultOrder ?? 0,
    isActive: raw.isActive ?? true,
  };
}

function normalizeMenuConfig(raw: RawMenuConfig): DynamicMenuConfig {
  return {
    id: raw._id ?? raw.id ?? "",
    projectId: raw.projectId ?? "",
    menuId: raw.menuId ?? "",
    menuKey: raw.menuKey ?? "",
    isEnabled: raw.isEnabled ?? false,
    label: raw.label ?? "",
    icon: raw.icon ?? "",
    route: raw.route ?? "",
    displayOrder: raw.displayOrder ?? 0,
    designationVisibility: raw.designationVisibility ?? [],
  };
}

// ─── Service ──────────────────────────────────────────────────────────────

export const dynamicMenuService = {
  /**
   * List all available dynamic menu items.
   */
  async listMenuItems(): Promise<DynamicMenuItem[]> {
    const res = await apiClient.get<RawMenuItem[]>(MENU_BASE);
    return Array.isArray(res) ? res.map(normalizeMenuItem) : [];
  },

  /**
   * Enable a dynamic menu item for a project.
   * POST /dynamic-menu-config/:projectId/enable
   */
  async enableForProject(projectId: string, menuId: string): Promise<DynamicMenuConfig> {
    const res = await apiClient.post<RawMenuConfig>(
      `${CONFIG_BASE}/${encodeURIComponent(projectId)}/enable`,
      { menuId }
    );
    return normalizeMenuConfig(res);
  },

  /**
   * Get all dynamic menu configs for a project.
   */
  async listProjectConfigs(projectId: string): Promise<DynamicMenuConfig[]> {
    const res = await apiClient.get<RawMenuConfig[]>(
      `${CONFIG_BASE}/${encodeURIComponent(projectId)}`
    );
    return Array.isArray(res) ? res.map(normalizeMenuConfig) : [];
  },

  /**
   * Get sidebar menu items for the current user's project.
   * GET /dynamic-menu-config/my-menu
   */
  async getSidebarMenu(): Promise<DynamicMenuConfig[]> {
    const res = await apiClient.get<RawMenuConfig[]>(
      `${CONFIG_BASE}/my-menu`
    );
    const all = Array.isArray(res) ? res.map(normalizeMenuConfig) : [];
    return all.filter((c) => c.isEnabled).sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * Update a dynamic menu config entry.
   * PUT /dynamic-menu-config/:projectId/:configId
   */
  async updateConfig(
    projectId: string,
    configId: string,
    input: UpdateMenuConfigInput
  ): Promise<DynamicMenuConfig> {
    const res = await apiClient.put<RawMenuConfig>(
      `${CONFIG_BASE}/${encodeURIComponent(projectId)}/${encodeURIComponent(configId)}`,
      input
    );
    return normalizeMenuConfig(res);
  },
};
