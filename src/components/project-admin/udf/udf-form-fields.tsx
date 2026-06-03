"use client";

import type { UDFField } from "@/types/project-admin";

interface UDFFormFieldsProps {
  fields: UDFField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  errors: string[];
  prefix?: string;
}

export function UDFFormFields({
  fields,
  values,
  onChange,
  errors,
  prefix = "udf_",
}: UDFFormFieldsProps) {
  const set = (name: string, val: string) => onChange({ ...values, [name]: val });

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
            return (
              <div key={f.id} className="form-group">
                <label className="form-label">
                  {f.name}
                  {f.mandatory && <span className="req"> *</span>}
                </label>

                {f.type === "dropdown" ? (
                  <select
                    className={`form-input${hasErr ? " err" : ""}`}
                    value={values[f.name] ?? ""}
                    onChange={(e) => set(f.name, e.target.value)}
                  >
                    <option value="">Select</option>
                    {f.values.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type === "numeric" ? "tel" : "text"}
                    className={`form-input${hasErr ? " err" : ""}`}
                    value={values[f.name] ?? ""}
                    onChange={(e) => set(f.name, e.target.value)}
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
