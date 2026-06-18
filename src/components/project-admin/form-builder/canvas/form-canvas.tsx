"use client";

import { Plus } from "lucide-react";
import { useFormBuilder } from "@/lib/form-builder/form-builder-context";
import { FieldCard } from "./field-card";
import { SectionGroupContainer } from "./section-group-container";
import { AddMoreBlockContainer } from "./add-more-block-container";
import type { FormField } from "@/lib/form-builder/types";

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Builds a sequential question number map across all visible fields,
 * including nested children, in display order.
 */
function buildQuestionNumberMap(
  topLevelFields: FormField[],
  allFields: FormField[]
): Map<string, number> {
  const numberMap = new Map<string, number>();
  let counter = 1;

  for (const field of topLevelFields) {
    numberMap.set(field.id, counter++);

    // If this field supports children, number its children sequentially
    if (field.type === "section-group" || field.type === "add-more-block") {
      const children = allFields
        .filter((f) => f.parentId === field.id)
        .sort((a, b) => a.order - b.order);

      for (const child of children) {
        numberMap.set(child.id, counter++);
      }
    }
  }

  return numberMap;
}

// ─── Form Header Card ─────────────────────────────────────────────────────

function FormHeaderCard({
  formName,
  fieldCount,
  designations,
  editBadgeText,
}: {
  formName: string;
  fieldCount: number;
  designations: string[];
  editBadgeText: string;
}) {
  const designationsText = designations.length > 0
    ? designations.join(", ")
    : "";

  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        marginBottom: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 6,
        }}
      >
        {formName}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          {fieldCount} {fieldCount === 1 ? "field" : "fields"}
          {designationsText ? ` · ${designationsText}` : ""}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 4,
            background: "#dcfce7",
            color: "#16a34a",
          }}
        >
          ✎ {editBadgeText}
        </span>
      </div>
    </div>
  );
}

// ─── FormCanvas Component ─────────────────────────────────────────────────

export function FormCanvas() {
  const { state, dispatch } = useFormBuilder();

  // Derive active configuration and its top-level fields
  const activeConfig = state.configurations.find(
    (c) => c.id === state.activeConfigId
  );

  const allFields = activeConfig?.fields ?? [];

  const topLevelFields = allFields
    .filter((f) => f.parentId === null)
    .sort((a, b) => a.order - b.order);

  const questionNumberMap = buildQuestionNumberMap(topLevelFields, allFields);

  const handleFieldClick = (fieldId: string) => {
    dispatch({ type: "SELECT_FIELD", fieldId });
  };

  const handleDeleteField = (fieldId: string) => {
    dispatch({ type: "DELETE_FIELD", fieldId });
  };

  // Get children of a container field, sorted by order
  const getChildFields = (parentId: string): FormField[] => {
    return allFields
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  // Compute edit badge text
  const getEditBadgeText = (): string => {
    if (!activeConfig) return "Editable";
    if (activeConfig.editPermission === "locked") return "Locked after submit";
    if (activeConfig.editWindow === "custom-hours" && activeConfig.editWindowHours > 0) {
      return `Editable for ${activeConfig.editWindowHours}h`;
    }
    if (activeConfig.editWindow === "until-checkout") return "Editable until checkout";
    if (activeConfig.editWindow === "manager-approval") return "Editable with approval";
    return "Editable";
  };

  // Empty state
  if (topLevelFields.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 48,
          gap: 16,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={24} color="#22c55e" />
        </div>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#94a3b8",
            margin: 0,
          }}
        >
          No fields yet
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#94a3b8",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Click a component from the palette to add your first field.
        </p>
      </div>
    );
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      dispatch({ type: "SELECT_FIELD", fieldId: null });
    }
  };

  // Render a field — either as a container or a simple field card
  const renderField = (field: FormField) => {
    const questionNumber = questionNumberMap.get(field.id) ?? 0;

    if (field.type === "section-group") {
      const children = getChildFields(field.id);
      return (
        <SectionGroupContainer
          key={field.id}
          field={field}
          questionNumber={questionNumber}
          isSelected={state.selectedFieldId === field.id}
          onClick={() => handleFieldClick(field.id)}
        >
          {children.length > 0 ? (
            children.map((child) => (
              <FieldCard
                key={child.id}
                field={child}
                questionNumber={questionNumberMap.get(child.id) ?? 0}
                isSelected={state.selectedFieldId === child.id}
                onClick={() => handleFieldClick(child.id)}
                onDuplicate={() =>
                  dispatch({ type: "DUPLICATE_FIELD", fieldId: child.id })
                }
                onDelete={() =>
                  handleDeleteField(child.id)
                }
              />
            ))
          ) : (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                fontSize: 12,
                color: "#94a3b8",
                border: "2px dashed #86efac",
                borderRadius: 8,
              }}
            >
              Drop fields here
            </div>
          )}
        </SectionGroupContainer>
      );
    }

    if (field.type === "add-more-block") {
      const children = getChildFields(field.id);
      return (
        <AddMoreBlockContainer
          key={field.id}
          field={field}
          questionNumber={questionNumber}
          isSelected={state.selectedFieldId === field.id}
          onClick={() => handleFieldClick(field.id)}
        >
          {children.length > 0 ? (
            children.map((child) => (
              <FieldCard
                key={child.id}
                field={child}
                questionNumber={questionNumberMap.get(child.id) ?? 0}
                isSelected={state.selectedFieldId === child.id}
                onClick={() => handleFieldClick(child.id)}
                onDuplicate={() =>
                  dispatch({ type: "DUPLICATE_FIELD", fieldId: child.id })
                }
                onDelete={() =>
                  handleDeleteField(child.id)
                }
              />
            ))
          ) : (
            <div
              style={{
                padding: "16px",
                textAlign: "center",
                fontSize: 12,
                color: "#94a3b8",
                border: "2px dashed #e2e8f0",
                borderRadius: 8,
              }}
            >
              Drop fields here
            </div>
          )}
        </AddMoreBlockContainer>
      );
    }

    // Regular field card
    return (
      <FieldCard
        key={field.id}
        field={field}
        questionNumber={questionNumber}
        isSelected={state.selectedFieldId === field.id}
        onClick={() => handleFieldClick(field.id)}
        onDuplicate={() =>
          dispatch({ type: "DUPLICATE_FIELD", fieldId: field.id })
        }
        onDelete={() =>
          handleDeleteField(field.id)
        }
      />
    );
  };

  return (
    <div
      onClick={handleCanvasClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 24,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      {/* Form header card */}
      <FormHeaderCard
        formName={activeConfig?.name ?? "Untitled Form"}
        fieldCount={allFields.length}
        designations={activeConfig?.designations ?? []}
        editBadgeText={getEditBadgeText()}
      />

      {/* Field cards */}
      {topLevelFields.map(renderField)}

      {/* Add field prompt at bottom */}
      <button
        type="button"
        aria-label="Add a new field"
        onClick={() => {
          // Scroll palette into focus / no-op for now — palette click adds fields
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "14px 16px",
          borderRadius: 10,
          border: "2px dashed #86efac",
          background: "transparent",
          cursor: "pointer",
          transition: "border-color .15s, background .15s",
          marginTop: 4,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#22c55e";
          e.currentTarget.style.background = "#f0fdf4";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#86efac";
          e.currentTarget.style.background = "transparent";
        }}
      >
        <Plus size={16} color="#22c55e" />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "#16a34a",
          }}
        >
          Add field from palette
        </span>
      </button>
    </div>
  );
}
