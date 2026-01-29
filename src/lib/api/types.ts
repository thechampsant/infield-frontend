// ─────────────────────────────────────────────────────────────
// Frontend Types (used by UI components)
// ─────────────────────────────────────────────────────────────

export type Status = "Active" | "Inactive" | "Onboarding";

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type Account = {
  id: string;
  name: string;
  code: string;
  primaryAdminName: string;
  primaryAdminEmail: string;
  projectsActiveCount: number;
  status: Exclude<Status, "Onboarding">;
  createdAtIso: string;
};

export type Project = {
  id: string;
  accountCode: string;
  name: string;
  code: string;
  regionLabel?: string;
  projectAdminName: string;
  projectAdminEmail: string;
  modulesActive: string[];
  status: Exclude<Status, "Onboarding">;
};

export type User = {
  id: string;
  accountCode: string;
  projectCode: string;
  name: string;
  employeeCode: string;
  email: string;
  designation: string;
  systemRole: string;
  assignedStoresLabel: string;
  status: Status;
};

export type ListQuery = {
  q?: string;
  status?: Status | "All";
  page?: number;
  pageSize?: number;
};

// ─────────────────────────────────────────────────────────────
// Backend DTO Types (matching Swagger schemas)
// ─────────────────────────────────────────────────────────────

/** Backend status enum */
export type BackendStatus = "ACTIVE" | "INACTIVE";

/** Login request DTO */
export interface LoginDto {
  email: string;
  password: string;
}

/** Backend user info returned with login */
export interface BackendUser {
  id: string;
  email: string;
  role?: string;
}

/** Login response DTO */
export interface LoginResponseDto {
  accessToken: string;
  user: BackendUser;
}

/** Backend account entity */
export interface BackendAccount {
  id: string;
  accountCode: string;
  accountName: string;
  email: string;
  status: BackendStatus;
  createdAt: string;
  updatedAt?: string;
}

/** Backend project entity */
export interface BackendProject {
  id: string;
  accountId: string;
  projectCode: string;
  projectName: string;
  email: string;
  status: BackendStatus;
  createdAt?: string;
  updatedAt?: string;
}

/** Backend paginated response wrapper */
export interface BackendPaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────
// Request DTOs (for creating/updating entities)
// ─────────────────────────────────────────────────────────────

/** Create account request DTO */
export interface CreateAccountDto {
  accountName: string;
  email: string;
  status?: BackendStatus;
}

/** Update account request DTO */
export interface UpdateAccountDto {
  accountName?: string;
  email?: string;
  status?: BackendStatus;
}

/** Create project request DTO */
export interface CreateProjectDto {
  accountId: string;
  projectName: string;
  email: string;
  status?: BackendStatus;
}

/** Update project request DTO */
export interface UpdateProjectDto {
  projectName?: string;
  email?: string;
  status?: BackendStatus;
}

// ─────────────────────────────────────────────────────────────
// Role Types
// ─────────────────────────────────────────────────────────────

/** Frontend Role entity */
export type Role = {
  id: string;
  projectId: string;
  roleName: string;
  level: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Backend Role entity */
export interface BackendRole {
  _id?: string;
  id?: string;
  projectId: string;
  roleName: string;
  level: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Create role DTO (for single role in bulk request) */
export interface CreateRoleDto {
  projectId: string;
  roleName: string;
  level: number;
}

/** Bulk create roles request DTO */
export interface CreateBulkRolesDto {
  roles: CreateRoleDto[];
}

/** Update role DTO (for single role in bulk request) */
export interface UpdateRoleDto {
  id: string;
  roleName?: string;
  level?: number;
}

/** Bulk update roles request DTO */
export interface UpdateBulkRolesDto {
  roles: UpdateRoleDto[];
}

/** Bulk delete roles request DTO */
export interface DeleteBulkRolesDto {
  ids: string[];
}

// ─────────────────────────────────────────────────────────────
// Designation Types
// ─────────────────────────────────────────────────────────────

/** Access level for designations */
export type AccessLevel = "WEB" | "MOBILE" | "BOTH";

/** Frontend Designation entity */
export type Designation = {
  id: string;
  projectId: string;
  name: string;
  roleId: string;
  roleName?: string;
  permissions: string[];
  access: AccessLevel;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

/** Backend Designation entity */
export interface BackendDesignation {
  _id?: string;
  id?: string;
  projectId: string;
  name: string;
  roleId: string;
  roleName?: string;
  permissions?: string[];
  access?: AccessLevel;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Create designation DTO (for single designation in bulk request) */
export interface CreateDesignationDto {
  projectId: string;
  name: string;
  roleId: string;
  permissions?: string[];
  access?: AccessLevel;
}

/** Bulk create designations request DTO */
export interface CreateBulkDesignationsDto {
  designations: CreateDesignationDto[];
}

/** Update designation DTO (for single designation in bulk request) */
export interface UpdateDesignationDto {
  id: string;
  name?: string;
  roleId?: string;
  permissions?: string[];
  access?: AccessLevel;
}

/** Bulk update designations request DTO */
export interface UpdateBulkDesignationsDto {
  designations: UpdateDesignationDto[];
}

/** Bulk delete designations request DTO */
export interface DeleteBulkDesignationsDto {
  ids: string[];
}
