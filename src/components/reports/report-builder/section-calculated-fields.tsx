"use client";

import { useCallback, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ReportCalculatedField } from "@/lib/api/report-config-service";

interface SectionCalculatedFieldsProps {
  enabled: boolean;
  calculatedFields: ReportCalculatedField[];
  onToggle: (enabled: boolean) => void;
  onFieldsChange: (fields: ReportCalculatedField[]) => void;
  availableFieldKeys?: Array<{ fieldKey: string; displayName: string; fieldType: string; sourceKey: string }>;
}

export function SectionCalculatedFields({
  enabled,
  calculatedFields,
  onToggle,
  onFieldsChange,
  availableFieldKeys = [],
}: SectionCalculatedFieldsProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [formula, setFormula] = useState("");
  const [dataType, setDataType] = useState<ReportCalculatedField["dataType"]>("number");
  const [formError, setFormError] = useState("");
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showFieldKeys, setShowFieldKeys] = useState(false);

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
        <button
          type="button"
          onClick={() => setShowHelp(true)}
          className="ml-2 w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold hover:bg-blue-200 inline-flex items-center justify-center"
          title="Formula Reference Guide"
        >
          i
        </button>
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

          {/* Available Field Keys Reference */}
          {availableFieldKeys.length > 0 && (
            <div className="border border-blue-100 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFieldKeys(!showFieldKeys)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <span className="text-xs font-medium text-blue-700">
                  📋 Available Field Keys for Formulas ({availableFieldKeys.length} fields)
                </span>
                <span className="text-blue-500 text-xs">{showFieldKeys ? '▲ Hide' : '▼ Show'}</span>
              </button>
              {showFieldKeys && (
                <div className="max-h-60 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Field Key (use in formula)</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Display Name</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Type</th>
                        <th className="px-3 py-1.5 text-left font-semibold text-gray-600">Source</th>
                        <th className="px-3 py-1.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {availableFieldKeys.map((f) => (
                        <tr key={`${f.sourceKey}-${f.fieldKey}`} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 font-mono text-blue-700 font-medium">{f.fieldKey}</td>
                          <td className="px-3 py-1.5 text-gray-600">{f.displayName}</td>
                          <td className="px-3 py-1.5">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                              f.fieldType === 'NUM' ? 'bg-teal-100 text-teal-700' :
                              f.fieldType === 'DATE' ? 'bg-purple-100 text-purple-700' :
                              f.fieldType === 'BOOL' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{f.fieldType}</span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-400">{f.sourceKey}</td>
                          <td className="px-3 py-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(f.fieldKey);
                              }}
                              className="text-[10px] text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded"
                              title={`Copy "${f.fieldKey}" to clipboard`}
                            >
                              copy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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

      {/* Formula Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHelp(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-semibold text-gray-900">Formula Reference Guide</h2>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="p-1 hover:bg-gray-100 rounded text-gray-500"
              >✕</button>
            </div>
            <div className="px-6 py-5 space-y-6 text-sm">
              {/* Syntax */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Syntax</h3>
                <code className="block bg-gray-100 px-3 py-2 rounded text-xs font-mono text-gray-700">
                  FUNCTION_NAME(field1, field2, ...)
                </code>
                <p className="text-gray-500 mt-2">
                  Use exact field keys from the Available Fields list (not display names). 
                  You can nest functions up to 5 levels deep.
                </p>
              </div>

              {/* Supported Functions Table */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Supported Functions</h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Function</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Arguments</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr><td className="px-3 py-2 font-mono text-blue-700">SUM(a, b, ...)</td><td className="px-3 py-2">2+ values</td><td className="px-3 py-2">Add all arguments</td><td className="px-3 py-2 font-mono text-gray-600">SUM(price, tax, delivery)</td></tr>
                      <tr className="bg-gray-50"><td className="px-3 py-2 font-mono text-blue-700">SUBTRACTION(a, b)</td><td className="px-3 py-2">Exactly 2</td><td className="px-3 py-2">a minus b</td><td className="px-3 py-2 font-mono text-gray-600">SUBTRACTION(revenue, cost)</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-700">MULTIPLICATION(a, b, ...)</td><td className="px-3 py-2">2+ values</td><td className="px-3 py-2">Multiply all arguments</td><td className="px-3 py-2 font-mono text-gray-600">MULTIPLICATION(qty, unitPrice)</td></tr>
                      <tr className="bg-gray-50"><td className="px-3 py-2 font-mono text-blue-700">DIVISION(a, b)</td><td className="px-3 py-2">Exactly 2</td><td className="px-3 py-2">a ÷ b (returns null if b=0)</td><td className="px-3 py-2 font-mono text-gray-600">DIVISION(totalSales, visits)</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-700">AVG(a, b, ...)</td><td className="px-3 py-2">2+ values</td><td className="px-3 py-2">Average of arguments</td><td className="px-3 py-2 font-mono text-gray-600">AVG(score1, score2, score3)</td></tr>
                      <tr className="bg-gray-50"><td className="px-3 py-2 font-mono text-blue-700">COUNT(arrayField)</td><td className="px-3 py-2">1 array field</td><td className="px-3 py-2">Size of the array</td><td className="px-3 py-2 font-mono text-gray-600">COUNT(items)</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-700">IF(cond, then, else)</td><td className="px-3 py-2">2 or 3</td><td className="px-3 py-2">Conditional logic</td><td className="px-3 py-2 font-mono text-gray-600">IF(isActive, revenue, 0)</td></tr>
                      <tr className="bg-gray-50"><td className="px-3 py-2 font-mono text-blue-700">ROUND(value, decimals)</td><td className="px-3 py-2">1 or 2</td><td className="px-3 py-2">Round to N places (default 2)</td><td className="px-3 py-2 font-mono text-gray-600">ROUND(percentage, 1)</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-700">ABS(value)</td><td className="px-3 py-2">1</td><td className="px-3 py-2">Absolute value</td><td className="px-3 py-2 font-mono text-gray-600">ABS(difference)</td></tr>
                      <tr className="bg-gray-50"><td className="px-3 py-2 font-mono text-blue-700">DATEDIFF(date1, date2)</td><td className="px-3 py-2">2 date fields</td><td className="px-3 py-2">Difference in <strong>days</strong></td><td className="px-3 py-2 font-mono text-gray-600">DATEDIFF(endDate, startDate)</td></tr>
                      <tr><td className="px-3 py-2 font-mono text-blue-700">TIME_DIFF(dt1, dt2)</td><td className="px-3 py-2">2 datetime fields</td><td className="px-3 py-2">Difference in <strong>hours</strong></td><td className="px-3 py-2 font-mono text-gray-600">TIME_DIFF(checkOut, checkIn)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Argument Types */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Argument Types</h3>
                <ul className="space-y-1 text-gray-600 list-disc pl-5">
                  <li><strong>Field reference:</strong> Use exact field key (e.g., <code className="bg-gray-100 px-1 rounded">workingHoursMinutes</code>, <code className="bg-gray-100 px-1 rounded">submittedValue</code>)</li>
                  <li><strong>Number literal:</strong> <code className="bg-gray-100 px-1 rounded">100</code>, <code className="bg-gray-100 px-1 rounded">3.14</code>, <code className="bg-gray-100 px-1 rounded">0</code></li>
                  <li><strong>String literal:</strong> <code className="bg-gray-100 px-1 rounded">&quot;active&quot;</code> or <code className="bg-gray-100 px-1 rounded">&apos;hello&apos;</code></li>
                  <li><strong>Boolean:</strong> <code className="bg-gray-100 px-1 rounded">true</code> or <code className="bg-gray-100 px-1 rounded">false</code></li>
                  <li><strong>Nested function:</strong> <code className="bg-gray-100 px-1 rounded">SUM(MULTIPLICATION(qty, price), tax)</code></li>
                </ul>
              </div>

              {/* Practical Examples */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Practical Examples</h3>
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="font-medium text-blue-800 text-xs mb-1">Attendance: Convert minutes to hours</p>
                    <code className="text-xs font-mono text-blue-700">DIVISION(workingHoursMinutes, 60)</code>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <p className="font-medium text-green-800 text-xs mb-1">Sales: Total = Quantity × Price</p>
                    <code className="text-xs font-mono text-green-700">MULTIPLICATION(quantity, unitPrice)</code>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <p className="font-medium text-purple-800 text-xs mb-1">Profit Margin %</p>
                    <code className="text-xs font-mono text-purple-700">ROUND(DIVISION(SUBTRACTION(sellingPrice, costPrice), sellingPrice), 2)</code>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="font-medium text-amber-800 text-xs mb-1">Conditional: Show &quot;Yes&quot;/&quot;No&quot; based on boolean</p>
                    <code className="text-xs font-mono text-amber-700">IF(isLateCheckIn, &quot;Yes&quot;, &quot;No&quot;)</code>
                  </div>
                </div>
              </div>

              {/* Rules */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Important Rules</h3>
                <ul className="space-y-1 text-gray-600 list-disc pl-5">
                  <li>Field names are <strong>case-sensitive</strong> — must match exactly as shown in Available Fields</li>
                  <li>Maximum nesting depth: <strong>5 levels</strong></li>
                  <li>Maximum <strong>20 calculated fields</strong> per report</li>
                  <li>Division by zero returns <strong>null</strong> (displayed as &quot;–&quot;)</li>
                  <li>Invalid formulas produce <strong>null</strong> — the report still runs, that column just shows &quot;–&quot;</li>
                  <li>Calculated fields can reference other calculated fields — order is resolved automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
