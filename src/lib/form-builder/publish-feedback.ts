import { ApiError } from "@/lib/api/api-client";
import type { ApiValidationDetail } from "./form-builder-api";
import type { FormConfiguration } from "./types";

export function checkPublishFields(form: FormConfiguration) {
  const errors: string[] = [];
  const warnings: ApiValidationDetail[] = [];
  if (!form.fields.length) errors.push("Add at least one field.");
  if (!form.designations.length) {
    warnings.push({ rule: "no_designations", fieldId: null, severity: "warning", message: "No designations assigned. The form will not be shown to any user." });
  }
  form.fields.forEach((field, index) => {
    const name = field.label.trim() || `Field ${index + 1}`;
    if (!field.label.trim()) errors.push(`${name} has an empty label.`);
    const { minValue, maxValue } = field.typeConfig;
    if (field.type === "number" && minValue != null && maxValue != null && minValue > maxValue) {
      errors.push(`${name}: min (${minValue}) > max (${maxValue}).`);
    }
    const hasVisibilityRule = field.visibilityRules.some((rule) =>
      rule.sourceFieldId && (rule.operator === "is_empty" || rule.operator === "is_not_empty" || String(rule.value ?? "").trim()));
    if (field.visibility === "conditional" && !hasVisibilityRule) {
      warnings.push({ rule: "conditional_visibility_no_rules", fieldId: field.id, severity: "warning", message: `${name} has conditional visibility but no rules defined.` });
    }
  });
  return { errors, warnings };
}

export function publishReceipt(form: FormConfiguration, serverWarnings: ApiValidationDetail[], localWarnings: ApiValidationDetail[] = []) {
  const warnings = [...serverWarnings, ...localWarnings.filter((local) =>
    !serverWarnings.some((remote) => remote.rule === local.rule && remote.fieldId === local.fieldId))];
  const count = form.fields.length;
  return {
    summary: `Published “${form.name}” — ${count} ${count === 1 ? "field" : "fields"}, ${warnings.length ? `${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}` : "0 issues"}.`,
    warnings: warnings.map((warning) => warning.message),
  };
}

export function publishErrorMessages(error: unknown): string[] {
  if (error instanceof ApiError && error.status === 422) {
    const data = error.details?.data;
    if (data && typeof data === "object" && "errors" in data && Array.isArray(data.errors)) {
      const messages = data.errors.flatMap((item) => typeof item?.message === "string" && item.message ? [item.message] : []);
      if (messages.length) return messages;
    }
  }
  return [error instanceof Error ? error.message : "Could not publish. Please try again."];
}
