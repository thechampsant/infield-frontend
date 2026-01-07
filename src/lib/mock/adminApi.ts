import type { AdminApi } from "@/lib/api/admin";
import type { ListQuery, Paginated, Status } from "@/lib/api/types";
import { accounts, projects, users } from "@/lib/mock/data";

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

export const mockAdminApi: AdminApi = {
  async listAccounts(query) {
    const { q, status, page, pageSize } = normalizeQuery(query);

    const filtered = accounts
      .filter((a) => (status === "All" ? true : a.status === status))
      .filter((a) =>
        matchesText(
          `${a.name} ${a.code} ${a.primaryAdminName} ${a.primaryAdminEmail}`,
          q,
        ),
      );

    return paginate(filtered, page, pageSize);
  },

  async listProjects(accountCode, query) {
    const { q, status, page, pageSize } = normalizeQuery(query);

    const filtered = projects
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

  async listUsers(accountCode, projectCode, query) {
    const { q, status, page, pageSize } = normalizeQuery(query);

    const filtered = users
      .filter((u) => u.accountCode === accountCode && u.projectCode === projectCode)
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


