/**
 * Real API implementation connecting to backend.
 * Follows Engineering Standards: Multi-tenancy (projectId/accountId scoping).
 */

import type { AdminApi } from "./admin";
import type {
  Account,
  BackendAccount,
  BackendPaginatedResponse,
  BackendProject,
  BackendStatus,
  CreateAccountDto,
  CreateProjectDto,
  ListQuery,
  Paginated,
  Project,
  Status,
  UpdateAccountDto,
  UpdateProjectDto,
} from "./types";
import { apiClient, DEFAULT_PAGE_SIZE } from "./api-client";

// ─────────────────────────────────────────────────────────────
// Mappers: Backend → Frontend
// ─────────────────────────────────────────────────────────────

/** Map backend status to frontend status */
function mapStatus(status: BackendStatus): Exclude<Status, "Onboarding"> {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

/** Map BackendAccount to frontend Account */
function mapAccount(acc: BackendAccount): Account {
  // Handle both 'id' and '_id' (MongoDB) field names
  const accAny = acc as unknown as Record<string, unknown>;
  const id = acc.id || (accAny._id as string) || acc.accountCode;
  
  return {
    id,
    name: acc.accountName || (accAny.name as string) || "",
    code: acc.accountCode || (accAny.code as string) || "",
    primaryAdminName: "",
    primaryAdminEmail: acc.email || "",
    projectsActiveCount: (accAny.projectsActiveCount as number) || 0,
    status: mapStatus(acc.status || "ACTIVE"),
    createdAtIso: acc.createdAt || new Date().toISOString(),
  };
}

/** Map BackendProject to frontend Project */
function mapProject(prj: BackendProject, accountCode: string): Project {
  // Handle both 'id' and '_id' (MongoDB) field names
  const prjAny = prj as unknown as Record<string, unknown>;
  const id = prj.id || (prjAny._id as string) || prj.projectCode;

  return {
    id,
    accountCode,
    name: prj.projectName || (prjAny.name as string) || "",
    code: prj.projectCode || (prjAny.code as string) || "",
    regionLabel: undefined,
    projectAdminName: "", // Backend doesn't provide this yet
    projectAdminEmail: prj.email || "",
    modulesActive: [],
    status: mapStatus(prj.status || "ACTIVE"),
  };
}

// ─────────────────────────────────────────────────────────────
// Query String Builder
// ─────────────────────────────────────────────────────────────

/** Build query string from ListQuery and optional extra params */
function buildQueryString(
  query?: ListQuery,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams();

  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));

  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      params.set(key, value);
    });
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

// ─────────────────────────────────────────────────────────────
// Real Admin API Implementation
// ─────────────────────────────────────────────────────────────

export const realAdminApi: AdminApi = {
  // ─────────────────────────────────────────────────────────────
  // Accounts
  // ─────────────────────────────────────────────────────────────

  async listAccounts(query?: ListQuery): Promise<Paginated<Account>> {
    const response = await apiClient.get<
      BackendPaginatedResponse<BackendAccount> | BackendAccount[]
    >(`/api/v1/accounts${buildQueryString(query)}`);

    // Handle different response formats from backend
    // Backend might return: { items: [...], page, pageSize, total }
    // Or just an array: [...]
    // Or: { data: [...], ... }
    if (Array.isArray(response)) {
      // Backend returned an array directly
      return {
        items: response.map(mapAccount),
        page: query?.page || 1,
        pageSize: query?.pageSize || DEFAULT_PAGE_SIZE,
        total: response.length,
      };
    }

    // Check for 'data' property (common API pattern)
    const responseAny = response as unknown as Record<string, unknown>;
    const items = responseAny.items || responseAny.data || [];

    return {
      items: (items as BackendAccount[]).map(mapAccount),
      page: (responseAny.page as number) || query?.page || 1,
      pageSize: (responseAny.pageSize as number) || query?.pageSize || DEFAULT_PAGE_SIZE,
      total: (responseAny.total as number) || (items as BackendAccount[]).length,
    };
  },

  async getAccount(accountId: string): Promise<Account> {
    const response = await apiClient.get<BackendAccount>(
      `/api/v1/accounts/${accountId}`,
    );
    return mapAccount(response);
  },

  async getAccountByCode(accountCode: string): Promise<Account> {
    const response = await apiClient.get<BackendAccount>(
      `/api/v1/accounts/code/${accountCode}`,
    );
    return mapAccount(response);
  },

  async createAccount(data: CreateAccountDto): Promise<Account> {
    const response = await apiClient.post<BackendAccount>(
      "/api/v1/accounts",
      data,
    );
    return mapAccount(response);
  },

  async updateAccount(
    accountId: string,
    data: UpdateAccountDto,
  ): Promise<Account> {
    const response = await apiClient.put<BackendAccount>(
      `/api/v1/accounts/${accountId}`,
      data,
    );
    return mapAccount(response);
  },

  async deleteAccount(accountId: string): Promise<void> {
    await apiClient.delete(`/api/v1/accounts/${accountId}`);
  },

  // ─────────────────────────────────────────────────────────────
  // Projects
  // ─────────────────────────────────────────────────────────────

  async listProjects(
    accountCode: string,
    query?: ListQuery,
  ): Promise<Paginated<Project>> {
    // Get accountId from accountCode first
    const account = await apiClient.get<BackendAccount>(
      `/api/v1/accounts/code/${accountCode}`,
    );
    
    // Handle both 'id' and '_id' (MongoDB) field names
    const accountAny = account as unknown as Record<string, unknown>;
    const accountId = account.id || (accountAny._id as string);
    
    // Only include accountId if we have a valid value
    const extraParams: Record<string, string> = {};
    if (accountId) {
      extraParams.accountId = accountId;
    }

    const response = await apiClient.get<
      BackendPaginatedResponse<BackendProject> | BackendProject[]
    >(`/api/v1/projects${buildQueryString(query, extraParams)}`);

    // Handle different response formats from backend
    if (Array.isArray(response)) {
      return {
        items: response.map((p) => mapProject(p, accountCode)),
        page: query?.page || 1,
        pageSize: query?.pageSize || DEFAULT_PAGE_SIZE,
        total: response.length,
      };
    }

    const responseAny = response as unknown as Record<string, unknown>;
    const items = responseAny.items || responseAny.data || [];

    return {
      items: (items as BackendProject[]).map((p) => mapProject(p, accountCode)),
      page: (responseAny.page as number) || query?.page || 1,
      pageSize: (responseAny.pageSize as number) || query?.pageSize || DEFAULT_PAGE_SIZE,
      total: (responseAny.total as number) || (items as BackendProject[]).length,
    };
  },

  async getProject(projectId: string): Promise<Project> {
    const response = await apiClient.get<BackendProject>(
      `/api/v1/projects/${projectId}`,
    );
    // Note: accountCode not available from this endpoint
    return mapProject(response, "");
  },

  async getProjectByCode(projectCode: string): Promise<Project> {
    const response = await apiClient.get<BackendProject>(
      `/api/v1/projects/code/${projectCode}`,
    );
    // Note: accountCode not available from this endpoint
    return mapProject(response, "");
  },

  async createProject(data: CreateProjectDto): Promise<Project> {
    const response = await apiClient.post<BackendProject>(
      "/api/v1/projects",
      data,
    );
    return mapProject(response, "");
  },

  async updateProject(
    projectId: string,
    data: UpdateProjectDto,
  ): Promise<Project> {
    const response = await apiClient.put<BackendProject>(
      `/api/v1/projects/${projectId}`,
      data,
    );
    return mapProject(response, "");
  },

  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/api/v1/projects/${projectId}`);
  },

  // ─────────────────────────────────────────────────────────────
  // Users (not implemented in backend yet)
  // ─────────────────────────────────────────────────────────────

  async listUsers(_accountCode, _projectCode, query) {
    // Users API not available in backend - return empty for now
    return {
      items: [],
      page: query?.page || 1,
      pageSize: query?.pageSize || DEFAULT_PAGE_SIZE,
      total: 0,
    };
  },
};

