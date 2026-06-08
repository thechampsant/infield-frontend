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
}

type FieldComponent = {
  key: UdfFieldType;
  label: string;
  icon: string;
};

const FIELD_COMPONENTS: FieldComponent[] = [
  { key: "DROPDOWN", label: "Dropdown", icon: "▼" },
  { key: "STRING", label: "Short Text", icon: "T" },
  { key: "NUMBER", label: "Number", icon: "#" },
  { key: "DATE", label: "Date", icon: "📅" },
  { key: "IMAGE", label: "Image Upload", icon: "🖼" },
  { key: "FILE", label: "File Upload", icon: "📎" },
  { key: "API_SELECT", label: "GPS Location", icon: "📍" },
  { key: "BOOLEAN", label: "Paragraph", icon: "¶" },
];

function createField(type: UdfFieldType, order: number): UdfSchemaField {
  const labels: Record<UdfFieldType, string> = {
    STRING: "Short Text",
    NUMBER: "Enter Amount",
    DATE: "Claim Date",
    DROPDOWN: "Select type",
    IMAGE: "Bills / Invoices Upload",
    FILE: "File Upload",
    API_SELECT: "Location",
    BOOLEAN: "Remarks",
    SELECT: "Multi Select",
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
          ? { dataSource: "", labelField: "", valueField: "" }
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
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sources, setSources] = useState<UdfDataSourceDefinition[]>([]);
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

  function parseOptions(value: string): string[] {
    return value.split("\n").map((v) => v.trim()).filter(Boolean);
  }

  function optionsText(field: UdfSchemaField): string {
    const config = field.config as Record<string, unknown> | undefined;
    const options = Array.isArray(config?.options) ? config.options : [];
    return options.map(String).join("\n");
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
          <h1>Form Builder · Claims Form</h1>
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
            <h2>Claims Submission Form</h2>
            <p>11 fields · Claim Type & its sub-field are auto-added from config</p>
          </div>

          <div className="claims-fb-formPreview">
            {/* Auto fields */}
            <div className="claims-fb-field auto">
              <div className="claims-fb-fieldBadge ai">AI</div>
              <div className="claims-fb-fieldBadge config">FROM CONFIG</div>
              <label>
                Claim Type <span className="required">*</span>
              </label>
              <input type="text" placeholder="Select type" disabled />
            </div>

            <div className="claims-fb-field auto">
              <div className="claims-fb-fieldBadge ai">AI</div>
              <div className="claims-fb-fieldBadge conditional">CONDITIONAL</div>
              <label>
                Sub-field (Mode / City / Type) <span className="required">*</span>
              </label>
              <input type="text" placeholder="Appears based on selected claim type" disabled />
            </div>

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
                  <textarea placeholder="Additional notes..." disabled rows={3} />
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
                      value={
                        String((selectedField.config as Record<string, unknown>)?.dataSource || "")
                      }
                      onChange={(e) => updateFieldConfig(selectedIndex!, { dataSource: e.target.value })}
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
                </>
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
