import type {
  MasterColumnFilter,
  MasterColumnFilters,
  MasterFilterValuesResult,
  MasterListStatus,
  MasterSort,
} from "@/lib/master-list-query";

/** How a column is filtered: free-text box, value list, or the status select. */
export type MasterColumnFilterType = "text" | "list" | "status";

/**
 * Turns on sorting and column filters in the shared `DataTable`. Screens that
 * don't pass it render the plain table. Usually built from `useMasterListQuery`.
 */
export interface MasterTableControls {
  sort: MasterSort | null;
  onToggleSort: (key: string) => void;
  onSetSort: (sort: MasterSort | null) => void;
  filters: MasterColumnFilters;
  onFilterChange: (key: string, filter: MasterColumnFilter | null) => void;
  /** Distinct values with counts for one column (other filters applied). */
  loadFilterValues: (key: string, valueSearch: string) => Promise<MasterFilterValuesResult>;
  status?: MasterListStatus;
  defaultStatus?: MasterListStatus;
  onStatusChange?: (status: MasterListStatus) => void;
  /** Search or a column filter narrows the rows. */
  filtersActive: boolean;
  /** Anything (filters, sort, status) differs from the default view. */
  anyActive: boolean;
  onClearAll: () => void;
  /** Rows in the current status with no filters, for "642 of 1049". */
  unfilteredTotal?: number;
}

export const STATUS_LABELS: Record<MasterListStatus, string> = {
  all: "All",
  active: "Active",
  inactive: "Inactive",
};
