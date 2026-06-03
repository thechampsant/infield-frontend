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

/** Backend user info returned with login / auth flows */
export interface BackendUser {
  id: string;
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  /**
   * Access level inherited from the user's designation->role mapping (INF2-1535
   * AC6/AC7). Not yet returned by the login or `users/me` payloads; populated
   * once the backend exposes it. When "MOBILE", the web portal is restricted.
   */
  access?: "WEB" | "MOBILE" | "BOTH";
}

/** Client white-label branding for the master shell top bar */
export interface ClientBrand {
  logoUrl: string;
  name: string;
  primaryColor?: string | null;
}

/** Login response DTO */
export interface LoginResponseDto {
  accessToken: string;
  user: BackendUser;
}

// ─────────────────────────────────────────────────────────────
// Auth flow DTOs (OTP + Passkey / WebAuthn) — INF2-1940
// ─────────────────────────────────────────────────────────────

/** Request an OTP for an email / phone / alphanumeric identifier */
export interface RequestOtpDto {
  identifier: string;
}

/** Verify a 6-digit OTP for the given identifier */
export interface VerifyOtpDto {
  identifier: string;
  otp: string;
}

/** Response from otp/verify: short-lived (10 min) passkey registration token */
export interface VerifyOtpResponse {
  registrationToken: string;
}

/** Begin a passkey authentication ceremony for a returning user */
export interface BeginAuthenticationDto {
  identifier: string;
}

/** Full session response returned by login / passkey finish endpoints */
export interface AuthSessionResponse {
  accessToken: string;
  user: BackendUser;
}

/**
 * Opaque WebAuthn option payloads passed straight through to/from the browser.
 * The backend returns PublicKeyCredential(Creation|Request)Options as JSON with
 * base64url-encoded buffers; we decode them in `lib/auth/webauthn.ts`.
 */
export type PublicKeyCredentialCreationOptionsJSON = Record<string, unknown>;
export type PublicKeyCredentialRequestOptionsJSON = Record<string, unknown>;

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

/** Create account request DTO (live API: accountName + email; phone UI-only until backend adds field) */
export interface CreateAccountDto {
  accountName: string;
  email: string;
  status?: BackendStatus;
  /** Sent when backend supports it; ignored by current OpenAPI schema */
  phone?: string;
}

/** Flat row for accounts + projects CSV export */
export type AccountsProjectsExportRow = {
  accountName: string;
  accountCode: string;
  accountStatus: string;
  projectName: string;
  projectCode: string;
  projectStatus: string;
};

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
  /** Sent when backend supports it; ignored by current OpenAPI schema */
  phone?: string;
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
