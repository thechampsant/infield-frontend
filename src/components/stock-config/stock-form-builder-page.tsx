"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClaimsFormBuilderV2 } from "@/components/claims-config/claims-form-builder-v2";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  formatApiError,
  stockConfigService,
  type StockConfiguration,
  type UdfSchemaField,
} from "@/lib/api";
import { projectAdminBase } from "@/lib/nav/nav";

function cloneFields(fields: UdfSchemaField[]): UdfSchemaField[] {
  return JSON.parse(JSON.stringify(fields)) as UdfSchemaField[];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeFieldConfig(config: UdfSchemaField["config"]): UdfSchemaField["config"] {
  if (!config || typeof config !== "object" || Array.isArray(config)) return config;
  const next = { ...(config as Record<string, unknown>) };
  const filters =
    next.filters && typeof next.filters === "object" && !Array.isArray(next.filters)
      ? { ...(next.filters as Record<string, unknown>) }
      : null;
  const params =
    filters?.params && typeof filters.params === "object" && !Array.isArray(filters.params)
      ? { ...(filters.params as Record<string, unknown>) }
      : null;

  if (filters && params) {
    if (!params.contextField && params.storeContextField) {
      params.contextField = params.storeContextField;
    }
    delete params.storeContextField;
    next.filters = {
      ...filters,
      ...(Object.keys(params).length > 0 ? { params } : {}),
    };
  }

  if (Array.isArray(next.fields)) {
    next.fields = normalizeFields(next.fields as UdfSchemaField[]);
  }

  return next;
}

function normalizeFields(fields: UdfSchemaField[]): UdfSchemaField[] {
  return fields.map((field, index) => ({
    ...field,
    fieldKey: field.fieldKey.trim(),
    label: field.label.trim(),
    order: index + 1,
    status: field.status ?? true,
    config: normalizeFieldConfig(field.config),
  }));
}

function validateFields(
  fields: UdfSchemaField[],
  externalFieldKeys: Set<string> = new Set(),
): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  const fieldKeys = new Set([
    ...externalFieldKeys,
    ...fields.map((field) => field.fieldKey.trim()).filter(Boolean),
  ]);
  const repeatableGroups = new Map(
    fields
      .filter((field) => field.type === "REPEATABLE_GROUP")
      .map((field) => [field.fieldKey, field]),
  );

  fields.forEach((field, index) => {
    const label = `Field ${index + 1}`;
    const key = field.fieldKey.trim();
    const config = record(field.config);
    const filters = record(config.filters);
    const filterParams = record(filters.params);

    if (!key) errors.push(`${label}: field key is required.`);
    if (key && keys.has(key)) errors.push(`${label}: field key "${key}" is duplicated.`);
    if (key) keys.add(key);
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
      errors.push(`${label}: field key must start with a letter and use only letters, numbers, and underscores.`);
    }
    if (!field.label.trim()) errors.push(`${label}: label is required.`);

    if (field.type === "API_SELECT") {
      if (!String(config.dataSource ?? config.sourceKey ?? "").trim()) {
        errors.push(`${field.label || label}: datasource is required.`);
      }
      if (!String(config.labelField ?? "").trim()) {
        errors.push(`${field.label || label}: label field is required.`);
      }
      if (!String(config.valueField ?? "").trim()) {
        errors.push(`${field.label || label}: value field is required.`);
      }
    }

    if (field.type === "CASCADING_SELECT") {
      const dependsOn = String(config.dependsOn ?? "").trim();
      const sourceKey = String(config.sourceKey ?? "").trim();
      if (!dependsOn) {
        errors.push(`${field.label || label}: parent field is required.`);
      } else if (!fieldKeys.has(dependsOn)) {
        errors.push(`${field.label || label}: parent field "${dependsOn}" does not exist.`);
      }
      if (sourceKey) {
        if (!String(config.valueField ?? "").trim()) {
          errors.push(`${field.label || label}: dynamic value field is required.`);
        }
        if (!String(config.parentField ?? "").trim()) {
          errors.push(`${field.label || label}: dynamic parent field is required.`);
        }
      }
    }

    const contextField = String(filterParams.contextField ?? "").trim();
    if (contextField && !fieldKeys.has(contextField)) {
      errors.push(`${field.label || label}: context field "${contextField}" does not exist.`);
    }

    if (field.type === "REPEATABLE_GROUP") {
      const minRows = Number(config.minRows ?? 0);
      const maxRows = Number(config.maxRows ?? 0);
      const children = Array.isArray(config.fields) ? (config.fields as UdfSchemaField[]) : [];
      if (minRows < 0) errors.push(`${field.label || label}: minimum rows cannot be negative.`);
      if (maxRows < 1) errors.push(`${field.label || label}: maximum rows must be at least 1.`);
      if (maxRows > 0 && minRows > maxRows) {
        errors.push(`${field.label || label}: minimum rows cannot exceed maximum rows.`);
      }
      if (!children.length) errors.push(`${field.label || label}: add at least one child field.`);
      children.forEach((child, childIndex) => {
        if (child.type === "REPEATABLE_GROUP") {
          errors.push(`${field.label || label} child ${childIndex + 1}: nested repeatable groups are not supported.`);
        }
      });
      validateFields(children, fieldKeys).forEach((error) => errors.push(`${field.label || label}: ${error}`));
    }

    if (field.type === "FORMULA") {
      const scope = String(config.scope ?? "row");
      if (scope === "row") {
        const expression = Array.isArray(config.expression) ? config.expression : [];
        if (!expression.length) errors.push(`${field.label || label}: row formula expression is required.`);
      } else if (scope === "aggregate") {
        const source = record(config.source);
        const groupFieldKey = String(source.groupFieldKey ?? "").trim();
        const sourceFieldKey = String(source.fieldKey ?? "").trim();
        const group = repeatableGroups.get(groupFieldKey);
        if (!groupFieldKey || !group) {
          errors.push(`${field.label || label}: select a valid repeatable group.`);
        }
        if (!sourceFieldKey) {
          errors.push(`${field.label || label}: select a source field.`);
        } else if (group) {
          const groupConfig = record(group.config);
          const children = Array.isArray(groupConfig.fields) ? (groupConfig.fields as UdfSchemaField[]) : [];
          const sourceField = children.find((child) => child.fieldKey === sourceFieldKey);
          if (!sourceField || (sourceField.type !== "NUMBER" && sourceField.type !== "FORMULA")) {
            errors.push(`${field.label || label}: aggregate source must be a numeric child field or child formula.`);
          }
        }
      } else {
        errors.push(`${field.label || label}: formula scope must be row or aggregate.`);
      }
    }
  });

  return errors;
}

export function StockFormBuilderPage({
  projectId,
  accountCode,
  projectCode,
  stockConfigId,
}: {
  projectId: string;
  accountCode: string;
  projectCode: string;
  stockConfigId: string;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<StockConfiguration | null>(null);
  const [fields, setFields] = useState<UdfSchemaField[]>([]);
  const [savedFields, setSavedFields] = useState<UdfSchemaField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  const base = projectAdminBase(accountCode, projectCode);

  const goBack = useCallback(() => {
    router.push(`${base}/modules/stock`);
  }, [base, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockConfig, schema] = await Promise.all([
        stockConfigService.get(stockConfigId, projectId),
        stockConfigService.getUdfSchema(stockConfigId, projectId),
      ]);
      setConfig(stockConfig);
      setFields(cloneFields(schema.fields));
      setSavedFields(cloneFields(schema.fields));
    } catch (err) {
      setError(formatApiError(err, "Failed to load Stock form builder"));
    } finally {
      setLoading(false);
    }
  }, [projectId, stockConfigId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    const normalized = normalizeFields(fields);
    const errors = validateFields(normalized);
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const schema = await stockConfigService.saveUdfSchema(
        stockConfigId,
        projectId,
        normalized,
      );
      setFields(cloneFields(schema.fields));
      setSavedFields(cloneFields(schema.fields));
      setToast({ type: "success", message: "Stock form schema saved." });
    } catch (err) {
      setError(formatApiError(err, "Failed to save Stock form schema"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ClaimsFormBuilderV2
        projectId={projectId}
        claimTypeName={config?.name || "Stock Configuration"}
        fields={fields}
        savedFields={savedFields}
        loading={loading}
        saving={saving}
        error={error}
        validationErrors={validationErrors}
        onChange={setFields}
        onSave={() => void save()}
        onBack={goBack}
        moduleLabel="Stock Form"
        showSystemFields={false}
        enableDatasourceFilters
        enableAdvancedSalesFields
      />
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
