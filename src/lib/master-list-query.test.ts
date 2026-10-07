import { describe, expect, it } from "vitest";
import {
  appendListParams,
  cycleSort,
  describeFilter,
  filterValueKey,
  hasActiveFilters,
  serializeFilters,
  toExportQuery,
  toListParams,
  withColumnFilter,
  type MasterListQueryState,
} from "./master-list-query";

const base: MasterListQueryState = { search: "", status: "all", filters: {}, sort: null };

describe("master list query serialisation", () => {
  it("sends only status when nothing else is set", () => {
    expect(toListParams(base)).toEqual({ status: "all" });
    expect(toExportQuery(base)).toEqual({ status: "all" });
  });

  it("sends search, sort and JSON filters without UI labels", () => {
    const state: MasterListQueryState = {
      search: "  giri ",
      status: "active",
      sort: { key: "storeName", order: "desc" },
      filters: {
        store_category: { in: ["L1", null], labels: ["Level 1", "(Blank)"] },
        storeName: { contains: " goa " },
      },
    };

    const params = toListParams(state);
    expect(params).toEqual({
      status: "active",
      search: "giri",
      sortBy: "storeName",
      sortOrder: "desc",
      filters: JSON.stringify({
        store_category: { in: ["L1", null] },
        storeName: { contains: "goa" },
      }),
    });
    expect(toExportQuery(state)).toEqual({
      status: "active",
      search: "giri",
      sortBy: "storeName",
      sortOrder: "desc",
      filters: { store_category: { in: ["L1", null] }, storeName: { contains: "goa" } },
    });
  });

  it("drops empty filters", () => {
    expect(serializeFilters({ a: { in: [] }, b: { contains: "  " } })).toBeUndefined();
    expect(hasActiveFilters({ search: " ", filters: { a: { in: [] } } })).toBe(false);
    expect(hasActiveFilters({ search: "", filters: { a: { in: [0] } } })).toBe(true);
  });

  it("writes list params into URLSearchParams", () => {
    const params = appendListParams(new URLSearchParams({ projectId: "p" }), {
      status: "all",
      sortBy: "city",
      sortOrder: "asc",
      search: undefined,
    });
    expect(params.toString()).toBe("projectId=p&status=all&sortBy=city&sortOrder=asc");
  });
});

describe("master list query state helpers", () => {
  it("cycles a header sort asc → desc → none, and restarts on a new column", () => {
    const asc = cycleSort(null, "storeName");
    expect(asc).toEqual({ key: "storeName", order: "asc" });
    const desc = cycleSort(asc, "storeName");
    expect(desc).toEqual({ key: "storeName", order: "desc" });
    expect(cycleSort(desc, "storeName")).toBeNull();
    expect(cycleSort(desc, "city")).toEqual({ key: "city", order: "asc" });
  });

  it("sets and clears a column filter", () => {
    const one = withColumnFilter({}, "city", { in: ["Goa"] });
    expect(one).toEqual({ city: { in: ["Goa"] } });
    expect(withColumnFilter(one, "city", null)).toEqual({});
    expect(withColumnFilter(one, "city", { contains: " " })).toEqual({});
  });

  it("keeps 1, '1' and null distinct", () => {
    expect(new Set([filterValueKey(1), filterValueKey("1"), filterValueKey(null)]).size).toBe(3);
  });

  it("describes filters for chips", () => {
    expect(describeFilter({ contains: "giri" })).toBe('contains "giri"');
    expect(describeFilter({ in: ["L1", null] })).toBe("L1, (Blank)");
    expect(describeFilter({ in: ["L1"], labels: ["Level 1"] })).toBe("Level 1");
    expect(describeFilter({ in: ["a", "b", "c", "d"] })).toBe("a, b +2");
  });
});
