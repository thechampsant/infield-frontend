"use client";

import { useEffect, useState } from "react";
import { formatApiError, udfConfigService } from "@/lib/api";
import type {
  AttendanceFormType,
  UdfDataSourceDefinition,
  UdfFieldType,
  UdfSchemaField,
  UdfSourcePreviewItem,
} from "@/lib/api";

interface AttendanceFormRequirements {
  remarksRequired: boolean;
}

interface Props {
  projectId: string;
  formType: AttendanceFormType;
  title: string;
  fields: UdfSchemaField[];
  savedFields: UdfSchemaField[];
  loading: boolean;
  saving: boolean;
  requirements: AttendanceFormRequirements;
  error: string | null;
  validationErrors: string[];
  onChange: (fields: UdfSchemaField[]) => void;
  onSave: () => void;
}

const FIELD_TYPES: Array<{ key: UdfFieldType; label: string; description: string }> = [
  { key: "STRING", label: "Short Text", description: "Single-line input" },
  { key: "NUMBER", label: "Number", description: "Numeric value" },
  { key: "DATE", label: "Date", description: "Calendar picker" },
  { key: "BOOLEAN", label: "Yes / No", description: "Boolean choice" },
  { key: "DROPDOWN", label: "Dropdown", description: "Static single select" },
  { key: "API_SELECT", label: "API Select", description: "Source-backed dropdown" },
  { key: "IMAGE", label: "Image", description: "Photo upload field" },
  { key: "FILE", label: "File", description: "Document upload field" },
];

function createField(index: number, type: UdfFieldType): UdfSchemaField {
  return {
    fieldKey: `field_${index + 1}`,
    label: `Field ${index + 1}`,
    type,
    required: false,
    order: index + 1,
    status: true,
    summaryKey: false,
    config:
      type === "DROPDOWN"
        ? { options: [] }
        : type === "API_SELECT"
          ? { sourceKey: "", labelKey: "", valueKey: "" }
          : undefined,
  };
}

function optionsText(field: UdfSchemaField): string {
  const options = field.config && typeof field.config === "object"
    ? (field.config as Record<string, unknown>).options
    : undefined;
  return Array.isArray(options) ? options.map(String).join("\n") : "";
}

function parseOptions(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function previewKeys(rows: UdfSourcePreviewItem[]): string[] {
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

export function AttendanceFormBuilder({
  projectId,
  formType,
  title,
  fields,
  savedFields,
  loading,
  saving,
  requirements,
  error,
  validationErrors,
  onChange,
  onSave,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sources, setSources] = useState<UdfDataSourceDefinition[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcePreviewByField, setSourcePreviewByField] = useState<Record<number, UdfSourcePreviewItem[]>>({});
  const [sourcePreviewLoading, setSourcePreviewLoading] = useState<Record<number, boolean>>({});
  const [sourceError, setSourceError] = useState<string | null>(null);

  useEffect(() => {
    if (fields.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex > fields.length - 1) {
      setSelectedIndex(fields.length - 1);
    }
  }, [fields, selectedIndex]);

  useEffect(() => {
    let cancelled = false;
    async function loadSources() {
      setSourcesLoading(true);
      setSourceError(null);
      try {
        const list = await udfConfigService.getSources();
        if (!cancelled) setSources(list);
      } catch (err) {
        if (!cancelled) {
          setSourceError(formatApiError(err, "Failed to load data sources"));
        }
      } finally {
        if (!cancelled) setSourcesLoading(false);
      }
    }
    void loadSources();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fields.forEach((field, index) => {
      if (field.type !== "API_SELECT") return;
      const config =
        field.config && typeof field.config === "object"
          ? (field.config as Record<string, unknown>)
          : {};
      const sourceKey = String(config.sourceKey ?? "").trim();
      if (!sourceKey || sourcePreviewByField[index]) return;
      void loadSourcePreview(index, sourceKey);
    });
    // Intentionally keyed on field identity to preload saved API select previews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const selectedField = fields[selectedIndex] ?? null;
  const dirty = JSON.stringify(fields) !== JSON.stringify(savedFields);

  function updateFields(next: UdfSchemaField[]) {
    onChange(
      next.map((field, index) => ({
        ...field,
        order: index + 1,
      })),
    );
  }

  function updateField(index: number, patch: Partial<UdfSchemaField>) {
    updateFields(
      fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    );
  }

  function updateFieldConfig(index: number, patch: Record<string, unknown>) {
    updateFields(
      fields.map((field, fieldIndex) => {
        if (fieldIndex !== index) return field;
        const current =
          field.config && typeof field.config === "object" && !Array.isArray(field.config)
            ? (field.config as Record<string, unknown>)
            : {};
        return { ...field, config: { ...current, ...patch } };
      }),
    );
  }

  function addField(type: UdfFieldType) {
    const next = [...fields, createField(fields.length, type)];
    updateFields(next);
    setSelectedIndex(next.length - 1);
  }

  function removeField(index: number) {
    const next = fields.filter((_, fieldIndex) => fieldIndex !== index);
    updateFields(next);
  }

  function moveField(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    const next = [...fields];
    const [field] = next.splice(index, 1);
    next.splice(nextIndex, 0, field);
    updateFields(next);
    setSelectedIndex(nextIndex);
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

  return (
    <div className="att-form-builder">
      <div className="att-form-builder__head">
        <div>
          <div className="att-form-builder__eyebrow">
            Step 2 · Attendance Form Builder
          </div>
          <h2 className="att-form-builder__title">{title}</h2>
          <p className="att-form-builder__desc">
            Create the UDF schema for the {formType} attendance form. Keep required backend
            fields aligned with your attendance configuration.
          </p>
        </div>
        <div className="att-form-builder__meta">
          <span className={`att-form-builder__badge${dirty ? " dirty" : ""}`}>
            {dirty ? "Unsaved changes" : "Saved"}
          </span>
          <button className="btn btn-primary" onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving…" : `Save ${title}`}
          </button>
        </div>
      </div>

      {(error || validationErrors.length > 0 || sourceError) && (
        <div className="att-form-builder__errors">
          {error ? <p>{error}</p> : null}
          {sourceError ? <p>{sourceError}</p> : null}
          {validationErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      <div className="att-form-builder__requirements">
        <span className={`att-form-builder__requirement${requirements.remarksRequired ? " on" : ""}`}>
          {requirements.remarksRequired ? 'Include fieldKey "remarks"' : "Remarks field optional"}
        </span>
      </div>

      <div className="att-form-builder__layout">
        <div className="att-form-builder__palette">
          <div className="att-form-builder__panelTitle">Field Palette</div>
          <div className="att-form-builder__paletteList">
            {FIELD_TYPES.map((type) => (
              <button
                key={type.key}
                className="att-form-builder__paletteItem"
                onClick={() => addField(type.key)}
                type="button"
              >
                <strong>{type.label}</strong>
                <span>{type.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="att-form-builder__canvas">
          <div className="att-form-builder__panelTitle">Form Fields</div>
          {loading ? (
            <div className="att-form-builder__empty">Loading form schema…</div>
          ) : fields.length === 0 ? (
            <div className="att-form-builder__empty">
              No fields yet. Start by adding fields from the palette.
            </div>
          ) : (
            <div className="att-form-builder__fieldList">
              {fields.map((field, index) => (
                <button
                  key={`${field.fieldKey}-${index}`}
                  type="button"
                  className={`att-form-builder__fieldCard${selectedIndex === index ? " selected" : ""}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <div className="att-form-builder__fieldCardTop">
                    <span className="att-form-builder__fieldOrder">{index + 1}</span>
                    <span className="att-form-builder__fieldType">{field.type}</span>
                  </div>
                  <strong>{field.label || `Field ${index + 1}`}</strong>
                  <span>{field.fieldKey || "field_key"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="att-form-builder__inspector">
          <div className="att-form-builder__panelTitle">Field Inspector</div>
          {!selectedField ? (
            <div className="att-form-builder__empty">Select a field to edit its settings.</div>
          ) : (
            <div className="att-form-builder__inspectorBody">
              <div className="att-form-builder__inspectorActions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => moveField(selectedIndex, -1)}
                  disabled={selectedIndex === 0}
                >
                  Move Up
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => moveField(selectedIndex, 1)}
                  disabled={selectedIndex === fields.length - 1}
                >
                  Move Down
                </button>
                <button
                  className="btn btn-danger-ghost btn-sm"
                  onClick={() => removeField(selectedIndex)}
                >
                  Remove
                </button>
              </div>

              <label className="att-form-builder__field">
                <span>Field Key</span>
                <input
                  className="form-input"
                  value={selectedField.fieldKey}
                  onChange={(e) => updateField(selectedIndex, { fieldKey: e.target.value })}
                />
              </label>

              <label className="att-form-builder__field">
                <span>Label</span>
                <input
                  className="form-input"
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedIndex, { label: e.target.value })}
                />
              </label>

              <label className="att-form-builder__field">
                <span>Type</span>
                <select
                  className="form-input"
                  value={selectedField.type}
                  onChange={(e) =>
                    updateField(selectedIndex, {
                      type: e.target.value as UdfFieldType,
                      config:
                        e.target.value === "DROPDOWN"
                          ? { options: [] }
                          : e.target.value === "API_SELECT"
                            ? { sourceKey: "", labelKey: "", valueKey: "" }
                            : undefined,
                    })
                  }
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="att-form-builder__toggles">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedField.required)}
                    onChange={(e) => updateField(selectedIndex, { required: e.target.checked })}
                  />
                  Required
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedField.status ?? true}
                    onChange={(e) => updateField(selectedIndex, { status: e.target.checked })}
                  />
                  Active
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedField.summaryKey)}
                    onChange={(e) => updateField(selectedIndex, { summaryKey: e.target.checked })}
                  />
                  Summary Key
                </label>
              </div>

              {selectedField.type === "DROPDOWN" ? (
                <label className="att-form-builder__field">
                  <span>Options</span>
                  <textarea
                    className="form-input att-form-builder__textarea"
                    value={optionsText(selectedField)}
                    placeholder={"One option per line"}
                    onChange={(e) =>
                      updateFieldConfig(selectedIndex, { options: parseOptions(e.target.value) })
                    }
                  />
                </label>
              ) : null}

              {selectedField.type === "API_SELECT" ? (
                <>
                  <label className="att-form-builder__field">
                    <span>Data Source</span>
                    <select
                      className="form-input"
                      value={String(
                        ((selectedField.config as Record<string, unknown> | undefined)?.sourceKey ??
                          ""),
                      )}
                      onChange={(e) => {
                        updateFieldConfig(selectedIndex, {
                          sourceKey: e.target.value,
                          labelKey: "",
                          valueKey: "",
                        });
                        void loadSourcePreview(selectedIndex, e.target.value);
                      }}
                    >
                      <option value="">
                        {sourcesLoading ? "Loading sources..." : "Select source"}
                      </option>
                      {sources.map((source) => (
                        <option key={source.key} value={source.key}>
                          {source.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="att-form-builder__fieldRow">
                    <label className="att-form-builder__field">
                      <span>Label Key</span>
                      <input
                        className="form-input"
                        value={String(
                          ((selectedField.config as Record<string, unknown> | undefined)?.labelKey ??
                            ""),
                        )}
                        onChange={(e) =>
                          updateFieldConfig(selectedIndex, { labelKey: e.target.value })
                        }
                      />
                    </label>
                    <label className="att-form-builder__field">
                      <span>Value Key</span>
                      <input
                        className="form-input"
                        value={String(
                          ((selectedField.config as Record<string, unknown> | undefined)?.valueKey ??
                            ""),
                        )}
                        onChange={(e) =>
                          updateFieldConfig(selectedIndex, { valueKey: e.target.value })
                        }
                      />
                    </label>
                  </div>

                  <div className="att-form-builder__preview">
                    <div className="att-form-builder__previewHead">
                      <strong>Source Preview</strong>
                      {sourcePreviewLoading[selectedIndex] ? <span>Loading…</span> : null}
                    </div>
                    {sourcePreviewByField[selectedIndex]?.length ? (
                      <>
                        <div className="att-form-builder__previewKeys">
                          {previewKeys(sourcePreviewByField[selectedIndex] ?? []).map((key) => (
                            <button
                              key={key}
                              type="button"
                              className="att-form-builder__previewKey"
                              onClick={() =>
                                updateFieldConfig(selectedIndex, {
                                  labelKey:
                                    String(
                                      ((selectedField.config as Record<string, unknown> | undefined)
                                        ?.labelKey ?? ""),
                                    ) || key,
                                  valueKey:
                                    String(
                                      ((selectedField.config as Record<string, unknown> | undefined)
                                        ?.valueKey ?? ""),
                                    ) || key,
                                })
                              }
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                        <div className="att-form-builder__previewRows">
                          {sourcePreviewByField[selectedIndex].map((row, rowIndex) => (
                            <pre key={rowIndex}>{JSON.stringify(row, null, 2)}</pre>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="att-form-builder__previewEmpty">
                        Choose a source to inspect sample values.
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
