/**
 * Mock API implementation for development and testing.
 * Implements AdminApi interface with static mock data.
 */

import type { AdminApi } from "@/lib/api/admin";
import type {
  Account,
  CreateAccountDto,
  CreateProjectDto,
  ListQuery,
  Paginated,
  Project,
  Status,
  UpdateAccountDto,
  UpdateProjectDto,
} from "@/lib/api/types";
import { accounts, projects, users } from "@/lib/mock/data";

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

function normalizeQuery(query?: ListQuery) {
  return {
    q: query?.q?.trim().toLowerCase() ?? "",
    status: (query?.status ?? "All") as Status | "All",
    page: query?.page && query.page > 0 ? query.page : 1,
    pageSize: query?.pageSize && query.pageSize > 0 ? query.pageSize : 10,
  };
}

function paginate<T>(all: T[], page: number, pageSize: number): Paginated<T> {
  const total = all.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return { items: all.slice(start, end), page, pageSize, total };
}

function matchesText(haystack: string, q: string) {
  if (!q) return true;
  return haystack.toLowerCase().includes(q);
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────
// Mutable mock data stores (for CRUD operations)
// ─────────────────────────────────────────────────────────────

const accountsStore = [...accounts];
const projectsStore = [...projects];

// ─────────────────────────────────────────────────────────────
// Mock Admin API Implementation
// ─────────────────────────────────────────────────────────────

export const mockAdminApi: AdminApi = {
  // ─────────────────────────────────────────────────────────────
  // Accounts
  // ─────────────────────────────────────────────────────────────

  async listAccounts(query) {
    const { q, status, page, pageSize } = normalizeQuery(query);

    const filtered = accountsStore
      .filter((a) => (status === "All" ? true : a.status === status))
      .filter((a) =>
        matchesText(
          `${a.name} ${a.code} ${a.primaryAdminName} ${a.primaryAdminEmail}`,
          q,
        ),
      );

    return paginate(filtered, page, pageSize);
  },

  async getAccount(accountId) {
    const account = accountsStore.find((a) => a.id === accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }
    return account;
  },

  async getAccountByCode(accountCode) {
    const account = accountsStore.find((a) => a.code === accountCode);
    if (!account) {
      throw new Error(`Account not found: ${accountCode}`);
    }
    return account;
  },

  async createAccount(data: CreateAccountDto): Promise<Account> {
    const newAccount: Account = {
      id: generateId("acc"),
      name: data.accountName,
      code: `ACC-${String(accountsStore.length + 1).padStart(6, "0")}`,
      primaryAdminName: "",
      primaryAdminEmail: data.email,
      projectsActiveCount: 0,
      status: data.status === "INACTIVE" ? "Inactive" : "Active",
      createdAtIso: new Date().toISOString(),
    };
    accountsStore.push(newAccount);
    return newAccount;
  },

  async updateAccount(accountId, data: UpdateAccountDto): Promise<Account> {
    const index = accountsStore.findIndex((a) => a.id === accountId);
    if (index === -1) {
      throw new Error(`Account not found: ${accountId}`);
    }

    const updated = { ...accountsStore[index] };
    if (data.accountName) updated.name = data.accountName;
    if (data.email) updated.primaryAdminEmail = data.email;
    if (data.status) updated.status = data.status === "INACTIVE" ? "Inactive" : "Active";

    accountsStore[index] = updated;
    return updated;
  },

  async deleteAccount(accountId): Promise<void> {
    const index = accountsStore.findIndex((a) => a.id === accountId);
    if (index === -1) {
      throw new Error(`Account not found: ${accountId}`);
    }
    accountsStore.splice(index, 1);
  },

  // ─────────────────────────────────────────────────────────────
  // Projects
  // ─────────────────────────────────────────────────────────────

  async listProjects(accountCode, query) {
    const { q, status, page, pageSize } = normalizeQuery(query);

    const filtered = projectsStore
      .filter((p) => p.accountCode === accountCode)
      .filter((p) => (status === "All" ? true : p.status === status))
      .filter((p) =>
        matchesText(
          `${p.name} ${p.code} ${p.projectAdminName} ${p.projectAdminEmail}`,
          q,
        ),
      );

    return paginate(filtered, page, pageSize);
  },

  async getProject(projectId) {
    const project = projectsStore.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    return project;
  },

  async getProjectByCode(projectCode) {
    const project = projectsStore.find((p) => p.code === projectCode);
    if (!project) {
      throw new Error(`Project not found: ${projectCode}`);
    }
    return project;
  },

  async createProject(data: CreateProjectDto): Promise<Project> {
    // Find account to get accountCode
    const account = accountsStore.find((a) => a.id === data.accountId);
    const accountCode = account?.code || "";

    const newProject: Project = {
      id: generateId("prj"),
      accountCode,
      name: data.projectName,
      code: `PRJ-${String(projectsStore.length + 1).padStart(6, "0")}`,
      projectAdminName: "",
      projectAdminEmail: data.email,
      modulesActive: [],
      status: data.status === "INACTIVE" ? "Inactive" : "Active",
    };
    projectsStore.push(newProject);
    return newProject;
  },

  async updateProject(projectId, data: UpdateProjectDto): Promise<Project> {
    const index = projectsStore.findIndex((p) => p.id === projectId);
    if (index === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const updated = { ...projectsStore[index] };
    if (data.projectName) updated.name = data.projectName;
    if (data.email) updated.projectAdminEmail = data.email;
    if (data.status) updated.status = data.status === "INACTIVE" ? "Inactive" : "Active";

    projectsStore[index] = updated;
    return updated;
  },

  async deleteProject(projectId): Promise<void> {
    const index = projectsStore.findIndex((p) => p.id === projectId);
    if (index === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }
    projectsStore.splice(index, 1);
  },

  // ─────────────────────────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────────────────────────

  async listUsers(accountCode, projectCode, query) {
    const { q, status, page, pageSize } = normalizeQuery(query);

    const filtered = users
      .filter(
        (u) => u.accountCode === accountCode && u.projectCode === projectCode,
      )
      .filter((u) => (status === "All" ? true : u.status === status))
      .filter((u) =>
        matchesText(
          `${u.name} ${u.email} ${u.employeeCode} ${u.designation} ${u.systemRole}`,
          q,
        ),
      );

    return paginate(filtered, page, pageSize);
  },
};

