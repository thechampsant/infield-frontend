"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/project-admin/shared/modal";
import { formatApiError, udfConfigService } from "@/lib/api";
import { projectUsersService } from "@/lib/api/project-users-service";
import { storeService } from "@/lib/api/store-service";
import { productService } from "@/lib/api/product-service";
import type {
  UdfConfigScope,
  UdfDataSourceDefinition,
  UdfFieldType,
  UdfFieldTypeOption,
  UdfSchemaDocument,
  UdfSchemaField,
  UdfSourcePreviewItem,
} from "@/lib/api";

const DEFAULT_SCHEMA_KEY = "default";

function createEmptyField(index: number, type: UdfFieldType = "STRING"): UdfSchemaField {
  return {
    fieldKey: `field_${index + 1}`,
    label: `Field ${index + 1}`,
    type,
    required: false,
    order: index + 1,
    status: true,
    summaryKey: false,
  };
}

function scopeLabelFor(scope: UdfConfigScope): string {
  return scope === "user" ? "User" : scope === "store" ? "Store" : "Product";
}

function fieldTypeDescription(type: UdfFieldType): string {
  switch (type) {
    case "STRING":
      return "Single-line text";
    case "NUMBER":
      return "Numeric input";
    case "DATE":
      return "Date picker";
    case "BOOLEAN":
      return "Yes / No";
    case "SELECT":
      return "Multi-select options";
    case "DROPDOWN":
      return "Single-select dropdown";
    case "API_SELECT":
      return "Source-backed dropdown";
    case "CASCADING_SELECT":
      return "Depends on another field";
    case "IMAGE":
      return "Image upload";
    case "FILE":
      return "File upload";
    default:
      return type;
  }
}

function optionsTextFromField(field: UdfSchemaField): string {
  const options = field.config && typeof field.config === "object"
    ? (field.config as Record<string, unknown>).options
    : undefined;
  return Array.isArray(options) ? options.map(String).join("\n") : "";
}

function cascadeOptionsTextFromField(field: UdfSchemaField): string {
  const options = field.config && typeof field.config === "object"
    ? (field.config as Record<string, unknown>).options
    : undefined;
  if (!Array.isArray(options)) return "";
  return options
    .map((item) => {
      const entry = item as Record<string, unknown>;
      return `${String(entry.parentValue ?? "")}:${String(entry.value ?? "")}`;
    })
    .join("\n");
}

function parseLineOptions(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseCascadeOptions(text: string): { value: string; parentValue: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return null;
      const parentValue = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (!parentValue || !value) return null;
      return { parentValue, value };
    })
    .filter((item): item is { value: string; parentValue: string } => Boolean(item));
}

function normalizeSchemaForEditor(
  schema: UdfSchemaDocument | null,
  projectId: string,
  entityType: string,
): UdfSchemaDocument {
  return schema ?? {
    projectId,
    entityType,
    schemaKey: DEFAULT_SCHEMA_KEY,
    fields: [],
  };
}

function sourcePreviewKeys(rows: UdfSourcePreviewItem[]): string[] {
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

/**
 * A textarea that manages its own raw text state so the user can freely
 * type across lines. Options are committed to the parent on blur only.
 */
function OptionsTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string[];
  onChange: (options: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [localText, setLocalText] = useState(() => value.join("\n"));
  const committedRef = useRef(value);

  // Sync local text when external value changes (e.g. after save/reload),
  // but NOT when the user is actively editing (detected by comparing arrays).
  useEffect(() => {
    const externalJoined = value.join("\n");
    const committedJoined = committedRef.current.join("\n");
    if (externalJoined !== committedJoined) {
      setLocalText(externalJoined);
      committedRef.current = value;
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    const parsed = localText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    committedRef.current = parsed;
    onChange(parsed);
  }, [localText, onChange]);

  return (
    <textarea
      className="form-input"
      rows={rows}
      value={localText}
      onChange={(e) => setLocalText(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
}

/**
 * Same pattern for cascading select options (parentValue:value per line).
 */
function CascadeOptionsTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: { value: string; parentValue: string }[];
  onChange: (options: { value: string; parentValue: string }[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  const serialize = (items: { value: string; parentValue: string }[]) =>
    items.map((item) => `${item.parentValue}:${item.value}`).join("\n");

  const [localText, setLocalText] = useState(() => serialize(value));
  const committedRef = useRef(value);

  useEffect(() => {
    const externalText = serialize(value);
    const committedText = serialize(committedRef.current);
    if (externalText !== committedText) {
      setLocalText(externalText);
      committedRef.current = value;
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    const parsed = parseCascadeOptions(localText);
    committedRef.current = parsed;
    onChange(parsed);
  }, [localText, onChange]);

  return (
    <textarea
      className="form-input"
      rows={rows}
      value={localText}
      onChange={(e) => setLocalText(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
}

export function UDFConfigModal({
  open,
  onClose,
  scope,
  projectId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  scope: UdfConfigScope;
  projectId: string;
  onSuccess: () => void;
}) {
  const scopeLabel = scopeLabelFor(scope);
  const entityType = udfConfigService.entityTypeForScope(scope);

  const [schema, setSchema] = useState<UdfSchemaDocument>(
    normalizeSchemaForEditor(null, projectId, entityType),
  );
  const [fieldTypes, setFieldTypes] = useState<UdfFieldTypeOption[]>([]);
  const [sources, setSources] = useState<UdfDataSourceDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [sourcePreviewByField, setSourcePreviewByField] = useState<Record<number, UdfSourcePreviewItem[]>>({});
  const [sourcePreviewLoading, setSourcePreviewLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setValidationErrors([]);
      setSourcePreviewByField({});
      setSourcePreviewLoading({});
      try {
        const [currentSchema, types, sourceList] = await Promise.all([
          scope === "user"
            ? projectUsersService.getFormFieldsConfig(projectId).then((config) =>
                config
                  ? {
                      projectId: config.projectId,
                      entityType: config.entityType,
                      schemaKey: DEFAULT_SCHEMA_KEY,
                      fields: config.udfFields,
                    }
                  : null,
              )
            : scope === "store"
              ? storeService.getFormFieldsConfig(projectId).then((config) =>
                  config
                    ? {
                        projectId: config.projectId,
                        entityType: config.entityType,
                        schemaKey: DEFAULT_SCHEMA_KEY,
                        fields: config.udfFields,
                      }
                    : null,
                )
            : productService.getFormFieldsConfig(projectId).then((config) =>
                config
                  ? {
                      projectId: config.projectId,
                      entityType: config.entityType,
                      schemaKey: DEFAULT_SCHEMA_KEY,
                      fields: config.udfFields,
                    }
                  : null,
              ),
          udfConfigService.getFieldTypes(),
          udfConfigService.getSources(),
        ]);
        if (cancelled) return;
        setSchema(normalizeSchemaForEditor(currentSchema, projectId, entityType));
        setFieldTypes(types);
        setSources(sourceList);
      } catch (err) {
        if (cancelled) return;
        setError(formatApiError(err, "Failed to load UDF configuration"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, projectId, entityType, scope]);

  const availableFieldTypes = useMemo(
    () =>
      fieldTypes.length > 0
        ? fieldTypes
        : ([
            "STRING",
            "NUMBER",
            "DATE",
            "BOOLEAN",
            "SELECT",
            "DROPDOWN",
            "API_SELECT",
            "CASCADING_SELECT",
            "IMAGE",
            "FILE",
          ] as UdfFieldType[]).map((key) => ({ key, label: key.replaceAll("_", " ") })),
    [fieldTypes],
  );

  function updateField(index: number, patch: Partial<UdfSchemaField>) {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    }));
  }

  function updateFieldConfig(index: number, patch: Record<string, unknown>) {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields.map((field, fieldIndex) => {
        if (fieldIndex !== index) return field;
        const current =
          field.config && typeof field.config === "object" && !Array.isArray(field.config)
            ? (field.config as Record<string, unknown>)
            : {};
        return { ...field, config: { ...current, ...patch } };
      }),
    }));
  }

  async function loadSourcePreview(index: number, sourceKey: string) {
    if (!sourceKey.trim()) {
      setSourcePreviewByField((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    setSourcePreviewLoading((prev) => ({ ...prev, [index]: true }));
    try {
      const rows = await udfConfigService.previewSource(sourceKey, { projectId });
      setSourcePreviewByField((prev) => ({ ...prev, [index]: rows.slice(0, 3) }));
    } catch {
      setSourcePreviewByField((prev) => ({ ...prev, [index]: [] }));
    } finally {
      setSourcePreviewLoading((prev) => ({ ...prev, [index]: false }));
    }
  }

  function handleApiSelectSourceChange(index: number, sourceKey: string) {
    updateFieldConfig(index, {
      sourceKey,
      labelKey: "",
      valueKey: "",
    });
    void loadSourcePreview(index, sourceKey);
  }

  function addField() {
    setSchema((prev) => ({
      ...prev,
      fields: [...prev.fields, createEmptyField(prev.fields.length)],
    }));
  }

  function removeField(index: number) {
    setSchema((prev) => ({
      ...prev,
      fields: prev.fields
        .filter((_, fieldIndex) => fieldIndex !== index)
        .map((field, fieldIndex) => ({ ...field, order: fieldIndex + 1 })),
    }));
  }

  function moveField(index: number, direction: -1 | 1) {
    setSchema((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.fields.length) return prev;
      const fields = [...prev.fields];
      const [field] = fields.splice(index, 1);
      fields.splice(nextIndex, 0, field);
      return {
        ...prev,
        fields: fields.map((item, fieldIndex) => ({
          ...item,
          order: fieldIndex + 1,
        })),
      };
    });
  }

  function validate(): string[] {
    const errs: string[] = [];
    const keys = new Set<string>();
    const orders = new Set<number>();

    if (schema.fields.length === 0) {
      errs.push("Add at least one field before saving.");
    }

    schema.fields.forEach((field, index) => {
      const label = field.label.trim();
      const fieldKey = field.fieldKey.trim();
      const order = field.order ?? index + 1;

      if (!fieldKey) errs.push(`Field ${index + 1}: field key is required.`);
      if (!label) errs.push(`Field ${index + 1}: label is required.`);

      if (fieldKey) {
        if (keys.has(fieldKey)) errs.push(`Duplicate field key: ${fieldKey}`);
        keys.add(fieldKey);
      }

      if (orders.has(order)) errs.push(`Duplicate order value: ${order}`);
      orders.add(order);

      const config =
        field.config && typeof field.config === "object"
          ? (field.config as Record<string, unknown>)
          : {};

      if (field.type === "SELECT" || field.type === "DROPDOWN") {
        const options = Array.isArray(config.options) ? config.options : [];
        if (options.length === 0) {
          errs.push(`${label || fieldKey}: add at least one option.`);
        }
      }

      if (field.type === "API_SELECT") {
        if (!String(config.sourceKey ?? "").trim()) {
          errs.push(`${label || fieldKey}: data source is required.`);
        }
        if (!String(config.labelKey ?? "").trim()) {
          errs.push(`${label || fieldKey}: label field is required.`);
        }
        if (!String(config.valueKey ?? "").trim()) {
          errs.push(`${label || fieldKey}: value field is required.`);
        }
      }

      if (field.type === "CASCADING_SELECT") {
        const dependsOn = String(config.dependsOn ?? "").trim();
        if (!dependsOn) {
          errs.push(`${label || fieldKey}: dependsOn is required.`);
        }
        const staticOptions = Array.isArray(config.options) ? config.options : [];
        const hasDynamic =
          String(config.sourceKey ?? "").trim() &&
          String(config.valueField ?? "").trim() &&
          String(config.parentField ?? "").trim();
        if (staticOptions.length === 0 && !hasDynamic) {
          errs.push(
            `${label || fieldKey}: add static options or dynamic source mapping.`,
          );
        }
      }
    });

    return errs;
  }

  async function handleSave() {
    const errs = validate();
    setValidationErrors(errs);
    if (errs.length > 0) return;

    setSaving(true);
    setError(null);
    const normalizedFields = schema.fields.map((field, index) => ({
      ...field,
      fieldKey: field.fieldKey.trim(),
      label: field.label.trim(),
      order: field.order ?? index + 1,
    }));
    try {
      if (scope === "user") {
        await projectUsersService.saveUserSchema({
          projectId,
          fields: normalizedFields,
        });
      } else if (scope === "store") {
        await storeService.saveStoreSchema({
          projectId,
          fields: normalizedFields,
        });
      } else if (scope === "product") {
        await productService.saveProductSchema({
          projectId,
          fields: normalizedFields,
        });
      } else {
        await udfConfigService.createOrUpdateSchema({
          ...schema,
          projectId,
          entityType,
          schemaKey: schema.schemaKey || DEFAULT_SCHEMA_KEY,
          fields: normalizedFields,
        });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(formatApiError(err, "Failed to save UDF configuration"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${scopeLabel} UDF Configuration`}
      width={980}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Configure schema-driven UDF fields for {scopeLabel.toLowerCase()} data in project{" "}
          <strong>{projectId}</strong>. This editor saves the backend UDF schema and the user add/edit forms will consume compatible fields automatically.
        </div>

        {error && (
          <div className="if2-banner error">{error}</div>
        )}

        {validationErrors.length > 0 && (
          <div className="if2-banner error">
            {validationErrors.map((message, index) => (
              <div key={index}>{message}</div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Schema Key</label>
            <input
              className="form-input"
              value={schema.schemaKey}
              onChange={(e) => setSchema((prev) => ({ ...prev, schemaKey: e.target.value }))}
              placeholder="default"
            />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Use `default` unless your backend expects a specific user schema key.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>
            Fields
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addField} disabled={loading}>
            + Add Field
          </button>
        </div>

        {loading ? (
          <div className="pa-loading">Loading...</div>
        ) : schema.fields.length === 0 ? (
          <div className="pa-coming-soon" style={{ padding: "24px 16px" }}>
            <div className="pa-coming-soon-title">No fields configured</div>
            <div className="pa-coming-soon-desc">
              Add your first UDF field to start building the user schema.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {schema.fields.map((field, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 16,
                  background: "var(--surface2)",
                  display: "grid",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>
                      {field.label || `Field ${index + 1}`}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {fieldTypeDescription(field.type)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveField(index, -1)} disabled={index === 0}>
                      ↑
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => moveField(index, 1)} disabled={index === schema.fields.length - 1}>
                      ↓
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeField(index)}>
                      Delete
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 180px 110px", gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Field Key</label>
                    <input
                      className="form-input"
                      value={field.fieldKey}
                      onChange={(e) => updateField(index, { fieldKey: e.target.value })}
                      placeholder="employeeCode"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Label</label>
                    <input
                      className="form-input"
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      placeholder="Employee Code"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Field Type</label>
                    <select
                      className="form-input"
                      value={field.type}
                      onChange={(e) =>
                        updateField(index, {
                          type: e.target.value as UdfFieldType,
                          config: undefined,
                        })
                      }
                    >
                      {availableFieldTypes.map((type) => (
                        <option key={type.key} value={type.key}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Order</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      value={field.order ?? index + 1}
                      onChange={(e) =>
                        updateField(index, {
                          order: Number(e.target.value || index + 1),
                        })
                      }
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(field.required)}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={field.status ?? true}
                      onChange={(e) => updateField(index, { status: e.target.checked })}
                    />
                    Active
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(field.summaryKey)}
                      onChange={(e) => updateField(index, { summaryKey: e.target.checked })}
                    />
                    Summary Key
                  </label>
                </div>

                {(field.type === "SELECT" || field.type === "DROPDOWN") && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Options</label>
                    <OptionsTextarea
                      value={
                        (() => {
                          const config = field.config && typeof field.config === "object"
                            ? (field.config as Record<string, unknown>).options
                            : undefined;
                          return Array.isArray(config) ? config.map(String) : [];
                        })()
                      }
                      onChange={(options) => updateFieldConfig(index, { options })}
                      placeholder="One option per line"
                    />
                  </div>
                )}

                {field.type === "API_SELECT" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Data Source</label>
                        <select
                          className="form-input"
                          value={String((field.config as Record<string, unknown> | undefined)?.sourceKey ?? "")}
                          onChange={(e) => handleApiSelectSourceChange(index, e.target.value)}
                        >
                          <option value="">Select source</option>
                          {sources.map((source) => (
                            <option key={source.key} value={source.key}>
                              {source.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Label Field</label>
                        <input
                          className="form-input"
                          value={String((field.config as Record<string, unknown> | undefined)?.labelKey ?? "")}
                          onChange={(e) => updateFieldConfig(index, { labelKey: e.target.value })}
                          placeholder="name"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Value Field</label>
                        <input
                          className="form-input"
                          value={String((field.config as Record<string, unknown> | undefined)?.valueKey ?? "")}
                          onChange={(e) => updateFieldConfig(index, { valueKey: e.target.value })}
                          placeholder="_id"
                        />
                      </div>
                    </div>

                    {String((field.config as Record<string, unknown> | undefined)?.sourceKey ?? "") && (
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          padding: 12,
                          background: "var(--surface)",
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)" }}>
                          Source Preview
                        </div>
                        {sourcePreviewLoading[index] ? (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            Loading preview...
                          </div>
                        ) : (sourcePreviewByField[index] ?? []).length === 0 ? (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            No preview data available for this source yet.
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              Click a key below to fill the Label Field or Value Field.
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {sourcePreviewKeys(sourcePreviewByField[index] ?? []).map((key) => (
                                <button
                                  key={`label-${index}-${key}`}
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => updateFieldConfig(index, { labelKey: key })}
                                >
                                  Label: {key}
                                </button>
                              ))}
                              {sourcePreviewKeys(sourcePreviewByField[index] ?? []).map((key) => (
                                <button
                                  key={`value-${index}-${key}`}
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => updateFieldConfig(index, { valueKey: key })}
                                >
                                  Value: {key}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: "grid", gap: 8 }}>
                              {(sourcePreviewByField[index] ?? []).map((row, rowIndex) => (
                                <pre
                                  key={`${index}-${rowIndex}`}
                                  style={{
                                    margin: 0,
                                    padding: 10,
                                    borderRadius: 8,
                                    background: "var(--surface2)",
                                    fontSize: 11,
                                    color: "var(--text)",
                                    overflowX: "auto",
                                  }}
                                >
                                  {JSON.stringify(row, null, 2)}
                                </pre>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {field.type === "CASCADING_SELECT" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Depends On</label>
                        <select
                          className="form-input"
                          value={String((field.config as Record<string, unknown> | undefined)?.dependsOn ?? "")}
                          onChange={(e) => updateFieldConfig(index, { dependsOn: e.target.value })}
                        >
                          <option value="">Select field</option>
                          {schema.fields
                            .filter((_, fieldIndex) => fieldIndex !== index)
                            .map((optionField) => (
                              <option key={optionField.fieldKey} value={optionField.fieldKey}>
                                {optionField.label || optionField.fieldKey}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Source Key</label>
                        <select
                          className="form-input"
                          value={String((field.config as Record<string, unknown> | undefined)?.sourceKey ?? "")}
                          onChange={(e) => updateFieldConfig(index, { sourceKey: e.target.value })}
                        >
                          <option value="">Optional</option>
                          {sources.map((source) => (
                            <option key={source.key} value={source.key}>
                              {source.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Value Field</label>
                        <input
                          className="form-input"
                          value={String((field.config as Record<string, unknown> | undefined)?.valueField ?? "")}
                          onChange={(e) => updateFieldConfig(index, { valueField: e.target.value })}
                          placeholder="name"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Parent Field</label>
                        <input
                          className="form-input"
                          value={String((field.config as Record<string, unknown> | undefined)?.parentField ?? "")}
                          onChange={(e) => updateFieldConfig(index, { parentField: e.target.value })}
                          placeholder="parentCategory"
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Static Options</label>
                      <CascadeOptionsTextarea
                        value={
                          (() => {
                            const config = field.config && typeof field.config === "object"
                              ? (field.config as Record<string, unknown>).options
                              : undefined;
                            if (!Array.isArray(config)) return [];
                            return config
                              .map((item) => {
                                const entry = item as Record<string, unknown>;
                                return {
                                  parentValue: String(entry.parentValue ?? ""),
                                  value: String(entry.value ?? ""),
                                };
                              })
                              .filter((item) => item.parentValue && item.value);
                          })()
                        }
                        onChange={(options) => updateFieldConfig(index, { options })}
                        placeholder="Parent:Child\nState:City"
                      />
                    </div>
                  </div>
                )}

                {(field.type === "IMAGE" || field.type === "FILE") && (
                  <div style={{ display: "grid", gridTemplateColumns: field.type === "IMAGE" ? "1fr 1fr 1fr" : "1fr 1fr", gap: 12 }}>
                    {field.type === "IMAGE" && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Source</label>
                        <select
                          className="form-input"
                          value={String((field.config as Record<string, unknown> | undefined)?.source ?? "Both")}
                          onChange={(e) => updateFieldConfig(index, { source: e.target.value })}
                        >
                          <option value="Both">Both</option>
                          <option value="Camera">Camera</option>
                          <option value="Gallery">Gallery</option>
                        </select>
                      </div>
                    )}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Multiple</label>
                      <select
                        className="form-input"
                        value={String(Boolean((field.config as Record<string, unknown> | undefined)?.multiple))}
                        onChange={(e) => updateFieldConfig(index, { multiple: e.target.value === "true" })}
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Max Count</label>
                      <input
                        type="number"
                        min={1}
                        className="form-input"
                        value={String((field.config as Record<string, unknown> | undefined)?.maxCount ?? 5)}
                        onChange={(e) => updateFieldConfig(index, { maxCount: Number(e.target.value || 5) })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
