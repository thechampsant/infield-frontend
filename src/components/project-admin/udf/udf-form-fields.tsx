"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { udfConfigService } from "@/lib/api";
import type { UDFField, UDFValue } from "@/types/project-admin";

interface UDFFormFieldsProps {
  fields: UDFField[];
  values: Record<string, UDFValue>;
  onChange: (values: Record<string, UDFValue>) => void;
  errors: string[];
  projectId: string;
  prefix?: string;
  excludedOptionValues?: string[];
}

export function UDFFormFields({
  fields,
  values,
  onChange,
  errors,
  projectId,
  prefix = "udf_",
  excludedOptionValues = [],
}: UDFFormFieldsProps) {
  const set = (fieldKey: string, val: UDFValue) =>
    onChange({ ...values, [fieldKey]: val });
  const [dynamicOptions, setDynamicOptions] = useState<Record<number, { label: string; value: string }[]>>({});
  const [openMultiField, setOpenMultiField] = useState<string | null>(null);
  const [multiSearch, setMultiSearch] = useState<Record<string, string>>({});
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
        setMultiSearch({});
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

  const removeMultiValue = (fieldKey: string, optionValue: string) => {
    set(
      fieldKey,
      arrayValue(fieldKey).filter((value) => value !== optionValue),
    );
  };

  const toggleMultiField = (fieldKey: string) => {
    const isOpen = openMultiField === fieldKey;
    setOpenMultiField(isOpen ? null : fieldKey);
    if (isOpen) {
      setMultiSearch((current) => ({
        ...current,
        [fieldKey]: "",
      }));
    }
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
            const visibleOptionItems = optionItems.filter(
              (option) => !excludedOptionValues.includes(option.value),
            );
            const searchQuery = (multiSearch[f.fieldKey] ?? "")
              .trim()
              .toLocaleLowerCase();
            const filteredOptionItems = searchQuery
              ? visibleOptionItems.filter(
                  (option) =>
                    option.label.toLocaleLowerCase().includes(searchQuery) ||
                    option.value.toLocaleLowerCase().includes(searchQuery),
                )
              : visibleOptionItems;
            return (
              <div key={f.id} className="form-group">
                <label className="form-label">
                  {f.name}
                  {f.mandatory && <span className="req"> *</span>}
                </label>

                {f.type === "dropdown" ? (
                  f.multiple ? (
                    <div className="udf-multiSelect">
                      <div
                        className={`udf-multiSelect__trigger${hasErr ? " err" : ""}`}
                        onClick={() => toggleMultiField(f.fieldKey)}
                      >
                        <div className="udf-multiSelect__value">
                          {arrayValue(f.fieldKey).length > 0 ? (
                            <div className="udf-multiSelect__chips">
                              {arrayValue(f.fieldKey).map((selectedValue) => {
                                const option = visibleOptionItems.find(
                                  (item) => item.value === selectedValue,
                                );
                                return (
                                  <span
                                    key={`${f.fieldKey}-${selectedValue}`}
                                    className="udf-multiSelect__chip"
                                  >
                                    <span>{option?.label ?? selectedValue}</span>
                                    <button
                                      type="button"
                                      className="udf-multiSelect__chipRemove"
                                      aria-label={`Remove ${
                                        option?.label ?? selectedValue
                                      }`}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        removeMultiValue(
                                          f.fieldKey,
                                          selectedValue,
                                        );
                                      }}
                                      onKeyDown={(event) => event.stopPropagation()}
                                    >
                                      <X size={12} aria-hidden="true" />
                                    </button>
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
                        <button
                          type="button"
                          className="udf-multiSelect__toggle"
                          aria-label={`${openMultiField === f.fieldKey ? "Close" : "Open"} ${
                            f.name
                          } options`}
                          aria-expanded={openMultiField === f.fieldKey}
                          aria-haspopup="menu"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleMultiField(f.fieldKey);
                          }}
                        >
                          <ChevronDown
                            className={`udf-multiSelect__chevron${
                              openMultiField === f.fieldKey ? " open" : ""
                            }`}
                            size={16}
                          />
                        </button>
                      </div>

                      {openMultiField === f.fieldKey && (
                        <div className="udf-multiSelect__panel">
                          <div className="udf-multiSelect__search">
                            <Search size={15} aria-hidden="true" />
                            <input
                              autoFocus
                              type="search"
                              value={multiSearch[f.fieldKey] ?? ""}
                              onChange={(event) =>
                                setMultiSearch((current) => ({
                                  ...current,
                                  [f.fieldKey]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                  setOpenMultiField(null);
                                  setMultiSearch((current) => ({
                                    ...current,
                                    [f.fieldKey]: "",
                                  }));
                                }
                              }}
                              placeholder={`Search ${f.name.toLocaleLowerCase()}`}
                              aria-label={`Search ${f.name}`}
                            />
                          </div>
                          <div className="udf-multiSelect__options">
                            {filteredOptionItems.length > 0 ? (
                              filteredOptionItems.map((option, optIdx) => {
                                const selected = arrayValue(f.fieldKey).includes(
                                  option.value,
                                );
                                return (
                                  <button
                                    key={`${f.id}-${option.value}-${optIdx}`}
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
                                {visibleOptionItems.length > 0
                                  ? "No matching options"
                                  : "No options available"}
                              </div>
                            )}
                          </div>
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
                      {visibleOptionItems.map((option, optIdx) => (
                        <option key={`${f.id}-${option.value}-${optIdx}`} value={option.value}>
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
