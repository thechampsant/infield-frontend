import { describe, expect, it } from "vitest";
import { resolveReportDatePreset, resolveReportDefaultDateRange } from "./report-date-presets";

describe("report default date range", () => {
  it.each([
    ["2026-11-06T06:00:00Z", "2026-11-01", "2026-11-05"],
    ["2026-11-01T06:00:00Z", "2026-11-01", "2026-11-01"],
    ["2027-01-01T06:00:00Z", "2027-01-01", "2027-01-01"],
    ["2026-11-02T06:00:00Z", "2026-11-01", "2026-11-01"],
    ["2028-02-29T06:00:00Z", "2028-02-01", "2028-02-28"],
    ["2028-03-01T06:00:00Z", "2028-03-01", "2028-03-01"],
    ["2026-10-31T18:29:59Z", "2026-10-01", "2026-10-30"],
    ["2026-10-31T18:30:00Z", "2026-11-01", "2026-11-01"],
    ["2026-12-31T18:30:00Z", "2027-01-01", "2027-01-01"],
  ])("uses India calendar dates at %s", (now, fromDate, toDate) => {
    expect(resolveReportDefaultDateRange(new Date(now))).toEqual({ fromDate, toDate });
  });
});

describe("existing Month and Week presets", () => {
  it.each([
    ["thisMonth", "2026-11-06T06:00:00Z", "2026-11-01", "2026-11-06"],
    ["thisWeek", "2026-11-06T06:00:00Z", "2026-11-02", "2026-11-06"],
    ["lastWeek", "2026-11-06T06:00:00Z", "2026-10-26", "2026-11-01"],
    ["thisWeek", "2026-11-01T06:00:00Z", "2026-10-26", "2026-11-01"],
    ["thisWeek", "2026-11-02T06:00:00Z", "2026-11-02", "2026-11-02"],
    ["lastWeek", "2027-01-01T06:00:00Z", "2026-12-21", "2026-12-27"],
  ] as const)("preserves %s at %s", (preset, now, fromDate, toDate) => {
    expect(resolveReportDatePreset(preset, new Date(now))).toEqual({ fromDate, toDate });
  });
});
