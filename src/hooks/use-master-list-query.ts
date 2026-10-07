"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LIST_PAGE_SIZE } from "@/lib/api/pagination";
import {
  cycleSort,
  hasActiveFilters,
  toExportQuery,
  toListParams,
  withColumnFilter,
  type MasterColumnFilter,
  type MasterColumnFilters,
  type MasterListStatus,
  type MasterSort,
} from "@/lib/master-list-query";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Search, status, column filters, sort and paging for a server-paged master
 * table. Any change other than paging returns to page 1; filters persist
 * across pages. `listParams` and `exportQuery` are what the API expects.
 */
export function useMasterListQuery(options: { defaultStatus?: MasterListStatus } = {}) {
  const defaultStatus = options.defaultStatus ?? "active";
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatusState] = useState<MasterListStatus>(defaultStatus);
  const [filters, setFilters] = useState<MasterColumnFilters>({});
  const [sort, setSortState] = useState<MasterSort | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_LIST_PAGE_SIZE);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchInput.trim();
      setSearch((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const setStatus = useCallback((next: MasterListStatus) => {
    setStatusState(next);
    setPage(1);
  }, []);

  const setColumnFilter = useCallback((key: string, filter: MasterColumnFilter | null) => {
    setFilters((prev) => withColumnFilter(prev, key, filter));
    setPage(1);
  }, []);

  const setSort = useCallback((next: MasterSort | null) => {
    setSortState(next);
    setPage(1);
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSortState((prev) => cycleSort(prev, key));
    setPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  /** Clears search, column filters, sort and status (back to the default). */
  const clearAll = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setFilters({});
    setSortState(null);
    setStatusState(defaultStatus);
    setPage(1);
  }, [defaultStatus]);

  const state = useMemo(
    () => ({ search, status, filters, sort }),
    [search, status, filters, sort],
  );

  return {
    searchInput,
    setSearchInput,
    status,
    setStatus,
    defaultStatus,
    filters,
    setColumnFilter,
    sort,
    setSort,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    clearAll,
    /** Search or a column filter narrows the rows (status alone does not). */
    filtersActive: hasActiveFilters(state),
    /** Anything differs from the screen's default view. */
    anyActive: hasActiveFilters(state) || sort !== null || status !== defaultStatus,
    listParams: useMemo(() => toListParams(state), [state]),
    exportQuery: useMemo(() => toExportQuery(state), [state]),
  };
}

export type MasterListQueryControls = ReturnType<typeof useMasterListQuery>;
