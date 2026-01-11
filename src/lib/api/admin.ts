import type {
  Account,
  CreateAccountDto,
  CreateProjectDto,
  ListQuery,
  Paginated,
  Project,
  UpdateAccountDto,
  UpdateProjectDto,
  User,
} from "./types";

/**
 * Admin API interface for account, project, and user management.
 * Implementations: mockAdminApi (mock), realAdminApi (backend).
 */
export interface AdminApi {
  // ─────────────────────────────────────────────────────────────
  // Accounts
  // ─────────────────────────────────────────────────────────────

  /** List accounts with optional filtering and pagination */
  listAccounts(query?: ListQuery): Promise<Paginated<Account>>;

  /** Get a single account by ID */
  getAccount(accountId: string): Promise<Account>;

  /** Get a single account by account code */
  getAccountByCode(accountCode: string): Promise<Account>;

  /** Create a new account */
  createAccount(data: CreateAccountDto): Promise<Account>;

  /** Update an existing account */
  updateAccount(accountId: string, data: UpdateAccountDto): Promise<Account>;

  /** Soft delete an account */
  deleteAccount(accountId: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────
  // Projects
  // ─────────────────────────────────────────────────────────────

  /** List projects for an account with optional filtering and pagination */
  listProjects(
    accountCode: string,
    query?: ListQuery,
  ): Promise<Paginated<Project>>;

  /** Get a single project by ID */
  getProject(projectId: string): Promise<Project>;

  /** Get a single project by project code */
  getProjectByCode(projectCode: string): Promise<Project>;

  /** Create a new project */
  createProject(data: CreateProjectDto): Promise<Project>;

  /** Update an existing project */
  updateProject(projectId: string, data: UpdateProjectDto): Promise<Project>;

  /** Soft delete a project */
  deleteProject(projectId: string): Promise<void>;

  // ─────────────────────────────────────────────────────────────
  // Users (not in backend yet - future implementation)
  // ─────────────────────────────────────────────────────────────

  /** List users for a project with optional filtering and pagination */
  listUsers(
    accountCode: string,
    projectCode: string,
    query?: ListQuery,
  ): Promise<Paginated<User>>;
}
