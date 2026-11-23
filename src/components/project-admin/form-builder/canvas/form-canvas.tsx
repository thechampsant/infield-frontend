"use client";

import { Fragment, type ReactNode } from "react";
import { useDndContext } from "@dnd-kit/core";
import { canPlaceField, isFormContainer } from "@/lib/form-builder/field-placement";
import { DropZone } from "./drop-zone";
import { Plus } from "lucide-react";
import { useFormBuilder } from "@/lib/form-builder/form-builder-context";
import { FieldCard } from "./field-card";
import { SectionGroupContainer } from "./section-group-container";
import { AddMoreBlockContainer } from "./add-more-block-container";
import type { FormField } from "@/lib/form-builder/types";

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

  const { active } = useDndContext();
  const source = active?.data.current;
  const childrenByParent = new Map<string | null, FormField[]>();
  for (const field of allFields) {
    const siblings = childrenByParent.get(field.parentId) ?? [];
    siblings.push(field);
    childrenByParent.set(field.parentId, siblings);
  }
  for (const siblings of childrenByParent.values()) siblings.sort((a, b) => a.order - b.order);

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
  if (!childrenByParent.has(null) && !source) {
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

  let questionNumber = 0;
  function renderSiblings(parentId: string | null): ReactNode {
    const siblings = childrenByParent.get(parentId) ?? [];
    const canDrop = source && canPlaceField(allFields, source.componentType, parentId, source.fieldId);

    function gap(index: number) {
      if (canDrop) return <DropZone parentId={parentId} index={index} empty={!siblings.length} />;
      if (!siblings.length) return <div style={{ textAlign: "center", padding: 12, color: "#64748b" }}>
        {source ? "Cannot move this component here" : "Drop fields here"}
      </div>;
      return null;
    }

    return <>
      {gap(0)}
      {siblings.map((field, index) => {
        const props = {
          field,
          questionNumber: ++questionNumber,
          isSelected: state.selectedFieldId === field.id,
          onClick: () => dispatch({ type: "SELECT_FIELD", fieldId: field.id }),
        };
        const Container = field.type === "section-group" ? SectionGroupContainer : AddMoreBlockContainer;
        return (
          <Fragment key={field.id}>
            <div data-builder-selected={props.isSelected}>
              {isFormContainer(field.type) ? (
                <Container {...props}>{renderSiblings(field.id)}</Container>
              ) : (
                <FieldCard
                  {...props}
                  onDuplicate={() => dispatch({ type: "DUPLICATE_FIELD", fieldId: field.id })}
                  onDelete={() => dispatch({ type: "DELETE_FIELD", fieldId: field.id })}
                />
              )}
            </div>
            {gap(index + 1)}
          </Fragment>
        );
      })}
    </>;
  }

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
      {renderSiblings(null)}

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
