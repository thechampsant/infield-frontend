"use client";

import { useCallback, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ReportCalculatedField } from "@/lib/api/report-config-service";

interface SectionCalculatedFieldsProps {
  enabled: boolean;
  calculatedFields: ReportCalculatedField[];
  onToggle: (enabled: boolean) => void;
  onFieldsChange: (fields: ReportCalculatedField[]) => void;
}

export function SectionCalculatedFields({
  enabled,
  calculatedFields,
  onToggle,
  onFieldsChange,
}: SectionCalculatedFieldsProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [formula, setFormula] = useState("");
  const [dataType, setDataType] = useState<ReportCalculatedField["dataType"]>("number");
  const [formError, setFormError] = useState("");
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);

  const resetForm = useCallback(() => {
    setFieldName("");
    setFormula("");
    setDataType("number");
    setFormError("");
    setEditingIndex(null);
  }, []);

  const handleEdit = useCallback(
    (index: number) => {
      const field = calculatedFields[index];
      setFieldName(field.fieldName);
      setFormula(field.formula);
      setDataType(field.dataType);
      setEditingIndex(index);
      setFormError("");
    },
    [calculatedFields],
  );

  const handleSubmit = useCallback(() => {
    // Validate
    if (!fieldName.trim()) {
      setFormError("Field name is required.");
      return;
    }
    if (!formula.trim()) {
      setFormError("Formula is required.");
      return;
    }
    if (fieldName.trim().length > 50) {
      setFormError("Field name cannot exceed 50 characters.");
      return;
    }
    if (formula.trim().length > 500) {
      setFormError("Formula cannot exceed 500 characters.");
      return;
    }

    // Check for duplicate name
    const duplicate = calculatedFields.findIndex(
      (f, i) =>
        f.fieldName.toLowerCase() === fieldName.trim().toLowerCase() &&
        i !== editingIndex,
    );
    if (duplicate !== -1) {
      setFormError("A calculated field with this name already exists.");
      return;
    }

    // Check max limit
    if (editingIndex === null && calculatedFields.length >= 20) {
      setFormError("Maximum 20 calculated fields allowed.");
      return;
    }

    const newField: ReportCalculatedField = {
      fieldName: fieldName.trim(),
      formula: formula.trim(),
      dataType,
      order:
        editingIndex !== null
          ? calculatedFields[editingIndex].order
          : calculatedFields.length + 1,
    };

    if (editingIndex !== null) {
      const next = [...calculatedFields];
      next[editingIndex] = newField;
      onFieldsChange(next);
    } else {
      onFieldsChange([...calculatedFields, newField]);
    }

    resetForm();
  }, [fieldName, formula, dataType, editingIndex, calculatedFields, onFieldsChange, resetForm]);

  const handleDelete = useCallback(
    (index: number) => {
      const next = calculatedFields.filter((_, i) => i !== index);
      onFieldsChange(next);
      setConfirmDeleteIndex(null);
      if (editingIndex === index) {
        resetForm();
      }
    },
    [calculatedFields, editingIndex, onFieldsChange, resetForm],
  );

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            enabled ? "bg-blue-600" : "bg-gray-300"
          }`}
          onClick={() => onToggle(!enabled)}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </div>
        <span className="text-sm font-medium text-gray-700">
          Enable Calculated Fields
        </span>
      </label>

      {enabled && (
        <>
          {/* Form */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Field Name
                </label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  maxLength={50}
                  placeholder="e.g., total_amount"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Formula
                </label>
                <input
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  maxLength={500}
                  placeholder="e.g., MULTIPLICATION(price, quantity)"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Data Type
                </label>
                <select
                  value={dataType}
                  onChange={(e) =>
                    setDataType(
                      e.target.value as ReportCalculatedField["dataType"],
                    )
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
            </div>
            {formError && (
              <p className="text-xs text-red-500">{formError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                {editingIndex !== null ? "Update Field" : "Add Field"}
              </button>
              {editingIndex !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* List */}
          {calculatedFields.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                {calculatedFields.length}/20 calculated fields
              </p>
              {calculatedFields.map((field, index) => (
                <div
                  key={field.fieldName}
                  className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-md bg-white"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-800">
                      {field.fieldName}
                    </span>
                    <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                      {field.formula}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                      {field.dataType}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(index)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteIndex(index)}
                      className="p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete confirmation */}
          {confirmDeleteIndex !== null && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Calculated Field
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete &quot;{calculatedFields[confirmDeleteIndex]?.fieldName}&quot;?
                  This cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteIndex(null)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(confirmDeleteIndex)}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
