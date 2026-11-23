import { Workbook } from "exceljs";

export async function makeTemplate(headers: string[]) {
  const book = new Workbook();
  const sheet = book.addWorksheet("Data");
  sheet.addRow(headers);
  sheet.columns.forEach((column) => { column.width = 24; });
  return book.xlsx.writeBuffer();
}

export async function readWorkbook(bytes: ArrayBuffer, hierarchy: boolean) {
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Choose an .xlsx file of 5 MB or less.");
  const book = new Workbook();
  await book.xlsx.load(bytes);
  const sheet = book.worksheets[0];
  if (!sheet) throw new Error("The workbook has no worksheet.");
  const first = sheet.getRow(1);
  const width = hierarchy ? first.cellCount : 1;
  const headers = Array.from({ length: width }, (_, i) => first.getCell(i + 1).text.trim());
  if (hierarchy && (!width || headers.some((name) => !name) || new Set(headers).size !== width)) {
    throw new Error("Give each column a distinct header in the first row.");
  }
  const rows: string[][] = [];
  const hasHeader = hierarchy || headers[0]?.toLowerCase() === "value";
  sheet.eachRow((row, index) => {
    if (index === 1 && hasHeader) return;
    const values = headers.map((_, i) => row.getCell(i + 1).text.trim());
    if (!values.some(Boolean)) return;
    if (values.some((value) => !value)) throw new Error(`Row ${index} has an empty cell.`);
    rows.push(values);
    if (rows.length > 2000) throw new Error("Import up to 2,000 data rows at a time.");
  });
  if (!rows.length) throw new Error("Enter at least one data row.");
  return { headers, rows };
}
