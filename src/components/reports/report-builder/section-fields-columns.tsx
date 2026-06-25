"use client";

import type { ReportFieldMetadata } from "@/lib/api/report-config-service";
import {
  FieldPickerPanel,
  type SelectedField,
} from "./field-picker-panel";

interface SectionFieldsColumnsProps {
  primaryFields: ReportFieldMetadata[];
  primarySourceKey: string;
  secondaryFields: ReportFieldMetadata[];
  secondarySourceKey: string;
  selectedColumns: SelectedField[];
  onSelectionChange: (fields: SelectedField[]) => void;
  errors?: Record<string, string>;
}

export function SectionFieldsColumns({
  primaryFields,
  primarySourceKey,
  secondaryFields,
  secondarySourceKey,
  selectedColumns,
  onSelectionChange,
  errors = {},
}: SectionFieldsColumnsProps) {
  return (
    <div className="space-y-3">
      <FieldPickerPanel
        availableFields={primaryFields}
        sourceKey={primarySourceKey}
        secondaryFields={secondaryFields}
        secondarySourceKey={secondarySourceKey}
        selectedFields={selectedColumns}
        onSelectionChange={onSelectionChange}
        availableTitle="Available Fields"
        selectedTitle="Selected Columns"
        showEditableHeaders={true}
        showDragHandles={true}
      />
      {errors.selectedColumns && (
        <p className="text-xs text-red-500">{errors.selectedColumns}</p>
      )}
    </div>
  );
}
