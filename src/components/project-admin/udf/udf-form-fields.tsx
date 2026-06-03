"use client";

import { useEffect, useState } from "react";
import { udfConfigService } from "@/lib/api";
import type { UDFField } from "@/types/project-admin";

interface UDFFormFieldsProps {
  fields: UDFField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
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
  const set = (fieldKey: string, val: string) =>
    onChange({ ...values, [fieldKey]: val });
  const [dynamicOptions, setDynamicOptions] = useState<Record<number, { label: string; value: string }[]>>({});

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

  const pairs: UDFField[][] = [];
  for (let i = 0; i < fields.length; i += 2) pairs.push(fields.slice(i, i + 2));

  return (
    <>
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
                  <select
                    className={`form-input${hasErr ? " err" : ""}`}
                    value={values[f.fieldKey] ?? ""}
                    onChange={(e) => set(f.fieldKey, e.target.value)}
                  >
                    <option value="">Select</option>
                    {optionItems.map((option) => (
                      <option key={`${f.id}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === "numeric" ? "tel" : "text"}
                    className={`form-input${hasErr ? " err" : ""}`}
                    value={values[f.fieldKey] ?? ""}
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
    </>
  );
}
