"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, MousePointerClick } from "lucide-react";
import { useFormBuilder } from "@/lib/form-builder/form-builder-context";
import { getComponentDefinition } from "@/lib/form-builder/constants";
import type { FormField } from "@/lib/form-builder/types";

// ─── Styles ───────────────────────────────────────────────────────────────

const colors = {
  bg: "#ffffff",
  sectionHeader: "#475569",
  inputBorder: "#e2e8f0",
  inputBg: "#ffffff",
  inputText: "#0f172a",
  labelText: "#0f172a",
  muted: "#94a3b8",
  pillActiveBorder: "#3b82f6",
  pillActiveBg: "#eff6ff",
  pillActiveText: "#3b82f6",
  pillInactiveBorder: "#e2e8f0",
  pillInactiveBg: "#ffffff",
  pillInactiveText: "#475569",
  segmentActiveBg: "#3b82f6",
  segmentActiveText: "#ffffff",
  segmentInactiveBg: "#ffffff",
  segmentInactiveText: "#475569",
  segmentInactiveBorder: "#e2e8f0",
  deleteBg: "#dc2626",
  deleteText: "#ffffff",
  duplicateBg: "#ffffff",
  duplicateBorder: "#e2e8f0",
  duplicateText: "#0f172a",
};

// ─── Debounce Hook ────────────────────────────────────────────────────────

function useDebouncedDispatch(
  dispatch: React.Dispatch<import("@/lib/form-builder/types").FormBuilderAction>,
  fieldId: string,
  delay: number
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    (changes: Partial<FormField>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        dispatch({ type: "UPDATE_FIELD", fieldId, changes });
      }, delay);
    },
    [dispatch, fieldId, delay]
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: 32,
        textAlign: "center",
        gap: 12,
      }}
    >
      <MousePointerClick size={28} style={{ color: colors.muted }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: colors.muted }}>
        Select a field
      </span>
      <span style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
        Click any field to edit its properties, visibility, validation, and data
        sources.
      </span>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: colors.sectionHeader,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "16px 16px 8px 16px",
        borderTop: `1px solid ${colors.inputBorder}`,
      }}
    >
      {title}
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────

function InspectorInput({
  label,
  value,
  onChange,
  description,
  type = "text",
  required,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  description?: string;
  type?: "text" | "number";
  required?: boolean;
}) {
  return (
    <div style={{ padding: "6px 16px" }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 500,
          color: colors.labelText,
          marginBottom: 4,
        }}
      >
        {label}
        {required && (
          <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          fontSize: 13,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: 6,
          background: colors.inputBg,
          color: colors.inputText,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {description && (
        <span
          style={{
            display: "block",
            fontSize: 11,
            color: colors.muted,
            marginTop: 3,
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
}

// ─── Pill Toggle ──────────────────────────────────────────────────────────

function PillToggle({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "6px 16px" }}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              flex: 1,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 500,
              border: `1.5px solid ${isActive ? colors.pillActiveBorder : colors.pillInactiveBorder}`,
              borderRadius: 20,
              background: isActive ? colors.pillActiveBg : colors.pillInactiveBg,
              color: isActive ? colors.pillActiveText : colors.pillInactiveText,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Segmented Control ────────────────────────────────────────────────────

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        padding: "6px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          borderRadius: 6,
          overflow: "hidden",
          border: `1px solid ${colors.segmentInactiveBorder}`,
          width: "100%",
        }}
      >
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              style={{
                flex: 1,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                background: isActive
                  ? colors.segmentActiveBg
                  : colors.segmentInactiveBg,
                color: isActive
                  ? colors.segmentActiveText
                  : colors.segmentInactiveText,
                cursor: "pointer",
                transition: "all 0.15s",
                borderRight: `1px solid ${colors.segmentInactiveBorder}`,
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        background: checked ? "#3b82f6" : "#cbd5e1",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#ffffff",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

// ─── Inspector Content ────────────────────────────────────────────────────

function InspectorContent({
  field,
  fieldIndex,
}: {
  field: FormField;
  fieldIndex: number;
}) {
  const { state, dispatch } = useFormBuilder();
  const definition = getComponentDefinition(field.type);

  // Local state for debounced text inputs
  const [label, setLabel] = useState(field.label);
  const [helpText, setHelpText] = useState(field.helpText);

  // Sync local state when field changes
  useEffect(() => {
    setLabel(field.label);
    setHelpText(field.helpText);
  }, [field.id, field.label, field.helpText]);

  // Debounced dispatch for text inputs
  const debouncedUpdate = useDebouncedDispatch(dispatch, field.id, 300);

  const handleLabelChange = (value: string) => {
    setLabel(value);
    debouncedUpdate({ label: value });
  };

  const handleHelpTextChange = (value: string) => {
    setHelpText(value);
    debouncedUpdate({ helpText: value });
  };

  // Immediate dispatch for non-text changes
  const updateField = (changes: Partial<FormField>) => {
    dispatch({ type: "UPDATE_FIELD", fieldId: field.id, changes });
  };

  const handleClose = () => {
    dispatch({ type: "SELECT_FIELD", fieldId: null });
  };

  const handleDuplicate = () => {
    dispatch({ type: "DUPLICATE_FIELD", fieldId: field.id });
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${field.label}"? This cannot be undone.`)) return;
    dispatch({ type: "DELETE_FIELD", fieldId: field.id });
  };

  // Determine which type-specific validations to show
  const isTextType = ["short-text", "paragraph", "alphanumeric"].includes(
    field.type
  );
  const isNumberType = field.type === "number";
  const isImageType = field.type === "image-capture";
  const isRatingType = field.type === "rating";
  const hasOptions = ["dropdown", "multi-select", "radio", "checkbox"].includes(
    field.type
  );

  // Local state for options management
  const [newOption, setNewOption] = useState("");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: colors.bg,
      }}
    >
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${colors.inputBorder}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.inputText,
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {fieldIndex + 1}: {definition?.name ?? field.type} —{" "}
            {definition?.description ?? ""}
          </div>
          <div
            style={{
              fontSize: 12,
              color: colors.muted,
              marginTop: 2,
            }}
          >
            {definition?.name ?? field.type}
          </div>
        </div>
        <button
          onClick={handleClose}
          aria-label="Close inspector"
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 6,
            background: colors.bg,
            color: colors.sectionHeader,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* ─── Scrollable Content ──────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
        {/* FIELD Section */}
        <SectionHeader title="Field" />
        <InspectorInput
          label="Label"
          value={label}
          onChange={handleLabelChange}
          required
        />
        <InspectorInput
          label="Help text"
          value={helpText}
          onChange={handleHelpTextChange}
          description="Shown below label & as placeholder"
        />

        {/* VISIBILITY Section */}
        <SectionHeader title="Visibility" />
        <PillToggle
          options={[
            { label: "Always visible", value: "always" },
            { label: "Show when...", value: "conditional" },
          ]}
          value={field.visibility}
          onChange={(value) =>
            updateField({
              visibility: value as "always" | "conditional",
            })
          }
        />

        {/* PRE-FILL & READ-ONLY Section */}
        <SectionHeader title="Pre-fill & Read-only" />
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: colors.labelText,
              }}
            >
              Read-only (greyed out)
            </div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
              Value visible but user cannot edit
            </div>
          </div>
          <ToggleSwitch
            checked={field.readOnly}
            onChange={(checked) => updateField({ readOnly: checked })}
          />
        </div>

        {/* VALIDATION Section */}
        <SectionHeader title="Validation" />
        <div style={{ padding: "6px 16px" }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: colors.labelText,
              marginBottom: 6,
            }}
          >
            Required
          </label>
        </div>
        <SegmentedControl
          options={[
            { label: "No", value: "no" },
            { label: "Always", value: "always" },
            { label: "Conditional", value: "conditional" },
          ]}
          value={field.required}
          onChange={(value) =>
            updateField({
              required: value as "no" | "always" | "conditional",
            })
          }
        />

        {/* Type-specific validation inputs */}
        {isTextType && (
          <>
            <InspectorInput
              label="Min length"
              value={field.typeConfig.minLength ?? ""}
              type="number"
              onChange={(v) =>
                updateField({
                  typeConfig: {
                    ...field.typeConfig,
                    minLength: v ? Number(v) : undefined,
                  },
                })
              }
            />
            <InspectorInput
              label="Max length"
              value={field.typeConfig.maxLength ?? ""}
              type="number"
              onChange={(v) =>
                updateField({
                  typeConfig: {
                    ...field.typeConfig,
                    maxLength: v ? Number(v) : undefined,
                  },
                })
              }
            />
          </>
        )}
        {isNumberType && (
          <>
            <InspectorInput
              label="Min value"
              value={field.typeConfig.minValue ?? ""}
              type="number"
              onChange={(v) =>
                updateField({
                  typeConfig: {
                    ...field.typeConfig,
                    minValue: v ? Number(v) : undefined,
                  },
                })
              }
            />
            <InspectorInput
              label="Max value"
              value={field.typeConfig.maxValue ?? ""}
              type="number"
              onChange={(v) =>
                updateField({
                  typeConfig: {
                    ...field.typeConfig,
                    maxValue: v ? Number(v) : undefined,
                  },
                })
              }
            />
          </>
        )}
        {isImageType && (
          <>
            <div style={{ padding: "6px 16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: colors.labelText,
                  marginBottom: 6,
                }}
              >
                Image Source
              </label>
            </div>
            <SegmentedControl
              options={[
                { label: "Camera", value: "live" },
                { label: "Gallery", value: "gallery" },
                { label: "Both", value: "both" },
              ]}
              value={field.typeConfig.captureMode ?? "both"}
              onChange={(value) =>
                updateField({
                  typeConfig: {
                    ...field.typeConfig,
                    captureMode: value as "live" | "gallery" | "both",
                  },
                })
              }
            />
            <InspectorInput
              label="Min photos"
              value={field.typeConfig.minPhotos ?? ""}
              type="number"
              onChange={(v) =>
                updateField({
                  typeConfig: {
                    ...field.typeConfig,
                    minPhotos: v ? Number(v) : undefined,
                  },
                })
              }
            />
            <InspectorInput
              label="Max photos"
              value={field.typeConfig.maxPhotos ?? ""}
              type="number"
              onChange={(v) =>
                updateField({
                  typeConfig: {
                    ...field.typeConfig,
                    maxPhotos: v ? Number(v) : undefined,
                  },
                })
              }
            />
          </>
        )}
        {isRatingType && (
          <InspectorInput
            label="Max stars"
            value={field.typeConfig.maxStars ?? ""}
            type="number"
            onChange={(v) =>
              updateField({
                typeConfig: {
                  ...field.typeConfig,
                  maxStars: v ? Number(v) : undefined,
                },
              })
            }
          />
        )}

        {/* OPTIONS Section (for dropdown, multi-select, radio, checkbox) */}
        {hasOptions && (
          <>
            <SectionHeader title="Options" />
            <div style={{ padding: "6px 16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 500,
                  color: colors.labelText,
                  marginBottom: 6,
                }}
              >
                Options Source
              </label>
            </div>
            <SegmentedControl
              options={[
                { label: "Manual", value: "manual" },
                { label: "Excel", value: "excel" },
                { label: "Master", value: "from-master" },
              ]}
              value={field.optionsSource ?? "manual"}
              onChange={(value) =>
                updateField({
                  optionsSource: value as "manual" | "excel" | "from-master",
                })
              }
            />

            {/* Manual options editor */}
            {(field.optionsSource === "manual" || !field.optionsSource) && (
              <div style={{ padding: "8px 16px" }}>
                {/* Existing options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                  {field.manualOptions.map((option, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: colors.muted,
                          width: 18,
                          flexShrink: 0,
                          textAlign: "center",
                        }}
                      >
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const updated = [...field.manualOptions];
                          updated[idx] = e.target.value;
                          updateField({ manualOptions: updated });
                        }}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          fontSize: 13,
                          border: `1px solid ${colors.inputBorder}`,
                          borderRadius: 5,
                          background: colors.inputBg,
                          color: colors.inputText,
                          outline: "none",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = field.manualOptions.filter((_, i) => i !== idx);
                          updateField({ manualOptions: updated });
                        }}
                        style={{
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `1px solid ${colors.inputBorder}`,
                          borderRadius: 4,
                          background: colors.bg,
                          color: "#dc2626",
                          cursor: "pointer",
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                        aria-label={`Remove option ${option}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new option */}
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newOption.trim()) {
                        updateField({
                          manualOptions: [...field.manualOptions, newOption.trim()],
                          optionsSource: "manual",
                        });
                        setNewOption("");
                      }
                    }}
                    placeholder="Type option and press Enter"
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      fontSize: 13,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: 5,
                      background: colors.inputBg,
                      color: colors.inputText,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newOption.trim()) {
                        updateField({
                          manualOptions: [...field.manualOptions, newOption.trim()],
                          optionsSource: "manual",
                        });
                        setNewOption("");
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      border: "none",
                      borderRadius: 5,
                      background: "#3b82f6",
                      color: "#ffffff",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    + Add
                  </button>
                </div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: colors.muted,
                    marginTop: 6,
                  }}
                >
                  {field.manualOptions.length} option{field.manualOptions.length !== 1 ? "s" : ""} added
                </span>
              </div>
            )}
          </>
        )}

        {/* ACTIONS Section */}
        <SectionHeader title="Actions" />
        <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={handleDuplicate}
            style={{
              width: "100%",
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 500,
              border: `1px solid ${colors.duplicateBorder}`,
              borderRadius: 6,
              background: colors.duplicateBg,
              color: colors.duplicateText,
              cursor: "pointer",
            }}
          >
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            style={{
              width: "100%",
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              borderRadius: 6,
              background: colors.deleteBg,
              color: colors.deleteText,
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main FieldInspector Component ────────────────────────────────────────

export function FieldInspector() {
  const { state } = useFormBuilder();

  // Get selected field from context
  const activeConfig = state.configurations.find(
    (c) => c.id === state.activeConfigId
  );
  const selectedField = activeConfig?.fields.find(
    (f) => f.id === state.selectedFieldId
  );

  if (!selectedField) {
    return <EmptyState />;
  }

  // Determine field index (position among top-level siblings)
  const topLevelFields = (activeConfig?.fields ?? [])
    .filter((f) => f.parentId === selectedField.parentId)
    .sort((a, b) => a.order - b.order);
  const fieldIndex = topLevelFields.findIndex((f) => f.id === selectedField.id);

  return <InspectorContent field={selectedField} fieldIndex={fieldIndex} />;
}
