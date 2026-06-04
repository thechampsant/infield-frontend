"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { udfConfigService } from "@/lib/api";
import type { UDFField, UDFValue } from "@/types/project-admin";

interface UDFFormFieldsProps {
  fields: UDFField[];
  values: Record<string, UDFValue>;
  onChange: (values: Record<string, UDFValue>) => void;
  errors: string[];
  projectId: string;
  prefix?: string;
}

export function UDFFormFields({
  fields,
  values,
  onChange,
  errors,
  projectId,
  prefix = "udf_",
}: UDFFormFieldsProps) {
  const set = (fieldKey: string, val: UDFValue) =>
    onChange({ ...values, [fieldKey]: val });
  const [dynamicOptions, setDynamicOptions] = useState<Record<number, { label: string; value: string }[]>>({});
  const [openMultiField, setOpenMultiField] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const sourceFields = fields.filter(
        (field) =>
          field.type === "dropdown" &&
          field.sourceKey &&
          field.labelKey &&
          field.valueKey,
      );

      if (sourceFields.length === 0 || !projectId) {
        if (!cancelled) setDynamicOptions({});
        return;
      }

      const entries = await Promise.all(
        sourceFields.map(async (field) => {
          try {
            const rows = await udfConfigService.previewSource(field.sourceKey!, {
              projectId,
            });
            const items = rows
              .map((row) => {
                const label = row[field.labelKey!];
                const value = row[field.valueKey!];
                if (label == null || value == null) return null;
                return { label: String(label), value: String(value) };
              })
              .filter((item): item is { label: string; value: string } => Boolean(item));
            return [field.id, items] as const;
          } catch {
            return [field.id, []] as const;
          }
        }),
      );

      if (cancelled) return;
      setDynamicOptions(Object.fromEntries(entries));
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [fields, projectId]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpenMultiField(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const stringValue = (fieldKey: string) => {
    const value = values[fieldKey];
    return typeof value === "string" ? value : "";
  };

  const arrayValue = (fieldKey: string) => {
    const value = values[fieldKey];
    return Array.isArray(value) ? value.map(String) : [];
  };

  const toggleMultiValue = (fieldKey: string, optionValue: string) => {
    const current = arrayValue(fieldKey);
    const next = current.includes(optionValue)
      ? current.filter((value) => value !== optionValue)
      : [...current, optionValue];
    set(fieldKey, next);
  };

  const pairs: UDFField[][] = [];
  for (let i = 0; i < fields.length; i += 2) pairs.push(fields.slice(i, i + 2));

  return (
    <div ref={rootRef}>
      {pairs.map((pair, pi) => (
        <div
          key={pi}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 0,
          }}
        >
          {pair.map((f) => {
            const errKey = `${prefix}${f.id}`;
            const hasErr = errors.includes(errKey);
            const optionItems =
              dynamicOptions[f.id] ??
              f.optionItems ??
              f.values.map((value) => ({ label: value, value }));
            return (
              <div key={f.id} className="form-group">
                <label className="form-label">
                  {f.name}
                  {f.mandatory && <span className="req"> *</span>}
                </label>

                {f.type === "dropdown" ? (
                  f.multiple ? (
                    <div className="udf-multiSelect">
                      <button
                        type="button"
                        className={`udf-multiSelect__trigger${hasErr ? " err" : ""}`}
                        onClick={() =>
                          setOpenMultiField((current) =>
                            current === f.fieldKey ? null : f.fieldKey,
                          )
                        }
                      >
                        <div className="udf-multiSelect__value">
                          {arrayValue(f.fieldKey).length > 0 ? (
                            <div className="udf-multiSelect__chips">
                              {arrayValue(f.fieldKey).map((selectedValue) => {
                                const option = optionItems.find(
                                  (item) => item.value === selectedValue,
                                );
                                return (
                                  <span
                                    key={`${f.fieldKey}-${selectedValue}`}
                                    className="udf-multiSelect__chip"
                                  >
                                    {option?.label ?? selectedValue}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="udf-multiSelect__placeholder">
                              Select one or more options
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`udf-multiSelect__chevron${
                            openMultiField === f.fieldKey ? " open" : ""
                          }`}
                          size={16}
                        />
                      </button>

                      {openMultiField === f.fieldKey && (
                        <div className="udf-multiSelect__panel">
                          {optionItems.length > 0 ? (
                            optionItems.map((option) => {
                              const selected = arrayValue(f.fieldKey).includes(
                                option.value,
                              );
                              return (
                                <button
                                  key={`${f.id}-${option.value}`}
                                  type="button"
                                  className={`udf-multiSelect__option${
                                    selected ? " selected" : ""
                                  }`}
                                  onClick={() =>
                                    toggleMultiValue(f.fieldKey, option.value)
                                  }
                                >
                                  <span className="udf-multiSelect__check">
                                    {selected ? <Check size={14} /> : null}
                                  </span>
                                  <span className="udf-multiSelect__optionLabel">
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="udf-multiSelect__empty">
                              No options available
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <select
                      className={`form-input${hasErr ? " err" : ""}`}
                      value={stringValue(f.fieldKey)}
                      onChange={(e) => set(f.fieldKey, e.target.value)}
                    >
                      <option value="">Select</option>
                      {optionItems.map((option) => (
                        <option key={`${f.id}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <input
                    type={f.type === "numeric" ? "tel" : "text"}
                    className={`form-input${hasErr ? " err" : ""}`}
                    value={stringValue(f.fieldKey)}
                    onChange={(e) => set(f.fieldKey, e.target.value)}
                    placeholder={`Enter ${f.name}`}
                  />
                )}
              </div>
            );
          })}
          {pair.length === 1 && <div />}
        </div>
      ))}
    </div>
  );
}
