/**
 * Real API implementation connecting to backend.
 * Follows Engineering Standards: Multi-tenancy (projectId/accountId scoping).
 */

import type { AdminApi } from "./admin";
import type {
  Account,
  AccountsProjectsExportRow,
  BackendAccount,
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

function mapStatus(status: BackendStatus): Exclude<Status, "Onboarding"> {
  return status === "ACTIVE" ? "Active" : "Inactive";
}

/** Mongo id string from API entities — never use business codes (accountCode, projectCode). */
function backendId(entity: Record<string, unknown>): string {
  const id = entity.id ?? entity._id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (id && typeof id === "object") {
    if ("$oid" in id && typeof (id as { $oid: string }).$oid === "string") {
      return (id as { $oid: string }).$oid;
    }
    if ("toString" in id && typeof id.toString === "function") {
      const s = id.toString();
      if (s && s !== "[object Object]") return s;
    }
  }
  return "";
}

function mapAccount(acc: BackendAccount): Account {
  const accAny = acc as unknown as Record<string, unknown>;
  const id = backendId(accAny as { id?: string }) || acc.accountCode;

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

function mapProject(prj: BackendProject, accountCode: string): Project {
  const prjAny = prj as unknown as Record<string, unknown>;
  const id = backendId(prjAny);
  if (!id) {
    throw new Error(
      `Project response is missing a Mongo id (_id/id). Refusing to use project code "${prj.projectCode}" for role APIs.`,
    );
  }

  return {
    id,
    accountCode,
    name: prj.projectName || (prjAny.name as string) || "",
    code: prj.projectCode || (prjAny.code as string) || "",
    regionLabel: undefined,
    projectAdminName: "", // Backend doesn't provide this yet
    projectAdminEmail: prj.email,
    modulesActive: [],
    status: mapStatus(prj.status || "ACTIVE"),
  };
}

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

/** Live list endpoints often return a bare array in `data`. */
function normalizePaginatedList<T, U>(
  raw: unknown,
  mapItem: (item: T) => U,
  query?: ListQuery,
): Paginated<U> {
  if (Array.isArray(raw)) {
    const items = (raw as T[]).map(mapItem);
    return {
      items,
      page: query?.page || 1,
      pageSize: query?.pageSize || DEFAULT_PAGE_SIZE,
      total: items.length,
    };
  }

  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const list = (record.items || record.data || []) as T[];
    const items = list.map(mapItem);
    return {
      items,
      page: (record.page as number) || query?.page || 1,
      pageSize:
        (record.pageSize as number) || query?.pageSize || DEFAULT_PAGE_SIZE,
      total:
        (record.total as number) ||
        (record.totalCount as number) ||
        items.length,
    };
  }

  return {
    items: [],
    page: query?.page || 1,
    pageSize: query?.pageSize || DEFAULT_PAGE_SIZE,
    total: 0,
  };
}

function mapExportStatus(status: BackendStatus | string | undefined): string {
  if (!status) return "";
  return status === "ACTIVE" || status === "Active" ? "Active" : "Inactive";
}

// ─────────────────────────────────────────────────────────────
// Real Admin API Implementation
// ─────────────────────────────────────────────────────────────

export const realAdminApi: AdminApi = {
  async listAccounts(query?: ListQuery): Promise<Paginated<Account>> {
    const response = await apiClient.get<unknown>(
      `/api/v1/accounts${buildQueryString(query)}`,
    );
    return normalizePaginatedList<BackendAccount, Account>(
      response,
      mapAccount,
      query,
    );
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
    // Backend OpenAPI models accountName/email/status only. `phone` is
    // collected in the form (design requirement) but not yet accepted by the
    // API, so it is intentionally omitted to avoid rejected requests.
    const response = await apiClient.post<BackendAccount>("/api/v1/accounts", {
      accountName: data.accountName,
      email: data.email,
      status: data.status,
    });
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

  async listProjects(
    accountCode: string,
    query?: ListQuery,
  ): Promise<Paginated<Project>> {
    const account = await apiClient.get<BackendAccount>(
      `/api/v1/accounts/code/${accountCode}`,
    );
    const accountAny = account as unknown as Record<string, unknown>;
    const accountId = account.id || (accountAny._id as string);

    const extraParams: Record<string, string> = {};
    if (accountId) {
      extraParams.accountId = accountId;
    }

    const response = await apiClient.get<unknown>(
      `/api/v1/projects${buildQueryString(query, extraParams)}`,
    );
    return normalizePaginatedList<BackendProject, Project>(
      response,
      (p) => mapProject(p, accountCode),
      query,
    );
  },

  async listProjectsByAccountId(
    accountId: string,
    accountCode = "",
    query?: ListQuery,
  ): Promise<Paginated<Project>> {
    const response = await apiClient.get<unknown>(
      `/api/v1/projects${buildQueryString(query, { accountId })}`,
    );
    return normalizePaginatedList<BackendProject, Project>(
      response,
      (p) => mapProject(p, accountCode),
      query,
    );
  },

  async getProject(projectId: string): Promise<Project> {
    const response = await apiClient.get<BackendProject>(
      `/api/v1/projects/${projectId}`,
    );
    return mapProject(response, "");
  },

  async getProjectByCode(projectCode: string): Promise<Project> {
    const response = await apiClient.get<BackendProject>(
      `/api/v1/projects/code/${projectCode}`,
    );
    return mapProject(response, "");
  },

  async createProject(data: CreateProjectDto): Promise<Project> {
    // See createAccount: `phone` is form-only and not part of the API schema.
    const response = await apiClient.post<BackendProject>("/api/v1/projects", {
      accountId: data.accountId,
      projectName: data.projectName,
      email: data.email,
      status: data.status,
    });
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

  async exportAccountsWithProjects(): Promise<AccountsProjectsExportRow[]> {
    const [accountsRaw, projectsRaw] = await Promise.all([
      apiClient.get<BackendAccount[]>("/api/v1/accounts/export/all"),
      apiClient.get<BackendProject[]>("/api/v1/projects/export/all"),
    ]);

    const accounts = Array.isArray(accountsRaw) ? accountsRaw : [];
    const projects = Array.isArray(projectsRaw) ? projectsRaw : [];

    const accountById = new Map<string, BackendAccount>();
    for (const acc of accounts) {
      const accAny = acc as unknown as Record<string, unknown>;
      const id = acc.id || (accAny._id as string);
      if (id) accountById.set(id, acc);
    }

    const rows: AccountsProjectsExportRow[] = [];

    for (const acc of accounts) {
      const accAny = acc as unknown as Record<string, unknown>;
      const accountId = acc.id || (accAny._id as string);
      const accountProjects = projects.filter((p) => {
        const pAny = p as unknown as Record<string, unknown>;
        const pid = pAny.accountId as string | undefined;
        return pid === accountId;
      });

      if (accountProjects.length === 0) {
        rows.push({
          accountName: acc.accountName,
          accountCode: acc.accountCode,
          accountStatus: mapExportStatus(acc.status),
          projectName: "",
          projectCode: "",
          projectStatus: "",
        });
        continue;
      }

      for (const prj of accountProjects) {
        rows.push({
          accountName: acc.accountName,
          accountCode: acc.accountCode,
          accountStatus: mapExportStatus(acc.status),
          projectName: prj.projectName,
          projectCode: prj.projectCode,
          projectStatus: mapExportStatus(prj.status),
        });
      }
    }

    return rows;
  },

  async listUsers(_accountCode, _projectCode, query) {
    return {
      items: [],
      page: query?.page || 1,
      pageSize: query?.pageSize || DEFAULT_PAGE_SIZE,
      total: 0,
    };
  },
};
