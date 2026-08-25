/**
 * Shared pagination contract for the paginated master-data list APIs
 * (`/users`, `/stores`, `/products`).
 *
 * The backend clamps page size to 100, so `listAll*` helpers must page through
 * results instead of asking for everything in one request.
 */

export const DEFAULT_LIST_PAGE_SIZE = 20;
export const MAX_LIST_PAGE_SIZE = 100;
export const LIST_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface ListMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface RawListMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalCount?: number;
  totalPages?: number;
}

export function normalizeListMeta(
  raw: RawListMeta | undefined,
  rowCount: number,
): ListMeta {
  const page = raw?.page ?? 1;
  const pageSize = raw?.pageSize ?? rowCount;
  const totalCount = raw?.totalCount ?? raw?.total ?? rowCount;
  return {
    page,
    pageSize,
    totalCount,
    totalPages:
      raw?.totalPages ??
      Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
  };
}

/** Clamp a requested page size to what the list APIs accept. */
export function clampListPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) return DEFAULT_LIST_PAGE_SIZE;
  return Math.min(Math.floor(pageSize), MAX_LIST_PAGE_SIZE);
}
