"use client";

import { useCallback, useMemo, useState } from "react";
import { GripVertical, Search, X } from "lucide-react";
import type { ReportFieldMetadata } from "@/lib/api/report-config-service";

// ─── Field type badge color mapping ─────────────────────────────────────────

const TYPE_BADGE_STYLES: Record<string, string> = {
  TXT: "bg-blue-100 text-blue-700",
  NUM: "bg-teal-100 text-teal-700",
  DATE: "bg-purple-100 text-purple-700",
  BOOL: "bg-amber-100 text-amber-700",
  IMAGE: "bg-pink-100 text-pink-700",
  LOCATION: "bg-green-100 text-green-700",
};

function FieldTypeBadge({ type }: { type: string }) {
  const style = TYPE_BADGE_STYLES[type] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${style}`}>
      {type}
    </span>
  );
}

// ─── Selected item type ─────────────────────────────────────────────────────

export interface SelectedField {
  fieldKey: string;
  sourceKey: string;
  headerName: string;
  fieldType: string;
  displayName: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface FieldPickerPanelProps {
  /** Available fields grouped by source */
  availableFields: ReportFieldMetadata[];
  /** Source key label for these available fields */
  sourceKey: string;
  /** Secondary available fields (if secondary source enabled) */
  secondaryFields?: ReportFieldMetadata[];
  /** Secondary source key label */
  secondarySourceKey?: string;
  /** Currently selected fields */
  selectedFields: SelectedField[];
  /** Called when selection changes */
  onSelectionChange: (fields: SelectedField[]) => void;
  /** Left panel title */
  availableTitle?: string;
  /** Right panel title */
  selectedTitle?: string;
  /** Max items allowed in selection */
  maxItems?: number;
  /** Whether to show editable header names */
  showEditableHeaders?: boolean;
  /** Whether to show drag reorder handle */
  showDragHandles?: boolean;
}

export function FieldPickerPanel({
  availableFields,
  sourceKey,
  secondaryFields = [],
  secondarySourceKey,
  selectedFields,
  onSelectionChange,
  availableTitle = "Available Fields",
  selectedTitle = "Selected Fields",
  maxItems,
  showEditableHeaders = false,
  showDragHandles = true,
}: FieldPickerPanelProps) {
  const [search, setSearch] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Combine primary + secondary fields
  const allAvailable = useMemo(() => {
    const primary = availableFields.map((f) => ({ ...f, sourceKey }));
    const secondary = secondaryFields.map((f) => ({
      ...f,
      sourceKey: secondarySourceKey || "",
    }));
    return [...primary, ...secondary];
  }, [availableFields, sourceKey, secondaryFields, secondarySourceKey]);

  // Filter by search
  const filteredAvailable = useMemo(() => {
    if (!search.trim()) return allAvailable;
    const term = search.toLowerCase();
    return allAvailable.filter(
      (f) =>
        f.displayName.toLowerCase().includes(term) ||
        f.fieldKey.toLowerCase().includes(term),
    );
  }, [allAvailable, search]);

  // Check if a field is selected
  const isSelected = useCallback(
    (fieldKey: string, fieldSourceKey: string) =>
      selectedFields.some(
        (sf) => sf.fieldKey === fieldKey && sf.sourceKey === fieldSourceKey,
      ),
    [selectedFields],
  );

  // Toggle field selection
  const toggleField = useCallback(
    (field: (typeof allAvailable)[0]) => {
      const exists = selectedFields.find(
        (sf) => sf.fieldKey === field.fieldKey && sf.sourceKey === field.sourceKey,
      );
      if (exists) {
        onSelectionChange(
          selectedFields.filter(
            (sf) =>
              !(sf.fieldKey === field.fieldKey && sf.sourceKey === field.sourceKey),
          ),
        );
      } else {
        if (maxItems && selectedFields.length >= maxItems) return;
        onSelectionChange([
          ...selectedFields,
          {
            fieldKey: field.fieldKey,
            sourceKey: field.sourceKey,
            headerName: field.displayName,
            fieldType: field.fieldType,
            displayName: field.displayName,
          },
        ]);
      }
    },
    [selectedFields, onSelectionChange, maxItems],
  );

  // Select all visible
  const selectAll = useCallback(() => {
    const newFields = filteredAvailable
      .filter((f) => !isSelected(f.fieldKey, f.sourceKey))
      .map((f) => ({
        fieldKey: f.fieldKey,
        sourceKey: f.sourceKey,
        headerName: f.displayName,
        fieldType: f.fieldType,
        displayName: f.displayName,
      }));
    const merged = [...selectedFields, ...newFields];
    const limited = maxItems ? merged.slice(0, maxItems) : merged;
    onSelectionChange(limited);
  }, [filteredAvailable, isSelected, selectedFields, onSelectionChange, maxItems]);

  // Clear all
  const clearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // Remove a single field
  const removeField = useCallback(
    (index: number) => {
      const next = [...selectedFields];
      next.splice(index, 1);
      onSelectionChange(next);
    },
    [selectedFields, onSelectionChange],
  );

  // Update header name
  const updateHeaderName = useCallback(
    (index: number, newName: string) => {
      const next = [...selectedFields];
      // Revert to original display name if empty
      next[index] = {
        ...next[index],
        headerName: newName.trim() || next[index].displayName,
      };
      onSelectionChange(next);
    },
    [selectedFields, onSelectionChange],
  );

  // Drag reorder
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (dragIndex === null || dragIndex === targetIndex) return;
      const next = [...selectedFields];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      onSelectionChange(next);
      setDragIndex(null);
    },
    [dragIndex, selectedFields, onSelectionChange],
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left Panel: Available Fields */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">{availableTitle}</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredAvailable.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No fields found</p>
          ) : (
            filteredAvailable.map((field) => (
              <label
                key={`${field.sourceKey}-${field.fieldKey}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected(field.fieldKey, field.sourceKey)}
                  onChange={() => toggleField(field)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {field.displayName}
                </span>
                <FieldTypeBadge type={field.fieldType} />
              </label>
            ))
          )}
        </div>
        {maxItems && (
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            {selectedFields.length} / {maxItems} selected
          </div>
        )}
      </div>

      {/* Right Panel: Selected Fields */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700">{selectedTitle}</h4>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {selectedFields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No fields selected
            </p>
          ) : (
            selectedFields.map((field, index) => (
              <div
                key={`${field.sourceKey}-${field.fieldKey}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 group"
                draggable={showDragHandles}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
              >
                {showDragHandles && (
                  <GripVertical className="h-3.5 w-3.5 text-gray-400 cursor-grab" />
                )}
                <span className="text-xs text-gray-400 w-5">{index + 1}</span>
                {showEditableHeaders ? (
                  <input
                    type="text"
                    value={field.headerName}
                    onChange={(e) => updateHeaderName(index, e.target.value)}
                    onBlur={(e) => {
                      if (!e.target.value.trim()) {
                        updateHeaderName(index, "");
                      }
                    }}
                    maxLength={50}
                    className="flex-1 text-sm border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-1 py-0.5 focus:outline-none"
                  />
                ) : (
                  <span className="text-sm text-gray-700 flex-1 truncate">
                    {field.headerName}
                  </span>
                )}
                <span className="text-xs text-gray-400">{field.sourceKey}</span>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded"
                >
                  <X className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
