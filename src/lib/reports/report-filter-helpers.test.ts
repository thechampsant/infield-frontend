import { describe, expect, it } from "vitest";
import type { ReportSelectedColumn } from "@/lib/api/report-config-service";
import {
  formatMultiValueText,
  isSameFilterValue,
  parseMultiValueText,
  resolveReportFilterLabel,
} from "./report-filter-helpers";

function column(fieldKey: string, headerName: string): ReportSelectedColumn {
  return { fieldKey, sourceKey: "USER_MASTER", headerName, order: 1, fieldType: "TXT" };
}

describe("parseMultiValueText", () => {
  it("keeps spaces inside each value and splits on commas", () => {
    expect(parseMultiValueText("Modern Retail, Key Accounts")).toEqual([
      "Modern Retail",
      "Key Accounts",
    ]);
  });

  it("ignores a trailing space or comma while the admin is still typing", () => {
    expect(parseMultiValueText("Modern ")).toEqual(["Modern"]);
    expect(parseMultiValueText("Modern Retail,")).toEqual(["Modern Retail"]);
    expect(parseMultiValueText(" , ")).toEqual([]);
  });
});

describe("isSameFilterValue", () => {
  it("treats the text being typed as unchanged when it parses to the current value", () => {
    expect(isSameFilterValue("Modern Retail, ", ["Modern Retail"])).toBe(true);
    expect(isSameFilterValue("Modern ", ["Modern"])).toBe(true);
    expect(isSameFilterValue("", undefined)).toBe(true);
  });

  it("detects a value that was reset from outside the input", () => {
    expect(isSameFilterValue("Modern Retail", undefined)).toBe(false);
    expect(isSameFilterValue("Modern Retail", ["GT"])).toBe(false);
  });
});

describe("formatMultiValueText", () => {
  it("joins array values for display", () => {
    expect(formatMultiValueText(["Modern Retail", "GT"])).toBe("Modern Retail, GT");
    expect(formatMultiValueText("ISP")).toBe("ISP");
    expect(formatMultiValueText(undefined)).toBe("");
  });
});

describe("resolveReportFilterLabel", () => {
  const columns = [
    column("userMaster.designation", "Designation"),
    column("userMaster.udf.agencyName", "Agency Name"),
    column("mappedStore.udf.locationType", "Loction Type"),
    column("manager.l1.employeeId", "Manager E code "),
    column("employeeId", "Employee ID"),
  ];

  it("uses the current header of the column the filter belongs to", () => {
    expect(resolveReportFilterLabel({ fieldKey: "designation" }, columns)).toBe("Designation");
    expect(resolveReportFilterLabel({ fieldKey: "agencyName" }, columns)).toBe("Agency Name");
    expect(resolveReportFilterLabel({ fieldKey: "locationType" }, columns)).toBe("Loction Type");
    expect(resolveReportFilterLabel({ fieldKey: "employeeId" }, columns)).toBe("Employee ID");
  });

  it("follows a renamed column", () => {
    const renamed = [column("userMaster.udf.function", "Channel")];
    expect(resolveReportFilterLabel({ fieldKey: "function" }, renamed)).toBe("Channel");
  });

  it("trims the header and falls back to the field key", () => {
    expect(resolveReportFilterLabel({ fieldKey: "manager.l1.employeeId" }, columns)).toBe(
      "Manager E code",
    );
    expect(resolveReportFilterLabel({ fieldKey: "dept" }, columns)).toBe("dept");
    expect(resolveReportFilterLabel({ fieldKey: "dept" }, undefined)).toBe("dept");
  });
});
