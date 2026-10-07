import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "./data-table";
import type { MasterTableControls } from "./master-table/types";

const columns = [
  { key: "storeName", label: "Store", width: "1fr", sortable: true, filter: "text" as const },
  { key: "status", label: "Status", width: 100, sortable: true, filter: "status" as const },
  { key: "store_category", label: "Store Category", width: 140, sortable: true, filter: "list" as const },
];

const pagination = {
  page: 1,
  pageSize: 25,
  totalCount: 642,
  totalPages: 26,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
};

function controls(overrides: Partial<MasterTableControls> = {}): MasterTableControls {
  return {
    sort: null,
    onToggleSort: vi.fn(),
    onSetSort: vi.fn(),
    filters: {},
    onFilterChange: vi.fn(),
    loadFilterValues: vi.fn(),
    status: "all",
    defaultStatus: "all",
    onStatusChange: vi.fn(),
    filtersActive: false,
    anyActive: false,
    onClearAll: vi.fn(),
    unfilteredTotal: 1049,
    ...overrides,
  };
}

function render(props: Partial<Parameters<typeof DataTable>[0]> = {}) {
  return renderToStaticMarkup(
    <DataTable
      columns={columns}
      rows={[<div key="r">row</div>]}
      total={642}
      filtered={1}
      entityLabel="stores"
      searchValue=""
      onSearchChange={vi.fn()}
      serverPagination={pagination}
      {...props}
    />,
  );
}

describe("DataTable master controls", () => {
  it("renders the plain table unchanged without masterQuery", () => {
    const html = render();
    expect(html).toContain("642 stores");
    expect(html).not.toContain("Active filters");
    expect(html).not.toContain("Sort by Store");
    expect(html).not.toContain("Filter Store Category");
  });

  it("adds sortable headers, inline filters and the filtered counts", () => {
    const html = render({
      masterQuery: controls({
        filters: { store_category: { in: ["L1"], labels: ["L1"] } },
        sort: { key: "storeName", order: "asc" },
        filtersActive: true,
        anyActive: true,
      }),
    });

    expect(html).toContain('aria-label="Sort by Store"');
    expect(html).toContain('aria-label="Filter Store Category"');
    expect(html).toContain('aria-label="Filter Store by text"');
    expect(html).toContain("642 of 1049 stores");
    expect(html).toContain("Active filters");
    expect(html).toContain("Store Category:</strong> L1");
    expect(html).toContain("Sort:</strong> Store A→Z");
    expect(html).toContain("Clear all");
    expect(html).toContain("Showing 1–25 of 642 filtered stores");
  });

  it("shows the no-results state with a Clear action when filters match nothing", () => {
    const html = render({
      rows: [],
      serverPagination: { ...pagination, totalCount: 0, totalPages: 0 },
      masterQuery: controls({
        filters: { store_category: { in: ["L9"] } },
        filtersActive: true,
        anyActive: true,
      }),
    });

    expect(html).toContain("No records match your filters");
    expect(html).toContain("Clear filters");
  });
});
