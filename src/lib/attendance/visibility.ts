import type { UdfSchemaField, UdfVisibilityRule } from "../api/udf-config-service";

export function attendanceVisibilityConfig(
  config: UdfSchemaField["config"],
  rules: UdfSchemaField["visibilityRules"],
): UdfSchemaField["config"] {
  const conditional = Boolean(rules?.length);
  if (!conditional && (config as Record<string, unknown> | undefined)?.visibilityMode !== "conditional") return config;
  return { ...config, visibilityMode: conditional ? "conditional" : "always" };
}

export function visibilityParents(fields: UdfSchemaField[], selected: UdfSchemaField) {
  return fields.filter((field) => field !== selected && field.fieldKey !== selected.fieldKey &&
    Boolean(field.fieldKey.trim()) && field.status !== false &&
    ["STRING", "DROPDOWN", "SELECT", "API_SELECT"].includes(field.type) &&
    (field.config as Record<string, unknown> | undefined)?.multiple !== true);
}

export function canEditVisibility(fields: UdfSchemaField[], field: UdfSchemaField): boolean {
  const rules = field.visibilityRules ?? [];
  return rules.length === 0 || (rules.length === 1 &&
    visibilityParents(fields, field).some((parent) => parent.fieldKey === rules[0].dependsOnField) &&
    rules[0].showWhen.every((value) => typeof value === "string" &&
      value === value.trim() && !/[,\r\n]/.test(value)));
}

export function visibilityForParent(parent: string): UdfVisibilityRule[] | undefined {
  return parent ? [{ dependsOnField: parent, showWhen: [] }] : undefined;
}

export function visibilityForValues(parent: string, text: string): UdfVisibilityRule[] {
  return [{ dependsOnField: parent, showWhen: text.split(",").map((value) => value.trim()).filter(Boolean) }];
}

export function validateAttendanceVisibility(
  fields: UdfSchemaField[],
  remarksRequired: boolean,
  savedFields: UdfSchemaField[] = [],
): string[] {
  const errors: string[] = [];
  const byKey = new Map(fields.map((field) => [field.fieldKey.trim(), field]));
  for (const field of fields) {
    const rules = field.visibilityRules ?? [];
    const saved = savedFields.find((item) => item.fieldKey === field.fieldKey);
    const unchanged = JSON.stringify(rules) === JSON.stringify(saved?.visibilityRules ?? []);
    if (remarksRequired && field.fieldKey.trim() === "remarks" && rules.length && !unchanged) {
      errors.push("Required remarks must remain always visible. Remove its conditional visibility.");
    }
    for (const rule of rules) {
      const parent = byKey.get(rule.dependsOnField);
      if (!parent) errors.push(`${field.label}: dependency "${rule.dependsOnField}" is missing. Select another parent or choose Always visible.`);
      else if (parent === field) errors.push(`${field.label}: a field cannot depend on itself.`);
      else if (!unchanged && !visibilityParents(fields, field).includes(parent)) {
        errors.push(`${field.label}: choose an active text or single-select dependency.`);
      }
      if (!Array.isArray(rule.showWhen) || !rule.showWhen.length ||
        rule.showWhen.some((value) => typeof value === "string" && !value.trim())) {
        errors.push(`${field.label}: enter at least one Show When value.`);
      }
    }
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(key: string): boolean {
    if (visiting.has(key)) return true;
    if (visited.has(key)) return false;
    visiting.add(key);
    for (const rule of byKey.get(key)?.visibilityRules ?? []) {
      if (byKey.has(rule.dependsOnField) && visit(rule.dependsOnField)) return true;
    }
    visiting.delete(key);
    visited.add(key);
    return false;
  }
  if (fields.some((field) => visit(field.fieldKey.trim()))) {
    errors.push("Conditional visibility contains a dependency cycle. Remove a dependency before saving.");
  }
  return errors;
}
