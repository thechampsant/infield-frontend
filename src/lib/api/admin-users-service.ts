import { apiClient } from "./api-client";
import type { AdminAccessArea } from "@/lib/auth/permissions";

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
  adminAccess?: AdminAccessArea[] ;
  /** Linked Manager designation for field approvals (Project Admin only). */
  designationId?: string | null;
}

export interface CreateAdminUserInput {
  role: AdminUserRole;
  firstName: string;
  lastName: string;
  email: string;
  accountId?: string;
  projectId?: string;
  adminAccess?: AdminAccessArea[];
}

export interface CreateAdminUserResult {
  user: AdminUser;
  tempPassword: string;
}

export interface UpdateAdminUserInput {
  adminAccess?: AdminAccessArea[];
  /** Pass null to clear the approvals designation. */
  designationId?: string | null;
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
  adminAccess?: string[];
  designationId?: string | null;
  designation?: string | { _id?: string; id?: string } | null;
}

function normalizeAdminAccess(raw: unknown): AdminAccessArea[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter(
    (item): item is AdminAccessArea =>
      item === "uploaders" ||
      item === "modules" ||
      item === "web-modules" ||
      item === "form-builder" ||
      item === "reports",
  );
}

function normalizeDesignationId(raw: RawAdminUser): string | null {
  if (raw.designationId != null && raw.designationId !== "") {
    return String(raw.designationId);
  }
  if (typeof raw.designation === "string" && raw.designation) {
    return raw.designation;
  }
  if (raw.designation && typeof raw.designation === "object") {
    const id = raw.designation.id ?? raw.designation._id;
    return id != null ? String(id) : null;
  }
  return null;
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
    adminAccess: normalizeAdminAccess(raw.adminAccess),
    designationId: normalizeDesignationId(raw),
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

  async updateAccess(
    userId: string,
    adminAccess: AdminAccessArea[],
  ): Promise<AdminUser> {
    return this.update(userId, { adminAccess });
  },

  async update(
    userId: string,
    input: UpdateAdminUserInput,
  ): Promise<AdminUser> {
    const raw = await apiClient.patch<RawAdminUser>(
      `${BASE}/${encodeURIComponent(userId)}`,
      input,
    );
    return normalizeAdminUser(raw ?? {});
  },

  async deactivate(userId: string): Promise<AdminUser> {
    const raw = await apiClient.delete<RawAdminUser>(
      `${BASE}/${encodeURIComponent(userId)}`,
    );
    return normalizeAdminUser(raw ?? {});
  },
};
