import type { Account, ListQuery, Paginated, Project, User } from "./types";

export interface AdminApi {
  listAccounts(query?: ListQuery): Promise<Paginated<Account>>;
  listProjects(accountCode: string, query?: ListQuery): Promise<Paginated<Project>>;
  listUsers(
    accountCode: string,
    projectCode: string,
    query?: ListQuery,
  ): Promise<Paginated<User>>;
}


