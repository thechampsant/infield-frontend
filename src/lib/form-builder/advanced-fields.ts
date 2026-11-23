import type { UdfFormulaExpressionToken, UdfFormulaOperator } from "@/lib/api/udf-config-service";
import type { DataSourceConfig, FormField } from "./types";

export function newDataSource(layout: "hierarchy" | "table", source: DataSourceConfig["source"] = "product-master"): DataSourceConfig {
  return { layout, source, customName: "", chainLevels: [], filterColumns: [], readOnlyColumns: [], editableColumns: [] };
}

/** Preserve the older single-lookup editor until the admin explicitly converts it. */
export function structuredSource(field: FormField): DataSourceConfig | null {
  if (field.type !== "dependent-dropdown" && field.type !== "list-view") return null;
  const data = field.dataSource;
  if (data?.layout) return data;
  if (data?.source === "custom" && (data.customName || data.chainLevels.some(Boolean) || data.filterColumns.some(Boolean))) return null;
  const layout = field.type === "dependent-dropdown" ? "hierarchy" : "table";
  return data && data.source !== "custom" ? { ...data, layout } : newDataSource(layout);
}

const operators: Record<string, UdfFormulaOperator> = { "+": "ADD", "-": "SUBTRACT", "*": "MULTIPLY", "/": "DIVIDE" };

export function formulaTokens(expression: string, fields: FormField[], owner: FormField): UdfFormulaExpressionToken[] {
  const tokens: UdfFormulaExpressionToken[] = [];
  const pattern = /\s*(\{([^{}]+)\}|\d+(?:\.\d+)?|[()+*/-])/y;
  const input = expression.trim().replaceAll("×", "*").replaceAll("÷", "/");
  let offset = 0;
  let depth = 0;
  let needsValue = true;
  while (offset < input.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(input);
    if (!match) throw new Error("Use a field, number, arithmetic operator, or parentheses.");
    offset = pattern.lastIndex;
    const [, token, key] = match;
    if (token === "(" && needsValue) {
      depth++;
      tokens.push({ type: "paren", paren: "OPEN" });
    } else if (token === ")" && !needsValue && depth > 0) {
      depth--;
      tokens.push({ type: "paren", paren: "CLOSE" });
    } else if (operators[token] && !needsValue) {
      needsValue = true;
      tokens.push({ type: "operator", operator: operators[token] });
    } else if (needsValue && (key || /^\d/.test(token))) {
      if (key) {
        if (!fields.some((f) => f.id === key && f.id !== owner.id && ["number", "rating", "calculation"].includes(f.type))) {
          throw new Error("A referenced numeric field is missing or invalid.");
        }
        tokens.push({ type: "field", fieldKey: key });
      } else {
        tokens.push({ type: "constant", value: Number(token) });
      }
      needsValue = false;
    } else {
      throw new Error("Check the order of the values, operators and parentheses.");
    }
  }
  if (depth) throw new Error("Close each opening parenthesis.");
  if (needsValue) throw new Error("Enter a number or field to complete the formula.");
  return tokens;
}

export function validateDataSource(field: FormField, source: DataSourceConfig) {
  if (source.source === "custom" && (!source.customName.trim() || !source.customRows?.length)) {
    throw new Error(`${field.label}: name the custom source and upload its workbook.`);
  }
  if (source.layout === "hierarchy" && source.chainLevels.length < 2) {
    throw new Error(`${field.label}: select at least two hierarchy levels.`);
  }
  if (source.layout !== "table") return;
  if (!source.readOnlyColumns.length && !source.editableColumns.length) throw new Error(`${field.label}: add at least one table column.`);
  const names = new Set(source.readOnlyColumns.map((name) => name.toLowerCase()));
  for (const column of source.editableColumns) {
    const name = column.name.trim().toLowerCase();
    if (!name || names.has(name)) throw new Error(`${field.label}: give each column a distinct name.`);
    names.add(name);
    if (column.type === "dropdown" && !column.options?.some((value) => value.trim())) throw new Error(`${column.name}: enter dropdown options.`);
    if (column.type === "number" && column.min !== undefined && column.max !== undefined && column.min > column.max) {
      throw new Error(`${column.name}: the minimum exceeds the maximum.`);
    }
  }
}

export function hierarchyFields(field: FormField, source: DataSourceConfig, base: { fieldKey: string; label: string; config: Record<string, unknown>; required: boolean; status: boolean }) {
  validateDataSource(field, source);
  const master = source.source === "store-master" ? "STORE" : "PRODUCT";
  const levels = source.chainLevels;
  const indexes = levels.map((level) => source.customHeaders?.indexOf(level) ?? -1);
  const key = (index: number) => index === levels.length - 1 ? field.id : `${field.id}__level_${index + 1}`;
  return levels.map((level, i) => {
    const last = i === levels.length - 1;
    const config: Record<string, unknown> = { ...base.config };
    if (last) config.hierarchy = source;
    else config.hierarchyOwner = field.id;
    if (i) config.dependsOn = key(i - 1);
    let type = i ? "CASCADING_SELECT" : "API_SELECT";
    if (source.source === "custom") {
      const options = new Map<string, {label: string; value: string; parentValue?: string}>();
      for (const row of source.customRows ?? []) {
        const path = indexes.slice(0, i + 1).map((index) => row[index]);
        if (path.some((part) => !part)) throw new Error(`${field.label}: every hierarchy level needs a value.`);
        const label = path[i];
        const value = last || i === 0 ? label : JSON.stringify(path);
        const parentValue = i === 1 ? path[0] : JSON.stringify(path.slice(0, -1));
        options.set(JSON.stringify(path), i ? { label, value, parentValue } : { label, value });
      }
      config.options = [...options.values()];
      if (!i) type = "DROPDOWN";
    } else if (i) {
      Object.assign(config, { sourceKey: master, parentField: levels[i - 1], valueField: level });
    } else {
      Object.assign(config, { dataSource: master, labelField: level, valueField: level });
    }
    return { ...base, fieldKey: key(i), label: last ? field.label : level, config, type };
  });
}
