"use client";

import { useEffect, useMemo, useState } from "react";
import { formatApiError, udfConfigService } from "@/lib/api";
import type {
  UdfDataSourceDefinition,
  UdfFieldType,
  UdfSchemaField,
  UdfSourcePreviewItem,
} from "@/lib/api";
import { ChevronLeft, Trash2, Copy } from "lucide-react";

interface Props {
  projectId: string;
  claimTypeName: string;
  fields: UdfSchemaField[];
  savedFields: UdfSchemaField[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  validationErrors: string[];
  onChange: (fields: UdfSchemaField[]) => void;
  onSave: () => void;
  onBack: () => void;
  moduleLabel?: string;
  showSystemFields?: boolean;
}

type FieldComponent = {
  key: UdfFieldType;
  label: string;
  icon: string;
};

const FIELD_COMPONENTS: FieldComponent[] = [
  { key: "DROPDOWN", label: "Dropdown", icon: "▼" },
  { key: "SELECT", label: "Select", icon: "☷" },
  { key: "CASCADING_SELECT", label: "Cascading Select", icon: "⇢" },
  { key: "API_SELECT", label: "API Select", icon: "⌁" },
  { key: "STRING", label: "Short Text", icon: "T" },
  { key: "NUMBER", label: "Number", icon: "#" },
  { key: "DATE", label: "Date", icon: "📅" },
  { key: "BOOLEAN", label: "Yes / No", icon: "◉" },
  { key: "IMAGE", label: "Image Upload", icon: "🖼" },
  { key: "FILE", label: "File Upload", icon: "📎" },
];

function createField(type: UdfFieldType, order: number): UdfSchemaField {
  const labels: Record<UdfFieldType, string> = {
    STRING: "Short Text",
    NUMBER: "Enter Amount",
    DATE: "Claim Date",
    DROPDOWN: "Select type",
    IMAGE: "Bills / Invoices Upload",
    FILE: "File Upload",
    API_SELECT: "Select from API",
    BOOLEAN: "Yes / No",
    SELECT: "Select",
    CASCADING_SELECT: "Cascading Select",
  };

  return {
    fieldKey: `field_${order}`,
    label: labels[type] || `Field ${order}`,
    type,
    required: type === "NUMBER" || type === "IMAGE",
    order,
    status: true,
    summaryKey: false,
    config:
      type === "SELECT" || type === "DROPDOWN"
        ? { options: [] }
        : type === "API_SELECT"
          ? { dataSource: "", sourceKey: "", labelField: "", valueField: "", multiple: false }
          : type === "CASCADING_SELECT"
            ? { dependsOn: "", options: [] }
            : type === "IMAGE"
              ? { source: "Both", multiple: false, maxCount: 1 }
              : type === "FILE"
                ? { multiple: false, maxCount: 1, accept: [] }
          : undefined,
  };
}

function getFieldTypeLabel(type: UdfFieldType): string {
  const map: Record<UdfFieldType, string> = {
    STRING: "SHORT TEXT",
    NUMBER: "NUMBER",
    DATE: "DATE",
    DROPDOWN: "DROPDOWN",
    IMAGE: "IMAGE UPLOAD",
    FILE: "FILE",
    API_SELECT: "API SELECT",
    BOOLEAN: "PARAGRAPH",
    SELECT: "SELECT",
    CASCADING_SELECT: "CASCADING",
  };
  return map[type] || type;
}

function MediaSettings({
  field,
  onChange,
}: {
  field: UdfSchemaField;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const config = field.config as Record<string, unknown> | undefined;
  const multiple = config?.multiple === true;
  return (
    <>
      <div className="claims-fb-toggles">
        <label>
          <input
            type="checkbox"
            checked={multiple}
            onChange={(event) =>
              onChange({
                multiple: event.target.checked,
                maxCount: event.target.checked ? Number(config?.maxCount) || 5 : 1,
              })
            }
          />
          Allow multiple uploads
        </label>
      </div>
      {multiple && (
        <div className="claims-fb-formGroup">
          <label>Maximum Files</label>
          <input
            type="number"
            min={1}
            className="form-input"
            value={Number(config?.maxCount) || 5}
            onChange={(event) =>
              onChange({ maxCount: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        </div>
      )}
    </>
  );
}

export function ClaimsFormBuilderV2({
  projectId,
  claimTypeName,
  fields,
  savedFields,
  loading,
  saving,
  error,
  validationErrors,
  onChange,
  onSave,
  onBack,
  moduleLabel = "Claims Form",
  showSystemFields = true,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sources, setSources] = useState<UdfDataSourceDefinition[]>([]);
  const [sourcePreview, setSourcePreview] = useState<UdfSourcePreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Local draft for the options textarea — avoids losing newlines on each keystroke
  const [optionsDraft, setOptionsDraft] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(fields) !== JSON.stringify(savedFields),
    [fields, savedFields],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSources() {
      try {
        const sourceList = await udfConfigService.getSources();
        if (!cancelled) setSources(sourceList);
      } catch (err) {
        console.error("Failed to load sources:", err);
      }
    }
    void loadSources();
    return () => {
      cancelled = true;
    };
  }, []);

  function addField(type: UdfFieldType) {
    // Reset options draft when switching fields
    setOptionsDraft(null);
    // Find the maximum order value to avoid duplicates
    const maxOrder = fields.length > 0 
      ? Math.max(...fields.map(f => f.order ?? 0))
      : 0;
    const newField = createField(type, maxOrder + 1);
    const updated = [...fields, newField];
    onChange(updated);
    setSelectedIndex(updated.length - 1);
  }

  function updateField(index: number, patch: Partial<UdfSchemaField>) {
    if (index < 0 || index >= fields.length) return;
    onChange(
      fields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    );
  }

  function updateFieldConfig(index: number, patch: Record<string, unknown>) {
    if (index < 0 || index >= fields.length) return;
    onChange(
      fields.map((field, i) => {
        if (i !== index) return field;
        const current =
          field.config && typeof field.config === "object"
            ? (field.config as Record<string, unknown>)
            : {};
        return { ...field, config: { ...current, ...patch } };
      }),
    );
  }

  function removeField(index: number) {
    const updated = fields.filter((_, i) => i !== index);
    onChange(updated);
    // Reset selection if the removed field was selected, or if selection is now out of bounds
    if (selectedIndex === index || (selectedIndex !== null && selectedIndex >= updated.length)) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      // Adjust selection index if removing a field before the selected one
      setSelectedIndex(selectedIndex - 1);
    }
  }

  function duplicateField(index: number) {
    const field = fields[index];
    // Find the maximum order value to avoid duplicates
    const maxOrder = Math.max(...fields.map(f => f.order ?? 0));
    const newField = { ...field, fieldKey: `${field.fieldKey}_copy`, order: maxOrder + 1 };
    onChange([...fields, newField]);
  }

  function optionsText(field: UdfSchemaField): string {
    const config = field.config as Record<string, unknown> | undefined;
    const options = Array.isArray(config?.options) ? config.options : [];
    return options.map(String).join("\n");
  }

  function cascadingOptionsText(field: UdfSchemaField): string {
    const config = field.config as Record<string, unknown> | undefined;
    const options = Array.isArray(config?.options) ? config.options : [];
    return options
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const option = item as Record<string, unknown>;
        return `${String(option.parentValue ?? "")}:${String(option.value ?? "")}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  async function previewApiSource() {
    if (selectedIndex === null || !selectedField) return;
    const config = selectedField.config as Record<string, unknown> | undefined;
    const sourceKey = String(config?.dataSource ?? config?.sourceKey ?? "");
    if (!sourceKey) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      setSourcePreview(
        await udfConfigService.previewSource(sourceKey, { projectId }),
      );
    } catch (err) {
      setPreviewError(formatApiError(err, "Failed to preview data source"));
      setSourcePreview([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  const selectedField = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < fields.length 
    ? fields[selectedIndex] 
    : null;

  return (
    <div className="claims-form-builder-v2">
      {/* Header */}
      <div className="claims-fb-header">
        <button type="button" className="claims-fb-backBtn" onClick={onBack}>
          <ChevronLeft size={18} />
          Configuration
        </button>
        <div className="claims-fb-headerInfo">
          <h1>Form Builder · {moduleLabel}</h1>
          <p>{claimTypeName} · {fields.length} fields · {dirty ? "Unsaved changes" : "All changes saved"}</p>
        </div>
        <div className="claims-fb-headerActions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            ← Back to Config
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={onSave} 
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      </div>

      {/* Errors */}
      {(error || validationErrors.length > 0) && (
        <div className="claims-fb-errors">
          {error && <p>{error}</p>}
          {validationErrors.map((msg, i) => <p key={i}>{msg}</p>)}
        </div>
      )}

      {/* Stepper */}
      <div className="claims-fb-stepper">
        <div className="claims-fb-step completed">
          <span className="claims-fb-stepNum">1</span>
          <span>Configuration Setup</span>
        </div>
        <div className="claims-fb-step active">
          <span className="claims-fb-stepNum">2</span>
          <span>Form Builder</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="claims-fb-layout">
        {/* Left Sidebar - Components */}
        <div className="claims-fb-sidebar">
          <h3>Add Fields</h3>
          <p className="claims-fb-sidebarHint">Click to add to form</p>
          <div className="claims-fb-components">
            {FIELD_COMPONENTS.map((comp) => (
              <button
                key={comp.key}
                className="claims-fb-component"
                onClick={() => addField(comp.key)}
                type="button"
              >
                <span className="claims-fb-componentIcon">{comp.icon}</span>
                <span>{comp.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center - Form Preview */}
        <div className="claims-fb-canvas">
          <div className="claims-fb-canvasHeader">
            <h2>{moduleLabel}</h2>
            <p>{showSystemFields ? "Claim Type and its sub-field are auto-added from config" : `${fields.length} configured fields`}</p>
          </div>

          <div className="claims-fb-formPreview">
            {/* Auto fields */}
            {showSystemFields && <div className="claims-fb-field auto">
              <div className="claims-fb-fieldBadge ai">AI</div>
              <div className="claims-fb-fieldBadge config">FROM CONFIG</div>
              <label>
                Claim Type <span className="required">*</span>
              </label>
              <input type="text" placeholder="Select type" disabled />
            </div>}

            {showSystemFields && <div className="claims-fb-field auto">
              <div className="claims-fb-fieldBadge ai">AI</div>
              <div className="claims-fb-fieldBadge conditional">CONDITIONAL</div>
              <label>
                Sub-field (Mode / City / Type) <span className="required">*</span>
              </label>
              <input type="text" placeholder="Appears based on selected claim type" disabled />
            </div>}

            {/* User-added fields */}
            {fields.map((field, index) => (
              <div
                key={`${field.fieldKey}-${index}`}
                className={`claims-fb-field ${selectedIndex === index ? "selected" : ""}`}
                onClick={() => { setSelectedIndex(index); setOptionsDraft(null); }}
              >
                <div className="claims-fb-fieldHeader">
                  <div className="claims-fb-fieldBadge type">{`0${index + 1}`}</div>
                  <div className="claims-fb-fieldBadge fieldType">{getFieldTypeLabel(field.type)}</div>
                  {field.required && <div className="claims-fb-fieldBadge required">REQUIRED</div>}
                  <div className="claims-fb-fieldActions">
                    <button
                      type="button"
                      className="claims-fb-iconBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateField(index);
                      }}
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="claims-fb-iconBtn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(index);
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <label>
                  {field.label} {field.required && <span className="required">*</span>}
                </label>

                {field.type === "STRING" && (
                  <input type="text" placeholder="Type here..." disabled />
                )}
                {field.type === "NUMBER" && (
                  <input type="number" placeholder="0.00" disabled />
                )}
                {field.type === "DATE" && (
                  <input type="text" placeholder="DD / MM / YYYY" disabled />
                )}
                {field.type === "DROPDOWN" && (
                  <select disabled>
                    <option>Select...</option>
                  </select>
                )}
                {field.type === "SELECT" && (
                  <select disabled>
                    <option>Select...</option>
                  </select>
                )}
                {field.type === "CASCADING_SELECT" && (
                  <select disabled>
                    <option>Select parent value first...</option>
                  </select>
                )}
                {field.type === "IMAGE" && (
                  <div className="claims-fb-upload">
                    <span>📤 Upload</span>
                  </div>
                )}
                {field.type === "FILE" && (
                  <div className="claims-fb-upload">
                    <span>📎 Upload</span>
                  </div>
                )}
                {field.type === "BOOLEAN" && (
                  <label className="claims-fb-booleanPreview">
                    <input type="checkbox" disabled /> Yes
                  </label>
                )}
                {field.type === "API_SELECT" && (
                  <input type="text" placeholder="Select from list..." disabled />
                )}
              </div>
            ))}

            {fields.length === 0 && (
              <div className="claims-fb-emptyState">
                <p>No custom fields added yet</p>
                <p className="hint">Click a component from the left sidebar to add fields</p>
              </div>
            )}

            <button type="button" className="claims-fb-addFieldBtn" onClick={() => setSelectedIndex(null)}>
              + Add field
            </button>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="claims-fb-properties">
          <h3>Select a field</h3>
          {selectedField === null ? (
            <p className="claims-fb-propertiesHint">
              Click any field on the canvas to edit its properties here.
            </p>
          ) : (
            <div className="claims-fb-propertiesForm">
              <div className="claims-fb-formGroup">
                <label>Label</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedIndex!, { label: e.target.value })}
                />
              </div>

              <div className="claims-fb-formGroup">
                <label>Field Key</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedField.fieldKey}
                  onChange={(e) => updateField(selectedIndex!, { fieldKey: e.target.value })}
                />
              </div>

              <div className="claims-fb-formGroup">
                <label>Field Type</label>
                <select
                  className="form-input"
                  value={selectedField.type}
                  onChange={(e) =>
                    updateField(selectedIndex!, { type: e.target.value as UdfFieldType })
                  }
                >
                  {FIELD_COMPONENTS.map((comp) => (
                    <option key={comp.key} value={comp.key}>
                      {comp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="claims-fb-toggles">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => updateField(selectedIndex!, { required: e.target.checked })}
                  />
                  Required
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedField.status ?? true}
                    onChange={(e) => updateField(selectedIndex!, { status: e.target.checked })}
                  />
                  Active
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedField.summaryKey}
                    onChange={(e) => updateField(selectedIndex!, { summaryKey: e.target.checked })}
                  />
                  Logging
                </label>
              </div>

              {(selectedField.type === "SELECT" || selectedField.type === "DROPDOWN") && (
                <div className="claims-fb-formGroup">
                  <label>Options (one per line)</label>
                  <textarea
                    className="form-input"
                    rows={6}
                    value={optionsDraft !== null ? optionsDraft : optionsText(selectedField)}
                    onChange={(e) => {
                      // Only update local draft — don't parse yet, preserves newlines while typing
                      setOptionsDraft(e.target.value);
                    }}
                    onBlur={(e) => {
                      // Commit to real state only when user leaves the textarea
                      const options = e.target.value
                        .split('\n')
                        .map(v => v.trim())
                        .filter(Boolean);
                      updateFieldConfig(selectedIndex!, { options });
                      setOptionsDraft(null);
                    }}
                    placeholder={`Option 1\nOption 2\nOption 3`}
                    style={{
                      fontFamily: 'monospace',
                      lineHeight: '1.6',
                      resize: 'vertical',
                    }}
                    spellCheck={false}
                  />
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Type each option on a new line, then click elsewhere to save.
                  </p>
                </div>
              )}

              {selectedField.type === "API_SELECT" && (
                <>
                  <div className="claims-fb-formGroup">
                    <label>Data Source</label>
                    <select
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.dataSource ||
                        (selectedField.config as Record<string, unknown>)?.sourceKey ||
                        "",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, {
                          dataSource: e.target.value,
                          sourceKey: e.target.value,
                        })
                      }
                    >
                      <option value="">Select source...</option>
                      {sources.map((src) => (
                        <option key={src.key} value={src.key}>
                          {src.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Label Field</label>
                    <input
                      type="text"
                      className="form-input"
                      value={
                        String((selectedField.config as Record<string, unknown>)?.labelField || "")
                      }
                      onChange={(e) => updateFieldConfig(selectedIndex!, { labelField: e.target.value })}
                    />
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Value Field</label>
                    <input
                      type="text"
                      className="form-input"
                      value={
                        String((selectedField.config as Record<string, unknown>)?.valueField || "")
                      }
                      onChange={(e) => updateFieldConfig(selectedIndex!, { valueField: e.target.value })}
                    />
                  </div>
                  <div className="claims-fb-toggles">
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          (selectedField.config as Record<string, unknown>)?.multiple === true
                        }
                        onChange={(e) =>
                          updateFieldConfig(selectedIndex!, { multiple: e.target.checked })
                        }
                      />
                      Allow multiple selections
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={
                      previewLoading ||
                      !String(
                        (selectedField.config as Record<string, unknown>)?.dataSource ||
                        (selectedField.config as Record<string, unknown>)?.sourceKey ||
                        "",
                      )
                    }
                    onClick={() => void previewApiSource()}
                  >
                    {previewLoading ? "Loading preview..." : "Preview source"}
                  </button>
                  {previewError && <p className="claims-fb-propertiesHint">{previewError}</p>}
                  {sourcePreview.length > 0 && (
                    <pre className="claims-fb-sourcePreview">
                      {JSON.stringify(sourcePreview.slice(0, 5), null, 2)}
                    </pre>
                  )}
                </>
              )}

              {selectedField.type === "CASCADING_SELECT" && (
                <>
                  <div className="claims-fb-formGroup">
                    <label>Parent Field</label>
                    <select
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.dependsOn ?? "",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { dependsOn: e.target.value })
                      }
                    >
                      <option value="">Select parent field...</option>
                      {fields
                        .filter((_, index) => index !== selectedIndex)
                        .map((field) => (
                          <option key={field.fieldKey} value={field.fieldKey}>
                            {field.label} ({field.fieldKey})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Options (parent:value)</label>
                    <textarea
                      className="form-input"
                      rows={6}
                      defaultValue={cascadingOptionsText(selectedField)}
                      onBlur={(e) => {
                        const options = e.target.value
                          .split("\n")
                          .map((line) => {
                            const separator = line.indexOf(":");
                            if (separator < 1) return null;
                            const parentValue = line.slice(0, separator).trim();
                            const value = line.slice(separator + 1).trim();
                            return parentValue && value ? { parentValue, value } : null;
                          })
                          .filter(
                            (option): option is { parentValue: string; value: string } =>
                              Boolean(option),
                          );
                        updateFieldConfig(selectedIndex!, { options });
                      }}
                      placeholder={"India:Delhi\nIndia:Mumbai\nUSA:New York"}
                    />
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Dynamic Source (optional)</label>
                    <select
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.sourceKey ?? "",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { sourceKey: e.target.value })
                      }
                    >
                      <option value="">Use static options</option>
                      {sources.map((source) => (
                        <option key={source.key} value={source.key}>{source.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Dynamic Value Field</label>
                    <input
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.valueField ?? "",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { valueField: e.target.value })
                      }
                    />
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Dynamic Parent Field</label>
                    <input
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.parentField ?? "",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { parentField: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              {selectedField.type === "IMAGE" && (
                <>
                  <div className="claims-fb-formGroup">
                    <label>Image Source</label>
                    <select
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.source ?? "Both",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { source: e.target.value })
                      }
                    >
                      <option value="Camera">Camera</option>
                      <option value="Gallery">Gallery</option>
                      <option value="Both">Camera or Gallery</option>
                    </select>
                  </div>
                  <MediaSettings
                    field={selectedField}
                    onChange={(patch) => updateFieldConfig(selectedIndex!, patch)}
                  />
                </>
              )}

              {selectedField.type === "FILE" && (
                <>
                  <MediaSettings
                    field={selectedField}
                    onChange={(patch) => updateFieldConfig(selectedIndex!, patch)}
                  />
                  <div className="claims-fb-formGroup">
                    <label>Accepted MIME Types</label>
                    <input
                      className="form-input"
                      placeholder="application/pdf, image/*"
                      value={
                        Array.isArray(
                          (selectedField.config as Record<string, unknown>)?.accept,
                        )
                          ? (
                              (selectedField.config as Record<string, unknown>)
                                .accept as unknown[]
                            ).join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, {
                          accept: e.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </>
              )}

              <div className="claims-fb-formGroup">
                <label>Conditional Visibility (optional)</label>
                <select
                  className="form-input"
                  value={selectedField.visibilityRules?.[0]?.dependsOnField ?? ""}
                  onChange={(event) => {
                    const dependsOnField = event.target.value;
                    updateField(selectedIndex!, {
                      visibilityRules: dependsOnField
                        ? [{
                            dependsOnField,
                            showWhen: selectedField.visibilityRules?.[0]?.showWhen ?? [],
                          }]
                        : undefined,
                    });
                  }}
                >
                  <option value="">Always visible</option>
                  {fields
                    .filter((_, index) => index !== selectedIndex)
                    .map((field) => (
                      <option key={field.fieldKey} value={field.fieldKey}>
                        Show based on {field.label}
                      </option>
                    ))}
                </select>
              </div>
              {selectedField.visibilityRules?.[0]?.dependsOnField && (
                <div className="claims-fb-formGroup">
                  <label>Show When Values</label>
                  <input
                    className="form-input"
                    placeholder="Approved, Pending"
                    value={selectedField.visibilityRules[0].showWhen.join(", ")}
                    onChange={(event) =>
                      updateField(selectedIndex!, {
                        visibilityRules: [{
                          dependsOnField:
                            selectedField.visibilityRules![0].dependsOnField,
                          showWhen: event.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        }],
                      })
                    }
                  />
                </div>
              )}

              <div className="claims-fb-formGroup">
                <label>All Types</label>
                <p className="hint">Available field types for this claim form</p>
                <div className="claims-fb-allTypes">
                  {FIELD_COMPONENTS.map((comp) => (
                    <span key={comp.key} className="claims-fb-typeChip">
                      {comp.icon} {comp.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
