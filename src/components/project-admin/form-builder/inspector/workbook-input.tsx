import { useEffect, useRef, useState } from "react";

export function WorkbookInput({ headers, hierarchy = false, loaded, onLoad }: {
  headers: string[]; hierarchy?: boolean; loaded: number;
  onLoad: (headers: string[], rows: string[][]) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  useEffect(() => () => { revision.current++; }, []);
  async function upload(file: File) {
    const request = ++revision.current;
    setBusy(true);
    setError("");
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error("Choose an .xlsx workbook of 5 MB or less.");
      const { readWorkbook } = await import("@/lib/form-builder/option-workbook");
      const result = await readWorkbook(await file.arrayBuffer(), hierarchy);
      if (request === revision.current) onLoad(result.headers, result.rows);
    } catch (err) {
      if (request === revision.current) setError(err instanceof Error ? err.message : "Could not read workbook.");
    } finally {
      if (request === revision.current) setBusy(false);
    }
  }

  async function download() {
    try {
      const { makeTemplate } = await import("@/lib/form-builder/option-workbook");
      const bytes = await makeTemplate(headers);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
      const link = document.createElement("a");
      link.href = url;
      link.download = hierarchy ? "form-data-template.xlsx" : "option-values.xlsx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not generate the Excel template.");
    }
  }
  return <>
    <button type="button" onClick={download}>Download Excel template</button>
    <label>Upload .xlsx<input type="file" accept=".xlsx" onChange={(event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void upload(file);
    }} /></label>
    <span role="status">{busy ? "Reading workbook…" : loaded ? `${loaded} ${hierarchy ? "rows" : "values"} loaded` : ""}</span>
    {error && <span role="alert">{error}</span>}
  </>;
}
