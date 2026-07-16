"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClaimsFormBuilderV2 } from "@/components/claims-config/claims-form-builder-v2";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import {
  formatApiError,
  salesConfigService,
  type SalesConfiguration,
  type UdfSchemaField,
} from "@/lib/api";
import { projectAdminBase } from "@/lib/nav/nav";

function cloneFields(fields: UdfSchemaField[]): UdfSchemaField[] {
  return JSON.parse(JSON.stringify(fields)) as UdfSchemaField[];
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

function validateFields(fields: UdfSchemaField[]): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  const fieldKeys = new Set(fields.map((field) => field.fieldKey.trim()).filter(Boolean));

  fields.forEach((field, index) => {
    const label = `Field ${index + 1}`;
    const key = field.fieldKey.trim();
    const config =
      field.config && typeof field.config === "object"
        ? (field.config as Record<string, unknown>)
        : {};
    const filters =
      config.filters && typeof config.filters === "object" && !Array.isArray(config.filters)
        ? (config.filters as Record<string, unknown>)
        : {};
    const filterParams =
      filters.params && typeof filters.params === "object" && !Array.isArray(filters.params)
        ? (filters.params as Record<string, unknown>)
        : {};
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
  });

  return errors;
}

export function SalesFormBuilderPage({
  projectId,
  accountCode,
  projectCode,
  salesConfigId,
}: {
  projectId: string;
  accountCode: string;
  projectCode: string;
  salesConfigId: string;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<SalesConfiguration | null>(null);
  const [fields, setFields] = useState<UdfSchemaField[]>([]);
  const [savedFields, setSavedFields] = useState<UdfSchemaField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  const base = projectAdminBase(accountCode, projectCode);

  const goBack = useCallback(() => {
    router.push(`${base}/modules/sales`);
  }, [base, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesConfig, schema] = await Promise.all([
        salesConfigService.get(salesConfigId, projectId),
        salesConfigService.getUdfSchema(salesConfigId, projectId),
      ]);
      setConfig(salesConfig);
      setFields(cloneFields(schema.fields));
      setSavedFields(cloneFields(schema.fields));
    } catch (err) {
      setError(formatApiError(err, "Failed to load Sales form builder"));
    } finally {
      setLoading(false);
    }
  }, [projectId, salesConfigId]);

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
      const schema = await salesConfigService.saveUdfSchema(
        salesConfigId,
        projectId,
        normalized,
      );
      setFields(cloneFields(schema.fields));
      setSavedFields(cloneFields(schema.fields));
      setToast({ type: "success", message: "Sales form schema saved." });
    } catch (err) {
      setError(formatApiError(err, "Failed to save Sales form schema"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ClaimsFormBuilderV2
        projectId={projectId}
        claimTypeName={config?.name || "Sales Configuration"}
        fields={fields}
        savedFields={savedFields}
        loading={loading}
        saving={saving}
        error={error}
        validationErrors={validationErrors}
        onChange={setFields}
        onSave={() => void save()}
        onBack={goBack}
        moduleLabel="Sales Form"
        showSystemFields={false}
        enableDatasourceFilters
      />
      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
