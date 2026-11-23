import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";
import { makeTemplate, readWorkbook } from "./option-workbook";

describe("Excel import", () => {
  it("loads 150 values from the downloadable template", async () => {
    const book = new Workbook();
    await book.xlsx.load(await makeTemplate(["Value"]));
    for (let i = 1; i <= 150; i++) book.worksheets[0].addRow([`Tier ${i}`]);
    const result = await readWorkbook(await book.xlsx.writeBuffer(), false);
    expect(result.rows).toHaveLength(150);
    expect(result.rows[149]).toEqual(["Tier 150"]);
  });

  it("rejects incomplete custom hierarchy rows and empty templates", async () => {
    const book = new Workbook();
    const template = await makeTemplate(["Region", "City"]);
    await expect(readWorkbook(template, true)).rejects.toThrow(/one data row/);
    await book.xlsx.load(template);
    book.worksheets[0].addRow(["South"]);
    await expect(readWorkbook(await book.xlsx.writeBuffer(), true)).rejects.toThrow(/Row 2/);
  });
});
