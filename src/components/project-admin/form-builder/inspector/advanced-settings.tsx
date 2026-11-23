import { useEffect, useState } from "react";
import { productService } from "@/lib/api/product-service";
import { storeService } from "@/lib/api/store-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import type { DataSourceConfig, EditableColumn, FormField } from "@/lib/form-builder/types";
import { formulaTokens, newDataSource, structuredSource } from "@/lib/form-builder/advanced-fields";
import { TablePreview } from "./table-preview";
import { WorkbookInput } from "./workbook-input";
import styles from "./advanced-settings.module.css";

type Props = { field: FormField; update: (patch: Partial<FormField>) => void };
type ColumnChoice = { key: string; label: string };
const baseColumns = {
  PRODUCT: [["category", "Category"], ["productCode", "SKU Code"], ["productName", "Product Name"]],
  STORE: [["storeCode", "Store Code"], ["storeName", "Store Name"], ["storeType", "Store Type"]],
};

function useMasterColumns(master: "PRODUCT" | "STORE") {
  const { projectId } = useProjectContext();
  const [schema, setSchema] = useState<{ projectId: string; master: string; columns: ColumnChoice[] } | null>(null);
  const extra = schema?.projectId === projectId && schema.master === master ? schema.columns : [];
  useEffect(() => {
    let active = true;
    if (projectId) {
      const service = master === "PRODUCT" ? productService : storeService;
      service.getFormFields(projectId).then((fields) => {
        if (active) setSchema({ projectId, master, columns: fields
          .filter((f) => f.status !== false).map((f) => ({ key: f.fieldKey, label: f.name })) });
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [master, projectId]);
  const columns = baseColumns[master].map(([key, label]) => ({ key, label }));
  return [...new Map([...columns, ...extra].map((column) => [column.key, column])).values()];
}

function Columns({ label, choices, selected, change }: {
  label: string; choices: ColumnChoice[]; selected: string[]; change: (columns: string[]) => void;
}) {
  const labels = new Map(choices.map((column) => [column.key, column.label]));
  return <fieldset><legend>{label}</legend>
    <div className={styles.choices}>
      {[...new Set([...labels.keys(), ...selected])].map((key) => <button key={key} type="button"
        aria-pressed={selected.includes(key)} onClick={() => change(selected.includes(key) ? selected.filter((v) => v !== key) : [...selected, key])}>
        {labels.get(key) ?? key}
      </button>)}
    </div>
    {selected.length > 0 && <output>{selected.map((key) => labels.get(key) ?? key).join(" → ")}</output>}
  </fieldset>;
}

export function OptionDataSettings({ field, update }: Props) {
  const mapped = field.optionsSource === "from-mapping";
  const master = mapped || field.masterEntity === "STORE" ? "STORE" : "PRODUCT";
  const choices = useMasterColumns(master);
  const columns = field.displayColumns ?? [];
  return <div className={styles.panel}>
    {field.optionsSource === "excel" ? <WorkbookInput headers={["Value"]} loaded={field.excelOptions?.length ?? field.excelOptionsCount}
      onLoad={(_, rows) => {
        const values = [...new Set(rows.map(([value]) => value))];
        update({ excelOptions: values, excelOptionsCount: values.length });
      }} /> : <>
      {mapped ? <p>Store Mapping uses the stores assigned to the field user.</p> :
        <label>Master<select value={master} onChange={(e) => update({ masterEntity: e.target.value, displayColumns: [] })}>
          <option value="PRODUCT">Product Master</option><option value="STORE">Store Master</option>
        </select></label>}
      <Columns label="Display columns" choices={choices} selected={columns} change={(displayColumns) => update({ displayColumns })} />
      {columns.length > 0 && <span>Preview: {columns.map((key) => choices.find((c) => c.key === key)?.label ?? key).join(" + ")}</span>}
    </>}
  </div>;
}

function EditableColumns({ columns, change }: { columns: EditableColumn[]; change: (columns: EditableColumn[]) => void }) {
  function patch(index: number, changes: Partial<EditableColumn>) {
    change(columns.map((column, i) => i === index ? { ...column, ...changes } : column));
  }
  return <>
    {columns.map((column, i) => <fieldset key={column.id ?? i}><legend>Editable column {i + 1}</legend>
      <label>Name<input value={column.name} onChange={(e) => patch(i, { name: e.target.value })} /></label>
      <label>Type<select value={column.type} onChange={(e) => patch(i, { type: e.target.value as EditableColumn["type"], options: undefined, min: undefined, max: undefined })}>
        {["text", "number", "alphanumeric", "date", "dropdown"].map((type) => <option key={type}>{type}</option>)}
      </select></label>
      <label><span><input type="checkbox" checked={column.required} onChange={(e) => patch(i, { required: e.target.checked })} /> Required</span></label>
      {column.type === "number" && (["min", "max"] as const).map((bound) => <label key={bound}>{bound === "min" ? "Minimum" : "Maximum"}
        <input type="number" value={column[bound] ?? ""} onChange={(e) => patch(i, { [bound]: e.target.value === "" ? undefined : e.target.valueAsNumber })} />
      </label>)}
      {column.type === "dropdown" && <label>Choices (one per line)<textarea value={column.options?.join("\n") ?? ""} onChange={(e) => patch(i, { options: e.target.value.split("\n") })} /></label>}
      <div className={styles.choices}>
        {i > 0 && <button type="button" onClick={() => { const next = [...columns]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; change(next); }}>Move up</button>}
        <button type="button" onClick={() => change(columns.filter((_, index) => i !== index))}>Remove column</button>
      </div>
    </fieldset>)}
    <button type="button" onClick={() => change([...columns, { id: crypto.randomUUID(), name: "", type: "text", required: false }])}>Add editable column</button>
  </>;
}

export function StructuredDataSettings({ field, update }: Props) {
  const hierarchy = field.type === "dependent-dropdown";
  const layout = hierarchy ? "hierarchy" : "table";
  const data = structuredSource(field) ?? newDataSource(layout);
  const masterColumns = useMasterColumns(data.source === "store-master" ? "STORE" : "PRODUCT");
  const [level, setLevel] = useState("");
  const custom = data.source === "custom";
  const choices = custom ? (data.customHeaders ?? []).map((key) => ({ key, label: key })) : masterColumns;
  const patch = (changes: Partial<DataSourceConfig>) => update({ dataSource: { ...data, layout, ...changes } });
  const upload = (headers: string[], rows: string[][]) => {
    if (hierarchy && data.chainLevels.some((name) => !headers.includes(name))) throw new Error("The workbook headers must include every configured level.");
    patch({ customHeaders: headers, customRows: rows,
      chainLevels: hierarchy && !data.chainLevels.length ? headers : data.chainLevels,
      filterColumns: data.filterColumns.filter((key) => headers.includes(key)), readOnlyColumns: data.readOnlyColumns.filter((key) => headers.includes(key)) });
  };
  return <div className={styles.panel}>
    <label>Data source<select value={data.source} onChange={(e) => {
      update({ dataSource: newDataSource(layout, e.target.value as DataSourceConfig["source"]) }); setLevel("");
    }}>
      <option value="product-master">Product Master</option><option value="store-master">Store Master</option><option value="custom">Custom Excel</option>
    </select></label>
    {custom && <>
      <label>Source name<input value={data.customName} onChange={(e) => patch({ customName: e.target.value })} /></label>
      {hierarchy && <label>Custom level name<input value={level} onChange={(e) => setLevel(e.target.value)} />
        <button type="button" disabled={!level.trim() || data.chainLevels.includes(level.trim()) || Boolean(data.customRows?.length)}
          onClick={() => { patch({ chainLevels: [...data.chainLevels, level.trim()] }); setLevel(""); }}>Add level</button></label>}
      <WorkbookInput hierarchy headers={data.chainLevels.length ? data.chainLevels : hierarchy ? ["Region", "State", "City"] : ["Code", "Name"]}
        loaded={data.customRows?.length ?? 0} onLoad={upload} />
    </>}
    {hierarchy ? <Columns label="Hierarchy levels (select in order)" choices={choices} selected={data.chainLevels} change={(chainLevels) => patch({ chainLevels })} /> : <>
      <Columns label="Filter levels" choices={choices} selected={data.filterColumns} change={(filterColumns) => patch({ filterColumns })} />
      <Columns label="Read-only columns" choices={choices} selected={data.readOnlyColumns} change={(readOnlyColumns) => patch({ readOnlyColumns })} />
      <EditableColumns columns={data.editableColumns} change={(editableColumns) => patch({ editableColumns })} />
      <TablePreview key={JSON.stringify([data.source, data.customHeaders, data.filterColumns, data.customRows])} data={data} />
    </>}
  </div>;
}

export function CalculationSettings({ field, update, fields }: Props & { fields: FormField[] }) {
  const candidates = fields.filter((f) => f.id !== field.id && ["number", "rating", "calculation"].includes(f.type));
  const insert = (token: string) => update({ formula: [field.formula.trim(), token].filter(Boolean).join(" ") });
  let error = "";
  try { formulaTokens(field.formula, fields, field); } catch (err) { error = err instanceof Error ? err.message : "Invalid formula"; }
  return <div className={styles.panel}>
    <label>Formula<textarea value={field.formula} onChange={(e) => update({ formula: e.target.value })} /></label>
    <div className={styles.choices}>{candidates.map((f) => <button key={f.id} type="button" onClick={() => insert(`{${f.id}}`)}>{f.label || "Number"}</button>)}</div>
    <div className={styles.choices}>{["+", "-", "×", "÷", "(", ")"].map((op) => <button type="button" key={op} onClick={() => insert(op)}>{op}</button>)}</div>
    {field.formula && <output>{field.formula.replace(/\{([^{}]+)\}/g, (match, key) => candidates.find((f) => f.id === key)?.label ?? match)}</output>}
    {field.formula && error && <span role="alert">{error}</span>}
    <label>Result format<select value={field.formulaResultFormat} onChange={(e) => update({ formulaResultFormat: e.target.value as FormField["formulaResultFormat"] })}>
      <option value="number">Number</option><option value="currency">Currency (₹)</option><option value="percentage">Percentage (%)</option>
    </select></label>
  </div>;
}
