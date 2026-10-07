import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MasterListQueryControls } from "@/hooks/use-master-list-query";
import type { StoreRecord } from "@/lib/api/store-service";
import type { UDFField } from "@/types/project-admin";
import { StoreTable } from "./store-table";

function store(id: string, isActive: boolean): StoreRecord {
  return {
    backendId: id,
    storeCode: `QA_${id}`,
    storeName: `Store ${id}`,
    latitude: 0,
    longitude: 0,
    projectId: "p",
    isActive,
    udfs: { address: "123 Main Street", state: "Maharashtra", shift_start: "06:00" },
  };
}

const udfFields = [
  { fieldKey: "address", name: "Address", type: "alphanumeric", status: true, showInMasterTable: true },
  { fieldKey: "state", name: "State", type: "dropdown", status: true, showInMasterTable: true },
  { fieldKey: "shift_start", name: "Shift Start Time", type: "alphanumeric", status: true, showInMasterTable: true },
] as unknown as UDFField[];

const query = {
  searchInput: "",
  setSearchInput: vi.fn(),
  status: "all",
  setStatus: vi.fn(),
  defaultStatus: "all",
  filters: {},
  setColumnFilter: vi.fn(),
  sort: null,
  setSort: vi.fn(),
  toggleSort: vi.fn(),
  page: 1,
  setPage: vi.fn(),
  pageSize: 20,
  setPageSize: vi.fn(),
  clearAll: vi.fn(),
  filtersActive: false,
  anyActive: false,
  listParams: { status: "all" },
  exportQuery: { status: "all" },
} as unknown as MasterListQueryControls;

function render(fields: UDFField[]) {
  return renderToStaticMarkup(
    <StoreTable
      stores={[store("1", true), store("2", false)]}
      udfFields={fields}
      loading={false}
      projectId="p"
      pagination={{
        page: 1,
        pageSize: 20,
        totalCount: 2,
        totalPages: 1,
        onPageChange: vi.fn(),
        onPageSizeChange: vi.fn(),
      }}
      meta={{ page: 1, pageSize: 20, totalCount: 2, totalPages: 1, activeCount: 1, inactiveCount: 1 }}
      query={query}
      loadFilterValues={vi.fn()}
      onOpenUDFConfig={vi.fn()}
      onRefresh={vi.fn()}
      onExportFiltered={vi.fn()}
    />,
  );
}

function gridTemplates(html: string): string[] {
  return [...html.matchAll(/grid-template-columns:([^;"]+)/g)].map((m) => m[1].trim());
}

describe("StoreTable column alignment", () => {
  it("gives the header, filter row and every row the same grid, with Actions last", () => {
    const grids = gridTemplates(render(udfFields));

    // header + filter row + 2 data rows
    expect(grids).toHaveLength(4);
    expect(new Set(grids).size).toBe(1);
    expect(grids[0]).toBe(
      "minmax(200px, 1.5fr) 130px 100px minmax(120px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) 112px",
    );
  });

  it("stays aligned without UDF columns", () => {
    const grids = gridTemplates(render([]));

    expect(new Set(grids).size).toBe(1);
    expect(grids[0]).toBe("minmax(200px, 1.5fr) 130px 100px 112px");
  });

  it("uses one minimum width for header and rows", () => {
    const html = render(udfFields);
    const minWidths = [...html.matchAll(/min-width:(\d+)px/g)].map((m) => Number(m[1]));
    // 200 (store) + 130 + 100 + 3×120 + 112 + 6 gaps × 12 + 2 × 20 padding
    expect(minWidths.filter((w) => w === 1014).length).toBeGreaterThanOrEqual(4);
  });
});
