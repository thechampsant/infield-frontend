import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportConfigDocument } from "@/lib/api/report-config-service";
import type { ReportExportSnapshot } from "@/lib/api/report-export-session";

const exportState = vi.hoisted(() => ({
  snapshot: { job: null, error: null, starting: false } as ReportExportSnapshot,
  listener: null as (() => void) | null,
}));

// Exercise viewer callbacks in the existing Node test environment without a DOM
// or live services. State persists across explicit renders; effects run on mount.
const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  effects: [] as Array<() => unknown>,
  mounting: true,
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) {
      hooks.values[index] = typeof initial === "function" ? initial() : initial;
    }
    return [hooks.values[index], (next: unknown) => {
      hooks.values[index] = typeof next === "function" ? next(hooks.values[index]) : next;
    }];
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => unknown) => {
    if (hooks.mounting) hooks.effects.push(effect);
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/project-admin/project-context", () => ({
  useProjectContext: () => ({ projectId: "project-17" }),
}));
vi.mock("@/lib/api/report-config-service", () => ({
  reportConfigService: { getConfig: vi.fn(), executeReport: vi.fn() },
}));
vi.mock("@/lib/api/orient-report-service", () => ({
  orientReportService: { executeReport: vi.fn() },
}));
vi.mock("@/lib/api/report-export-session", () => ({
  createReportExportVisitId: () => 1,
  reportExportSessionKey: (project: string, report: string, visit: number) => `${project}:${report}:${visit}`,
  getReportExportSnapshot: () => exportState.snapshot,
  subscribeReportExport: vi.fn((_key: string, listener: () => void) => {
    exportState.listener = listener;
    listener();
    return vi.fn();
  }),
  clearReportExport: vi.fn(() => {
    exportState.snapshot = { job: null, error: null, starting: false };
    exportState.listener?.();
  }),
  startReportExport: vi.fn(),
  downloadReportExport: vi.fn(),
}));

import { reportConfigService } from "@/lib/api/report-config-service";
import { orientReportService } from "@/lib/api/orient-report-service";
import { clearReportExport, startReportExport } from "@/lib/api/report-export-session";
import { ReportViewPage } from "./report-view-page";

type Element = ReactElement<{
  children?: ReactNode;
  type?: string;
  value?: unknown;
  filter?: { controlType: string };
  onClick?: () => unknown;
  data?: Record<string, unknown>[];
  totalCount?: number;
  job?: ReportExportSnapshot["job"];
  preparing?: boolean;
  disabled?: boolean;
  onPageChange?: (page: number) => unknown;
  onChange?: (event: { target: { value: string } }) => void;
}>;

function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}

const props = { accountCode: "ACC-000015", projectCode: "PRJ-000017", reportId: "report-1" };
function render(projectCode = props.projectCode, reportId = props.reportId) {
  hooks.cursor = 0;
  return ReportViewPage({ ...props, projectCode, reportId });
}
function dateInputs(tree: ReactNode) {
  return elements(tree).filter((element) => element.type === "input" && element.props.type === "date");
}
function button(tree: ReactNode, label: string) {
  const found = elements(tree).find((element) =>
    element.type === "button" && elementsText(element.props.children) === label,
  );
  expect(found, label).toBeDefined();
  return found!;
}
function elementsText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(elementsText).join("");
  return "";
}
async function mount(projectCode = props.projectCode, direct = false) {
  vi.mocked(reportConfigService.getConfig).mockResolvedValue({
    projectId: "project-17",
    reportName: "Test report",
    primarySource: { sourceKey: "ATTENDANCE", collectionName: "attendance" },
    accessRoles: [], dataScope: {}, status: "published",
    selectedColumns: [], calculatedFields: [],
    filters: [
      { fieldKey: "workDate", controlType: "date-range", sourceKey: "ATTENDANCE", fieldType: "DATE", order: 0 },
      { fieldKey: "designation", controlType: "dropdown", sourceKey: "ATTENDANCE", fieldType: "TXT", order: 1 },
    ],
    outputSettings: { exportBehaviour: direct ? "direct" : "load-then-export", fileFormat: "xls" },
  } satisfies ReportConfigDocument);
  render(projectCode);
  hooks.mounting = false;
  hooks.effects.forEach((effect) => effect());
  await Promise.resolve();
  return render(projectCode);
}
function expectNoExecution() {
  expect(reportConfigService.executeReport).not.toHaveBeenCalled();
  expect(orientReportService.executeReport).not.toHaveBeenCalled();
  expect(startReportExport).not.toHaveBeenCalled();
}

describe("web report default selection and explicit actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exportState.snapshot = { job: null, error: null, starting: false };
    exportState.listener = null;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T06:00:00Z"));
    hooks.values = []; hooks.cursor = 0; hooks.effects = []; hooks.mounting = true;
    vi.mocked(reportConfigService.executeReport).mockResolvedValue({
      data: [], columns: [], meta: { totalCount: 0, page: 1, pageSize: 50, totalPages: 0 },
    });
    vi.mocked(orientReportService.executeReport).mockResolvedValue({
      data: [], columns: [], meta: { totalCount: 0, page: 1, pageSize: 50, totalPages: 0 },
    });
  });
  afterEach(() => vi.useRealTimers());

  it.each(["PRJ-000017", "PRJ-000021"])("defaults global and configured ranges for %s without execution", async (project) => {
    const tree = await mount(project);
    expect(dateInputs(tree).map((input) => input.props.value)).toEqual(["2026-11-01", "2026-11-05"]);
    const filters = elements(tree).filter((element) => element.props.filter);
    expect(filters.map((filter) => filter.props.value)).toEqual([
      { start: "2026-11-01", end: "2026-11-05" }, undefined,
    ]);
    expectNoExecution();
  });

  it("shows the first day alone", async () => {
    vi.setSystemTime(new Date("2026-12-01T06:00:00Z"));
    expect(dateInputs(await mount()).map((input) => input.props.value)).toEqual(["2026-12-01", "2026-12-01"]);
    expectNoExecution();
  });

  it("retains manual edits and loads them only after Load", async () => {
    let tree = await mount();
    dateInputs(tree)[0].props.onChange!({ target: { value: "2026-10-15" } });
    tree = render();
    expect(dateInputs(tree)[0].props.value).toBe("2026-10-15");
    expectNoExecution();
    await button(tree, "Load").props.onClick!();
    expect(reportConfigService.executeReport).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      reportId: "report-1", fromDate: "2026-10-15", toDate: "2026-11-05",
      filters: { workDate: { start: "2026-11-01", end: "2026-11-05" } },
    }));
  });

  it("exports the defaults only after an explicit Export click", async () => {
    const tree = await mount(props.projectCode, true);
    expectNoExecution();
    await button(tree, "Export").props.onClick!();
    expect(startReportExport).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      projectId: "project-17", reportId: "report-1", fromDate: "2026-11-01", toDate: "2026-11-05",
      filters: { workDate: { start: "2026-11-01", end: "2026-11-05" } },
    }));
  });

  it("uses the MTD defaults on the Orient Load path", async () => {
    const tree = await mount("PRJ-000021");
    await button(tree, "Load").props.onClick!();
    expect(orientReportService.executeReport).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      exportType: "attendance", projectId: "project-17", fromDate: "2026-11-01", toDate: "2026-11-05",
    }));
    expect(reportConfigService.executeReport).not.toHaveBeenCalled();
  });

  it.each([
    ["This month", "2026-11-01", "2026-11-06"],
    ["This week", "2026-11-02", "2026-11-06"],
    ["Last week", "2026-10-26", "2026-11-01"],
  ])("preserves %s without execution", async (label, start, end) => {
    const tree = await mount();
    button(tree, label).props.onClick!();
    expect(dateInputs(render()).map((input) => input.props.value)).toEqual([start, end]);
    expectNoExecution();
  });

  it("allows clearing dates without restoring defaults on rerender", async () => {
    const tree = await mount();
    button(tree, "Clear").props.onClick!();
    expect(dateInputs(render()).map((input) => input.props.value)).toEqual(["", ""]);
    expectNoExecution();
  });

  it("keeps Load separate from Excel preparation after reverting point 2", async () => {
    const tree = await mount();
    await button(tree, "Load").props.onClick!();
    expect(reportConfigService.executeReport).toHaveBeenCalledTimes(1);
    expect(startReportExport).not.toHaveBeenCalled();
  });

  it("retains loaded rows while another Load is pending", async () => {
    vi.mocked(reportConfigService.executeReport).mockResolvedValueOnce({
      data: [{ Name: "previous" }], columns: [],
      meta: { totalCount: 100, page: 1, pageSize: 50, totalPages: 2 },
    });
    await button(await mount(), "Load").props.onClick!();
    let finish!: (value: Awaited<ReturnType<typeof reportConfigService.executeReport>>) => void;
    vi.mocked(reportConfigService.executeReport).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const pending = button(render(), "Load").props.onClick!();
    expect(elements(render()).find((element) => element.props.onPageChange)?.props.data).toEqual([{ Name: "previous" }]);
    finish({ data: [], columns: [], meta: { totalCount: 0, page: 1, pageSize: 50, totalPages: 0 } });
    await pending;
    expect(startReportExport).not.toHaveBeenCalled();
  });

  it("preserves the original pagination API contract without clearing Excel", async () => {
    vi.mocked(reportConfigService.executeReport).mockResolvedValueOnce({
      data: [{ Name: "first" }], columns: [],
      meta: { totalCount: 100, page: 1, pageSize: 50, totalPages: 2 },
    });
    await button(await mount(), "Load").props.onClick!();
    const table = elements(render()).find((element) => element.props.onPageChange)!;
    vi.mocked(clearReportExport).mockClear();
    vi.mocked(reportConfigService.executeReport).mockResolvedValueOnce({
      data: [{ Name: "second" }], columns: [],
      meta: { totalCount: 100, page: 2, pageSize: 50, totalPages: 2 },
    });
    table.props.onPageChange!(2);
    await Promise.resolve();
    expect(reportConfigService.executeReport).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(reportConfigService.executeReport).toHaveBeenLastCalledWith(expect.not.objectContaining({ includeTotalCount: expect.anything() }));
    expect(elements(render()).find((element) => element.props.onPageChange)?.props.totalCount).toBe(100);
    expect(startReportExport).not.toHaveBeenCalled();
    expect(clearReportExport).not.toHaveBeenCalled();
  });

  it("clears the ready banner before Load starts, without starting an export", async () => {
    await mount();
    exportState.snapshot = { job: { jobId: "old", status: "ready", reportId: "report-1", format: "xls" }, error: null, starting: false };
    exportState.listener!();
    expect(elements(render()).find((element) => element.props.job)?.props.job?.jobId).toBe("old");
    vi.mocked(reportConfigService.executeReport).mockImplementationOnce(async () => {
      expect(exportState.snapshot.job).toBeNull();
      return { data: [], columns: [], meta: { totalCount: 0, page: 1, pageSize: 50, totalPages: 0 } };
    });
    await button(render(), "Load").props.onClick!();
    expect(clearReportExport).toHaveBeenCalledWith("project-17:report-1:1");
    expect(startReportExport).not.toHaveBeenCalled();
  });

  it("shows preparation and disables Export while submission is starting", async () => {
    await mount(props.projectCode, true);
    exportState.snapshot = { job: null, error: null, starting: true };
    exportState.listener!();
    const tree = render();
    expect(button(tree, "Preparing Excel…").props.disabled).toBe(true);
    expect(elements(tree).find((element) => element.props.preparing)?.props.preparing).toBe(true);
  });

  it("hides the previous report's snapshot immediately when the route changes", async () => {
    await mount();
    exportState.snapshot = { job: { jobId: "old", status: "ready", reportId: "report-1", format: "xls" }, error: null, starting: false };
    exportState.listener!();
    expect(elements(render(props.projectCode, "report-2")).some((element) => element.props.job)).toBe(false);
  });
});
