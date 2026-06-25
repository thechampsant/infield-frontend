"use client";

import type { ReportFieldMetadata, ReportFilter } from "@/lib/api/report-config-service";
import { FieldPickerPanel, type SelectedField } from "./field-picker-panel";
import { useCallback, useMemo } from "react";

// Only these field types can be used as filters
const FILTERABLE_TYPES = new Set(["TXT", "NUM", "DATE", "BOOL"]);

// Map field type to filter control type
function getControlType(
  fieldType: string,
): ReportFilter["controlType"] {
  switch (fieldType) {
    case "DATE":
      return "date-range";
    case "NUM":
      return "numeric-range";
    case "BOOL":
      return "toggle";
    case "TXT":
    default:
      return "dropdown";
  }
}

interface SectionFiltersProps {
  primaryFields: ReportFieldMetadata[];
  primarySourceKey: string;
  secondaryFields: ReportFieldMetadata[];
  secondarySourceKey: string;
  selectedFilters: ReportFilter[];
  onFiltersChange: (filters: ReportFilter[]) => void;
}

export function SectionFilters({
  primaryFields,
  primarySourceKey,
  secondaryFields,
  secondarySourceKey,
  selectedFilters,
  onFiltersChange,
}: SectionFiltersProps) {
  // Filter available fields to only filterable types
  const filterablePrimary = useMemo(
    () => primaryFields.filter((f) => FILTERABLE_TYPES.has(f.fieldType)),
    [primaryFields],
  );

  const filterableSecondary = useMemo(
    () => secondaryFields.filter((f) => FILTERABLE_TYPES.has(f.fieldType)),
    [secondaryFields],
  );

  // Convert between SelectedField and ReportFilter
  const selectedAsFields: SelectedField[] = useMemo(
    () =>
      selectedFilters.map((f) => ({
        fieldKey: f.fieldKey,
        sourceKey: f.sourceKey,
        headerName: f.fieldKey,
        fieldType: f.fieldType,
        displayName: f.fieldKey,
      })),
    [selectedFilters],
  );

  const handleSelectionChange = useCallback(
    (fields: SelectedField[]) => {
      const filters: ReportFilter[] = fields.map((f, index) => ({
        fieldKey: f.fieldKey,
        sourceKey: f.sourceKey,
        fieldType: f.fieldType,
        controlType: getControlType(f.fieldType),
        order: index + 1,
      }));
      onFiltersChange(filters);
    },
    [onFiltersChange],
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Select fields to use as runtime filters on the Report View. Max 20 filters.
      </p>
      <FieldPickerPanel
        availableFields={filterablePrimary}
        sourceKey={primarySourceKey}
        secondaryFields={filterableSecondary}
        secondarySourceKey={secondarySourceKey}
        selectedFields={selectedAsFields}
        onSelectionChange={handleSelectionChange}
        availableTitle="Available Filters"
        selectedTitle="Selected Filters"
        maxItems={20}
        showEditableHeaders={false}
        showDragHandles={true}
      />
    </div>
  );
}
