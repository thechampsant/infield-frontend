/**
 * Column filter / sort state for master tables, and how it is sent to the API.
 *
 * Backend contract (infield-core `masters/list-query`):
 * - list:   `status`, `sortBy`, `sortOrder`, `filters` (JSON string) as query params
 * - export: the same fields in `query`, with `filters` as an object
 * - filters: `{ [columnKey]: { in: [...] } | { contains: "text" } }`, `null` = blank
 */

export type MasterSortOrder = "asc" | "desc";
export type MasterListStatus = "active" | "inactive" | "all";
export type MasterFilterValue = string | number | boolean | null;

export interface MasterSort {
  key: string;
  order: MasterSortOrder;
}

/** `labels` is UI-only (chip text); it is never sent to the API. */
export type MasterColumnFilter =
  | { in: MasterFilterValue[]; labels?: string[] }
  | { contains: string };

export type MasterColumnFilters = Record<string, MasterColumnFilter>;

export interface MasterFilterValueOption {
  value: MasterFilterValue;
  label: string;
  count: number;
}

export interface MasterFilterValuesResult {
  values: MasterFilterValueOption[];
  truncated: boolean;
}

export interface MasterListQueryState {
  search: string;
  status: MasterListStatus;
  filters: MasterColumnFilters;
  sort: MasterSort | null;
}

export interface MasterListParams {
  search?: string;
  status?: MasterListStatus;
  sortBy?: string;
  sortOrder?: MasterSortOrder;
  /** JSON string, ready for a query parameter. */
  filters?: string;
}

export interface MasterExportQuery {
  search?: string;
  status?: MasterListStatus;
  sortBy?: string;
  sortOrder?: MasterSortOrder;
  filters?: Record<string, { in: MasterFilterValue[] } | { contains: string }>;
}

export const BLANK_FILTER_LABEL = "(Blank)";

/** Stable key for a filter value, so `1`, `"1"` and `null` stay distinct in sets. */
export function filterValueKey(value: MasterFilterValue): string {
  return JSON.stringify(value);
}

export function isInFilter(
  filter: MasterColumnFilter | undefined,
): filter is { in: MasterFilterValue[]; labels?: string[] } {
  return Boolean(filter && "in" in filter);
}

export function isContainsFilter(
  filter: MasterColumnFilter | undefined,
): filter is { contains: string } {
  return Boolean(filter && "contains" in filter);
}

/** Drops UI-only labels and empty filters. Returns undefined when nothing is filtered. */
export function serializeFilters(
  filters: MasterColumnFilters,
): MasterExportQuery["filters"] | undefined {
  const out: NonNullable<MasterExportQuery["filters"]> = {};
  for (const [key, filter] of Object.entries(filters)) {
    if (isInFilter(filter)) {
      if (filter.in.length) out[key] = { in: filter.in };
    } else if (isContainsFilter(filter)) {
      const text = filter.contains.trim();
      if (text) out[key] = { contains: text };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function hasActiveFilters(state: Pick<MasterListQueryState, "search" | "filters">): boolean {
  return Boolean(state.search.trim()) || Boolean(serializeFilters(state.filters));
}

export function toListParams(state: MasterListQueryState): MasterListParams {
  const params: MasterListParams = { status: state.status };
  const search = state.search.trim();
  if (search) params.search = search;
  if (state.sort) {
    params.sortBy = state.sort.key;
    params.sortOrder = state.sort.order;
  }
  const filters = serializeFilters(state.filters);
  if (filters) params.filters = JSON.stringify(filters);
  return params;
}

export function toExportQuery(state: MasterListQueryState): MasterExportQuery {
  const { filters, ...rest } = toListParams(state);
  const query: MasterExportQuery = { ...rest };
  const serialized = serializeFilters(state.filters);
  if (filters && serialized) query.filters = serialized;
  return query;
}

/** Writes list params into a URLSearchParams (skips undefined). */
export function appendListParams(params: URLSearchParams, list: MasterListParams): URLSearchParams {
  for (const [key, value] of Object.entries(list)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return params;
}

/** Header click: ascending → descending → back to the default order. */
export function cycleSort(current: MasterSort | null, key: string): MasterSort | null {
  if (!current || current.key !== key) return { key, order: "asc" };
  if (current.order === "asc") return { key, order: "desc" };
  return null;
}

export function withColumnFilter(
  filters: MasterColumnFilters,
  key: string,
  filter: MasterColumnFilter | null,
): MasterColumnFilters {
  const next = { ...filters };
  const empty =
    !filter ||
    (isInFilter(filter) && filter.in.length === 0) ||
    (isContainsFilter(filter) && !filter.contains.trim());
  if (empty) delete next[key];
  else next[key] = filter;
  return next;
}

/** Chip text for one column filter, e.g. `L1, L2` or `contains "giri"`. */
export function describeFilter(filter: MasterColumnFilter): string {
  if (isContainsFilter(filter)) return `contains "${filter.contains}"`;
  const labels = filter.in.map(
    (value, index) =>
      filter.labels?.[index] ?? (value === null ? BLANK_FILTER_LABEL : String(value)),
  );
  return labels.length > 3 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
}
