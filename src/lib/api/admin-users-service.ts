/**
 * Super Admin admin-user APIs (Account Admin / Project Admin).
 * GET/POST/DELETE /api/v1/admin-users
 */

import { apiClient } from "./api-client";

const BASE = "/api/v1/admin-users";

export type AdminUserRole = "ACCOUNT_ADMIN" | "PROJECT_ADMIN";

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminUserRole;
  employeeId?: string;
  accountId?: string | null;
  projectId?: string | null;
  isActive?: boolean;
}

export interface CreateAdminUserInput {
  role: AdminUserRole;
  firstName: string;
  lastName: string;
  email: string;
  accountId?: string;
  projectId?: string;
}

export interface CreateAdminUserResult {
  user: AdminUser;
  tempPassword: string;
}

interface RawAdminUser {
  _id?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  employeeId?: string;
  accountId?: string | null;
  projectId?: string | null;
  isActive?: boolean;
}

function normalizeAdminUser(raw: RawAdminUser): AdminUser {
  const id = String(raw.id ?? raw._id ?? "");
  return {
    id,
    email: String(raw.email ?? ""),
    firstName: String(raw.firstName ?? ""),
    lastName: String(raw.lastName ?? ""),
    role: (raw.role as AdminUserRole) || "ACCOUNT_ADMIN",
    employeeId: raw.employeeId ? String(raw.employeeId) : undefined,
    accountId: raw.accountId != null ? String(raw.accountId) : null,
    projectId: raw.projectId != null ? String(raw.projectId) : null,
    isActive: raw.isActive !== false,
  };
}

export const adminUsersService = {
  async listByAccount(accountId: string): Promise<AdminUser[]> {
    const rows = await apiClient.get<RawAdminUser[]>(
      `${BASE}?accountId=${encodeURIComponent(accountId)}`,
    );
    return (Array.isArray(rows) ? rows : []).map(normalizeAdminUser);
  },

  async listByProject(projectId: string): Promise<AdminUser[]> {
    const rows = await apiClient.get<RawAdminUser[]>(
      `${BASE}?projectId=${encodeURIComponent(projectId)}`,
    );
    return (Array.isArray(rows) ? rows : []).map(normalizeAdminUser);
  },

  async create(input: CreateAdminUserInput): Promise<CreateAdminUserResult> {
    const result = await apiClient.post<{
      user?: RawAdminUser;
      tempPassword?: string;
    }>(BASE, input);
    return {
      user: normalizeAdminUser(result?.user ?? {}),
      tempPassword: String(result?.tempPassword ?? ""),
    };
  },

  async deactivate(userId: string): Promise<AdminUser> {
    const raw = await apiClient.delete<RawAdminUser>(
      `${BASE}/${encodeURIComponent(userId)}`,
    );
    return normalizeAdminUser(raw ?? {});
  },
};
