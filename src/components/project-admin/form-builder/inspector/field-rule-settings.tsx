import type { CSSProperties } from "react";
import type { ConditionRule, FormField } from "@/lib/form-builder/types";

const panel: CSSProperties = { display: "grid", gap: 8, padding: "8px 16px", fontSize: 13 };
const control: CSSProperties = { display: "block", width: "100%", padding: 6, marginTop: 4, border: "1px solid #cbd5e1", borderRadius: 6 };
const storeFields = { storeCode: "Store Code", storeName: "Store Name" };

export function StorePrefillSettings({ field, update }: {
  field: FormField;
  update: (changes: Partial<FormField>) => void;
}) {
  return (
    <div style={panel}>
      <label>Pre-fill source
        <select style={control} value={field.prefillSource ?? ""} onChange={(event) => {
          const store = event.target.value === "store-mapping";
          update({ prefillSource: store ? "store-mapping" : null, prefillField: store ? "storeCode" : "", prefillCustomValue: "" });
        }}>
          <option value="">None</option>
          <option value="store-mapping">Store Mapping</option>
          {field.prefillSource && field.prefillSource !== "store-mapping" && (
            <option value={field.prefillSource}>{field.prefillSource}</option>
          )}
        </select>
      </label>
      {field.prefillSource === "store-mapping" && (
        <label>Store field
          <select style={control} value={field.prefillField} onChange={(event) => update({ prefillField: event.target.value })}>
            {!Object.hasOwn(storeFields, field.prefillField) && <option value={field.prefillField}>{field.prefillField || "Select a store field…"}</option>}
            {Object.entries(storeFields).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

export function RequiredRuleSettings({ rules, candidates, onChange }: {
  rules: ConditionRule[];
  candidates: FormField[];
  onChange: (rules: ConditionRule[]) => void;
}) {
  function change(id: string, patch: Partial<ConditionRule>) {
    onChange(rules.map((rule) => rule.id === id ? { ...rule, ...patch } : rule));
  }

  return (
    <div style={panel}>
      {rules.map((rule) => {
        const source = candidates.find((candidate) => candidate.id === rule.sourceFieldId);
        const options = source?.type === "toggle"
          ? [{ value: "true", label: source.toggleOnLabel || "Yes" }, { value: "false", label: source.toggleOffLabel || "No" }]
          : (source?.manualOptions ?? []).map((value) => ({ value, label: value }));
        return (
          <div key={rule.id}>
            <label>Require when
              <select style={control} value={rule.sourceFieldId} onChange={(event) => change(rule.id, { sourceFieldId: event.target.value, value: "" })}>
                <option value="">Select a field…</option>
                {candidates.map((field) => <option key={field.id} value={field.id}>{field.label || field.type}</option>)}
              </select>
            </label>
            <label>Condition
              <select style={control} value={rule.operator} onChange={(event) => change(rule.id, { operator: event.target.value as ConditionRule["operator"] })}>
                <option value="equals">Equals</option>
                <option value="not_equals">Does not equal</option>
                <option value="contains">Contains</option>
                <option value="is_empty">Is empty</option>
                <option value="is_not_empty">Is not empty</option>
              </select>
            </label>
            {rule.operator !== "is_empty" && rule.operator !== "is_not_empty" && (
              <label>Answer
                {options.length > 0 ? (
                  <select style={control} value={rule.value} onChange={(event) => change(rule.id, { value: event.target.value })}>
                    <option value="">Select an answer…</option>
                    {rule.value && !options.some((option) => option.value === rule.value) && <option value={rule.value}>{rule.value}</option>}
                    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : <input style={control} value={rule.value} onChange={(event) => change(rule.id, { value: event.target.value })} />}
              </label>
            )}
            <button type="button" onClick={() => onChange(rules.filter((item) => item.id !== rule.id))}>Remove condition</button>
          </div>
        );
      })}
      <button type="button" disabled={!candidates.length} onClick={() => onChange([...rules, {
        id: crypto.randomUUID(), sourceFieldId: "", operator: "equals", value: "",
      }])}>Add condition</button>
      {!candidates.length && <span>Add another question to use as a condition.</span>}
    </div>
  );
}
