"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatApiError, udfConfigService } from "@/lib/api";
import type {
  UdfDataSourceDefinition,
  UdfDatasourceFilterParamSchema,
  UdfDatasourceFilterModesResponse,
  UdfFieldType,
  UdfSchemaField,
  UdfSourcePreviewItem,
} from "@/lib/api";
import { ArrowDown, ArrowUp, ChevronLeft, Copy, Info, Trash2 } from "lucide-react";

interface Props {
  projectId: string;
  claimTypeName: string;
  fields: UdfSchemaField[];
  savedFields: UdfSchemaField[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  validationErrors: string[];
  onChange: (fields: UdfSchemaField[]) => void;
  onSave: () => void;
  onBack: () => void;
  moduleLabel?: string;
  showSystemFields?: boolean;
  enableDatasourceFilters?: boolean;
  enableAdvancedSalesFields?: boolean;
}

type FieldComponent = {
  key: UdfFieldType;
  label: string;
  icon: string;
};

const FIELD_COMPONENTS: FieldComponent[] = [
  { key: "DROPDOWN", label: "Dropdown", icon: "▼" },
  { key: "SELECT", label: "Select", icon: "☷" },
  { key: "CASCADING_SELECT", label: "Cascading Select", icon: "⇢" },
  { key: "API_SELECT", label: "API Select", icon: "⌁" },
  { key: "STRING", label: "Short Text", icon: "T" },
  { key: "NUMBER", label: "Number", icon: "#" },
  { key: "DATE", label: "Date", icon: "📅" },
  { key: "BOOLEAN", label: "Yes / No", icon: "◉" },
  { key: "IMAGE", label: "Image Upload", icon: "🖼" },
  { key: "FILE", label: "File Upload", icon: "📎" },
];

const SALES_ADVANCED_FIELD_COMPONENTS: FieldComponent[] = [
  { key: "REPEATABLE_GROUP", label: "Repeatable Group", icon: "▦" },
  { key: "FORMULA", label: "Formula", icon: "ƒ" },
];

const CHILD_FIELD_COMPONENTS: FieldComponent[] = [
  { key: "STRING", label: "Short Text", icon: "T" },
  { key: "NUMBER", label: "Number", icon: "#" },
  { key: "DATE", label: "Date", icon: "📅" },
  { key: "BOOLEAN", label: "Yes / No", icon: "◉" },
  { key: "DROPDOWN", label: "Dropdown", icon: "▼" },
  { key: "SELECT", label: "Select", icon: "☷" },
  { key: "API_SELECT", label: "API Select", icon: "⌁" },
  { key: "CASCADING_SELECT", label: "Cascading Select", icon: "⇢" },
  { key: "FORMULA", label: "Formula", icon: "ƒ" },
];

function createField(type: UdfFieldType, order: number): UdfSchemaField {
  const labels: Record<UdfFieldType, string> = {
    STRING: "Short Text",
    NUMBER: "Enter Amount",
    DATE: "Claim Date",
    DROPDOWN: "Select type",
    IMAGE: "Bills / Invoices Upload",
    FILE: "File Upload",
    API_SELECT: "Select from API",
    BOOLEAN: "Yes / No",
    SELECT: "Select",
    CASCADING_SELECT: "Cascading Select",
    REPEATABLE_GROUP: "Repeatable Group",
    FORMULA: "Formula",
  };

  return {
    fieldKey: `field_${order}`,
    label: labels[type] || `Field ${order}`,
    type,
    required: type === "NUMBER" || type === "IMAGE",
    order,
    status: true,
    summaryKey: false,
    config:
      type === "SELECT" || type === "DROPDOWN"
        ? { options: [] }
        : type === "API_SELECT"
          ? { dataSource: "", sourceKey: "", labelField: "", valueField: "", multiple: false }
          : type === "CASCADING_SELECT"
            ? { dependsOn: "", options: [] }
            : type === "IMAGE"
              ? { source: "Both", multiple: false, maxCount: 1 }
              : type === "FILE"
                ? { multiple: false, maxCount: 1, accept: [] }
                : type === "REPEATABLE_GROUP"
                  ? { minRows: 1, maxRows: 10, fields: [] }
                  : type === "FORMULA"
                    ? { scope: "row", expression: [], precision: 2 }
                    : undefined,
  };
}

function getFieldTypeLabel(type: UdfFieldType): string {
  const map: Record<UdfFieldType, string> = {
    STRING: "SHORT TEXT",
    NUMBER: "NUMBER",
    DATE: "DATE",
    DROPDOWN: "DROPDOWN",
    IMAGE: "IMAGE UPLOAD",
    FILE: "FILE",
    API_SELECT: "API SELECT",
    BOOLEAN: "PARAGRAPH",
    SELECT: "SELECT",
    CASCADING_SELECT: "CASCADING",
    REPEATABLE_GROUP: "GROUP",
    FORMULA: "FORMULA",
  };
  return map[type] || type;
}

function MediaSettings({
  field,
  onChange,
}: {
  field: UdfSchemaField;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const config = field.config as Record<string, unknown> | undefined;
  const multiple = config?.multiple === true;
  return (
    <>
      <div className="claims-fb-toggles">
        <label>
          <input
            type="checkbox"
            checked={multiple}
            onChange={(event) =>
              onChange({
                multiple: event.target.checked,
                maxCount: event.target.checked ? Number(config?.maxCount) || 5 : 1,
              })
            }
          />
          Allow multiple uploads
        </label>
      </div>
      {multiple && (
        <div className="claims-fb-formGroup">
          <label>Maximum Files</label>
          <input
            type="number"
            min={1}
            className="form-input"
            value={Number(config?.maxCount) || 5}
            onChange={(event) =>
              onChange({ maxCount: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        </div>
      )}
    </>
  );
}

function configRecord(field: UdfSchemaField | null): Record<string, unknown> {
  return field?.config && typeof field.config === "object"
    ? (field.config as Record<string, unknown>)
    : {};
}

function fieldSourceKey(field: UdfSchemaField | null): string {
  const config = configRecord(field);
  return String(config.dataSource ?? config.sourceKey ?? "").trim();
}

function filterConfig(config: Record<string, unknown>): {
  mode: string;
  params: Record<string, unknown>;
} {
  const raw = config.filters;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { mode: "", params: {} };
  }
  const filters = raw as Record<string, unknown>;
  const params =
    filters.params && typeof filters.params === "object" && !Array.isArray(filters.params)
      ? (filters.params as Record<string, unknown>)
      : {};
  return {
    mode: String(filters.mode ?? "").trim(),
    params,
  };
}

function childFields(field: UdfSchemaField | null): UdfSchemaField[] {
  const config = configRecord(field);
  return Array.isArray(config.fields) ? (config.fields as UdfSchemaField[]) : [];
}

function expressionText(field: UdfSchemaField): string {
  const config = configRecord(field);
  const expression = Array.isArray(config.expression) ? config.expression : [];
  return expression
    .map((token) => {
      if (!token || typeof token !== "object" || Array.isArray(token)) return "";
      const raw = token as Record<string, unknown>;
      if (raw.type === "field") return `field:${String(raw.fieldKey ?? "")}`;
      if (raw.type === "constant") return `constant:${String(raw.value ?? "")}`;
      if (raw.type === "operator") return `operator:${String(raw.operator ?? "")}`;
      if (raw.type === "paren") return `paren:${String(raw.paren ?? "")}`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function parseExpression(text: string): Array<Record<string, unknown>> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): Record<string, unknown> | null => {
      const separator = line.indexOf(":");
      if (separator < 1) return null;
      const kind = line.slice(0, separator).trim().toLowerCase();
      const value = line.slice(separator + 1).trim();
      if (kind === "field" && value) return { type: "field", fieldKey: value };
      if (kind === "constant" && value !== "") {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? { type: "constant", value: numberValue } : null;
      }
      if (kind === "operator" && ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"].includes(value.toUpperCase())) {
        return { type: "operator", operator: value.toUpperCase() };
      }
      if (kind === "paren" && ["OPEN", "CLOSE"].includes(value.toUpperCase())) {
        return { type: "paren", paren: value.toUpperCase() };
      }
      return null;
    })
    .filter((token): token is Record<string, unknown> => Boolean(token));
}

type FormulaTerm = {
  fieldKey: string;
  operator?: string;
};

function formulaTermsFromExpression(expression: unknown): FormulaTerm[] {
  if (!Array.isArray(expression)) return [{ fieldKey: "" }];
  const terms: FormulaTerm[] = [];
  expression.forEach((token) => {
    if (!token || typeof token !== "object" || Array.isArray(token)) return;
    const raw = token as Record<string, unknown>;
    if (raw.type === "field") {
      terms.push({ fieldKey: String(raw.fieldKey ?? "") });
    }
    if (raw.type === "operator" && terms.length > 0) {
      terms[terms.length - 1].operator = String(raw.operator ?? "ADD");
    }
  });
  return terms.length ? terms : [{ fieldKey: "" }];
}

function expressionFromFormulaTerms(terms: FormulaTerm[]): Array<Record<string, unknown>> {
  return terms.flatMap((term, index) => {
    if (!term.fieldKey) return [];
    const tokens: Array<Record<string, unknown>> = [
      { type: "field", fieldKey: term.fieldKey },
    ];
    const hasNextField = terms.slice(index + 1).some((item) => item.fieldKey);
    if (term.operator && hasNextField) {
      tokens.push({ type: "operator", operator: term.operator });
    }
    return tokens;
  });
}

function numericChildFields(group: UdfSchemaField | undefined): UdfSchemaField[] {
  if (!group) return [];
  return childFields(group).filter((field) => field.status !== false && (field.type === "NUMBER" || field.type === "FORMULA"));
}

function datasourceKeysFromFields(fields: UdfSchemaField[]): string[] {
  const keys = new Set<string>();
  fields.forEach((field) => {
    const sourceKey = fieldSourceKey(field);
    if (sourceKey) keys.add(sourceKey);
    if (field.type === "REPEATABLE_GROUP") {
      datasourceKeysFromFields(childFields(field)).forEach((childSourceKey) =>
        keys.add(childSourceKey),
      );
    }
  });
  return [...keys];
}

function fieldDataSource(field: UdfSchemaField): string {
  const config = configRecord(field);
  return String(config.dataSource ?? config.sourceKey ?? "").trim();
}

function isAllowedFieldReference(
  field: UdfSchemaField,
  schema: UdfDatasourceFilterParamSchema,
): boolean {
  const allowedFieldTypes = schema.allowedFieldTypes?.map((type) => String(type).toUpperCase());
  if (allowedFieldTypes?.length && !allowedFieldTypes.includes(field.type)) {
    return false;
  }

  const allowedDataSources = schema.allowedDataSources?.map((source) => source.toUpperCase());
  if (!allowedDataSources?.length) return true;

  const sourceKey = fieldDataSource(field).toUpperCase();
  return Boolean(sourceKey && allowedDataSources.includes(sourceKey));
}

export function ClaimsFormBuilderV2({
  projectId,
  claimTypeName,
  fields,
  savedFields,
  loading,
  saving,
  error,
  validationErrors,
  onChange,
  onSave,
  onBack,
  moduleLabel = "Claims Form",
  showSystemFields = true,
  enableDatasourceFilters = false,
  enableAdvancedSalesFields = false,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedChild, setSelectedChild] = useState<{
    parentIndex: number;
    childIndex: number;
  } | null>(null);
  const [sources, setSources] = useState<UdfDataSourceDefinition[]>([]);
  const [filterModesBySource, setFilterModesBySource] = useState<
    Record<string, UdfDatasourceFilterModesResponse>
  >({});
  const [filterModesLoading, setFilterModesLoading] = useState<Record<string, boolean>>({});
  const [sourcePreview, setSourcePreview] = useState<UdfSourcePreviewItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [datasourceError, setDatasourceError] = useState<string | null>(null);
  const [helperOpen, setHelperOpen] = useState<string | null>(null);
  // Local draft for the options textarea — avoids losing newlines on each keystroke
  const [optionsDraft, setOptionsDraft] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(fields) !== JSON.stringify(savedFields),
    [fields, savedFields],
  );
  const fieldComponents = useMemo(
    () => enableAdvancedSalesFields
      ? [...FIELD_COMPONENTS, ...SALES_ADVANCED_FIELD_COMPONENTS]
      : FIELD_COMPONENTS,
    [enableAdvancedSalesFields],
  );
  const datasourceKeys = useMemo(
    () => enableDatasourceFilters ? datasourceKeysFromFields(fields) : [],
    [enableDatasourceFilters, fields],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSources() {
      try {
        const sourceList = await udfConfigService.getSources();
        if (!cancelled) setSources(sourceList);
      } catch (err) {
        console.error("Failed to load sources:", err);
      }
    }
    void loadSources();
    return () => {
      cancelled = true;
    };
  }, []);

  function addField(type: UdfFieldType) {
    // Reset options draft when switching fields
    setOptionsDraft(null);
    setSelectedChild(null);
    // Find the maximum order value to avoid duplicates
    const maxOrder = fields.length > 0 
      ? Math.max(...fields.map(f => f.order ?? 0))
      : 0;
    const newField = createField(type, maxOrder + 1);
    const updated = [...fields, newField];
    onChange(updated);
    setSelectedIndex(updated.length - 1);
  }

  function updateField(index: number, patch: Partial<UdfSchemaField>) {
    if (index < 0 || index >= fields.length) return;
    onChange(
      fields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    );
  }

  function updateFieldConfig(index: number, patch: Record<string, unknown>) {
    if (index < 0 || index >= fields.length) return;
    onChange(
      fields.map((field, i) => {
        if (i !== index) return field;
        const current =
          field.config && typeof field.config === "object"
            ? (field.config as Record<string, unknown>)
            : {};
        return { ...field, config: { ...current, ...patch } };
      }),
    );
  }

  function updateRepeatableChildFields(index: number, nextFields: UdfSchemaField[]) {
    updateFieldConfig(index, {
      fields: nextFields.map((field, orderIndex) => ({
        ...field,
        order: orderIndex + 1,
        status: field.status ?? true,
      })),
    });
  }

  function addRepeatableChild(index: number, type: UdfFieldType) {
    const current = childFields(fields[index] ?? null);
    const child = {
      ...createField(type, current.length + 1),
      fieldKey: `child_${current.length + 1}`,
      label: type === "NUMBER" ? "Number" : getFieldTypeLabel(type).replaceAll("_", " "),
      required: false,
    };
    updateRepeatableChildFields(index, [...current, child]);
    setSelectedIndex(index);
    setSelectedChild({ parentIndex: index, childIndex: current.length });
  }

  function patchRepeatableChild(index: number, childIndex: number, patch: Partial<UdfSchemaField>) {
    const current = childFields(fields[index] ?? null);
    updateRepeatableChildFields(
      index,
      current.map((field, i) => (i === childIndex ? { ...field, ...patch } : field)),
    );
  }

  function patchRepeatableChildConfig(
    index: number,
    childIndex: number,
    patch: Record<string, unknown>,
  ) {
    const current = childFields(fields[index] ?? null);
    updateRepeatableChildFields(
      index,
      current.map((field, i) => {
        if (i !== childIndex) return field;
        return {
          ...field,
          config: {
            ...(field.config && typeof field.config === "object" ? field.config : {}),
            ...patch,
          },
        };
      }),
    );
  }

  function replaceRepeatableChildConfig(
    index: number,
    childIndex: number,
    updater: (config: Record<string, unknown>) => Record<string, unknown>,
  ) {
    const current = childFields(fields[index] ?? null);
    updateRepeatableChildFields(
      index,
      current.map((field, i) => {
        if (i !== childIndex) return field;
        const next = updater(configRecord(field));
        return {
          ...field,
          config: Object.keys(next).length > 0 ? next : undefined,
        };
      }),
    );
  }

  function updateRepeatableChildDatasourceFilter(
    index: number,
    childIndex: number,
    mode: string,
  ) {
    replaceRepeatableChildConfig(index, childIndex, (current) => {
      const next = { ...current };
      if (!mode) {
        delete next.filters;
        return next;
      }
      next.filters = { mode, params: {} };
      return next;
    });
  }

  function updateRepeatableChildDatasourceFilterParam(
    index: number,
    childIndex: number,
    key: string,
    value: string,
  ) {
    replaceRepeatableChildConfig(index, childIndex, (current) => {
      const currentFilter = filterConfig(current);
      if (!currentFilter.mode) return current;
      const params = { ...currentFilter.params };
      if (value) {
        params[key] = value;
      } else {
        delete params[key];
      }
      return {
        ...current,
        filters: {
          mode: currentFilter.mode,
          ...(Object.keys(params).length > 0 ? { params } : {}),
        },
      };
    });
  }

  function removeRepeatableChild(index: number, childIndex: number) {
    const current = childFields(fields[index] ?? null);
    updateRepeatableChildFields(index, current.filter((_, i) => i !== childIndex));
    if (selectedChild?.parentIndex === index) {
      if (selectedChild.childIndex === childIndex) {
        setSelectedChild(null);
      } else if (selectedChild.childIndex > childIndex) {
        setSelectedChild({ parentIndex: index, childIndex: selectedChild.childIndex - 1 });
      }
    }
  }

  function replaceFieldConfig(
    index: number,
    updater: (config: Record<string, unknown>) => Record<string, unknown>,
  ) {
    if (index < 0 || index >= fields.length) return;
    onChange(
      fields.map((field, i) => {
        if (i !== index) return field;
        const next = updater(configRecord(field));
        return {
          ...field,
          config: Object.keys(next).length > 0 ? next : undefined,
        };
      }),
    );
  }

  function removeField(index: number) {
    const updated = fields.filter((_, i) => i !== index);
    onChange(updated);
    setSelectedChild(null);
    // Reset selection if the removed field was selected, or if selection is now out of bounds
    if (selectedIndex === index || (selectedIndex !== null && selectedIndex >= updated.length)) {
      setSelectedIndex(null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      // Adjust selection index if removing a field before the selected one
      setSelectedIndex(selectedIndex - 1);
    }
  }

  function duplicateField(index: number) {
    const field = fields[index];
    // Find the maximum order value to avoid duplicates
    const maxOrder = Math.max(...fields.map(f => f.order ?? 0));
    const newField = { ...field, fieldKey: `${field.fieldKey}_copy`, order: maxOrder + 1 };
    onChange([...fields, newField]);
  }

  function moveField(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const updated = [...fields];
    const current = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = current;
    onChange(updated.map((field, orderIndex) => ({ ...field, order: orderIndex + 1 })));
    if (selectedIndex === index) {
      setSelectedIndex(targetIndex);
      if (selectedChild?.parentIndex === index) {
        setSelectedChild({ ...selectedChild, parentIndex: targetIndex });
      }
    } else if (selectedIndex === targetIndex) {
      setSelectedIndex(index);
      if (selectedChild?.parentIndex === targetIndex) {
        setSelectedChild({ ...selectedChild, parentIndex: index });
      }
    }
  }

  function optionsText(field: UdfSchemaField): string {
    const config = field.config as Record<string, unknown> | undefined;
    const options = Array.isArray(config?.options) ? config.options : [];
    return options.map(String).join("\n");
  }

  function cascadingOptionsText(field: UdfSchemaField): string {
    const config = field.config as Record<string, unknown> | undefined;
    const options = Array.isArray(config?.options) ? config.options : [];
    return options
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const option = item as Record<string, unknown>;
        return `${String(option.parentValue ?? "")}:${String(option.value ?? "")}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  async function previewApiSource() {
    if (selectedIndex === null || !selectedField) return;
    const config = selectedField.config as Record<string, unknown> | undefined;
    const sourceKey = String(config?.dataSource ?? config?.sourceKey ?? "");
    if (!sourceKey) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      setSourcePreview(
        await udfConfigService.previewSource(sourceKey, { projectId }),
      );
    } catch (err) {
      setPreviewError(formatApiError(err, "Failed to preview data source"));
      setSourcePreview([]);
    } finally {
      setPreviewLoading(false);
    }
  }

  const loadFilterModes = useCallback(async (sourceKey: string) => {
    if (!enableDatasourceFilters || !sourceKey || filterModesBySource[sourceKey]) return;
    setFilterModesLoading((current) => ({ ...current, [sourceKey]: true }));
    setDatasourceError(null);
    try {
      const modes = await udfConfigService.getSourceFilterModes(sourceKey);
      setFilterModesBySource((current) => ({ ...current, [sourceKey]: modes }));
    } catch (err) {
      setDatasourceError(formatApiError(err, "Failed to load datasource filter modes"));
    } finally {
      setFilterModesLoading((current) => ({ ...current, [sourceKey]: false }));
    }
  }, [enableDatasourceFilters, filterModesBySource]);

  function updateDatasourceFilter(index: number, mode: string) {
    replaceFieldConfig(index, (current) => {
      const next = { ...current };
      if (!mode) {
        delete next.filters;
        return next;
      }
      next.filters = { mode, params: {} };
      return next;
    });
  }

  function updateDatasourceFilterParam(index: number, key: string, value: string) {
    replaceFieldConfig(index, (current) => {
      const currentFilter = filterConfig(current);
      if (!currentFilter.mode) return current;
      const params = { ...currentFilter.params };
      if (value) {
        params[key] = value;
      } else {
        delete params[key];
      }
      return {
        ...current,
        filters: {
          mode: currentFilter.mode,
          ...(Object.keys(params).length > 0 ? { params } : {}),
        },
      };
    });
  }

  const selectedField = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < fields.length 
    ? fields[selectedIndex] 
    : null;
  const selectedChildField =
    selectedChild &&
    selectedChild.parentIndex >= 0 &&
    selectedChild.parentIndex < fields.length
      ? childFields(fields[selectedChild.parentIndex]).at(selectedChild.childIndex) ?? null
      : null;
  const selectedChildContextFields =
    selectedChild && selectedChild.parentIndex >= 0 && selectedChild.parentIndex < fields.length
      ? [
          ...fields.filter((_, index) => index !== selectedChild.parentIndex),
          ...childFields(fields[selectedChild.parentIndex]).filter(
            (_, index) => index !== selectedChild.childIndex,
          ),
        ]
      : [];
  const selectedSourceKey = enableDatasourceFilters ? fieldSourceKey(selectedField) : "";

  useEffect(() => {
    if (!selectedSourceKey) return;
    void loadFilterModes(selectedSourceKey);
  }, [loadFilterModes, selectedSourceKey]);

  useEffect(() => {
    datasourceKeys.forEach((sourceKey) => {
      void loadFilterModes(sourceKey);
    });
  }, [datasourceKeys, loadFilterModes]);

  function renderHelperButton(id: string, label: string, body: string) {
    const open = helperOpen === id;
    return (
      <div className="claims-fb-helpWrap">
        <button
          type="button"
          className="claims-fb-helpBtn"
          aria-label={`What is ${label}?`}
          aria-expanded={open}
          onClick={() => setHelperOpen(open ? null : id)}
        >
          <Info size={13} />
        </button>
        {open && (
          <div className="claims-fb-helpPop" role="status">
            <strong>{label}</strong>
            <p>{body}</p>
          </div>
        )}
      </div>
    );
  }

  function renderDatasourceFilterControls({
    field,
    idPrefix,
    availableFields,
    onModeChange,
    onParamChange,
  }: {
    field: UdfSchemaField;
    idPrefix: string;
    availableFields: UdfSchemaField[];
    onModeChange: (mode: string) => void;
    onParamChange: (key: string, value: string) => void;
  }) {
    if (!enableDatasourceFilters) return null;
    const sourceKey = fieldSourceKey(field);
    const config = configRecord(field);
    const activeFilter = filterConfig(config);
    const response = sourceKey ? filterModesBySource[sourceKey] : undefined;
    const selectedMode = response?.modes.find((mode) => mode.key === activeFilter.mode);
    const fieldReferenceParams = Object.entries(selectedMode?.paramsSchema ?? {})
      .filter(([, schema]) => schema.type === "field_reference");
    const helperId = `${idPrefix}-filter-mode`;

    if (!sourceKey) {
      return (
        <p className="claims-fb-propertiesHint">
          Select a datasource to configure filter modes.
        </p>
      );
    }

    return (
      <>
        <div className="claims-fb-formGroup">
          <div className="claims-fb-labelRow">
            <label>Filter Mode</label>
            {renderHelperButton(
              helperId,
              "Filter mode",
              "Filter modes tell the backend which slice of the datasource to use. Some modes need another form field as context, such as a selected store for mapped product options.",
            )}
          </div>
          <select
            className="form-input"
            disabled={filterModesLoading[sourceKey]}
            value={activeFilter.mode}
            onChange={(event) => onModeChange(event.target.value)}
          >
            <option value="">
              {filterModesLoading[sourceKey]
                ? "Loading filter modes..."
                : `Use datasource default${response?.defaultMode ? ` (${response.defaultMode})` : ""}`}
            </option>
            {response?.modes.map((mode) => (
              <option key={mode.key} value={mode.key}>
                {mode.label}
              </option>
            ))}
          </select>
          {selectedMode?.description ? (
            <p className="hint">{selectedMode.description}</p>
          ) : null}
        </div>

        {fieldReferenceParams.map(([paramKey, schema]) => {
          const paramLabel = schema.label || "Context Field";
          const allowedFields = availableFields.filter((field) =>
            isAllowedFieldReference(field, schema),
          );
          return (
            <div className="claims-fb-formGroup" key={paramKey}>
              <div className="claims-fb-labelRow">
                <label>{paramLabel}</label>
                {renderHelperButton(
                  `${idPrefix}-${paramKey}`,
                  paramLabel,
                  schema.description ||
                    "Select the form field whose current value provides context for this datasource filter.",
                )}
              </div>
              <select
                className="form-input"
                value={String(activeFilter.params[paramKey] ?? "")}
                onChange={(event) =>
                  onParamChange(paramKey, event.target.value)
                }
              >
                <option value="">Select field...</option>
                {allowedFields.map((field, optionIndex) => (
                  <option key={`${field.fieldKey}-${optionIndex}`} value={field.fieldKey}>
                    {field.label} ({field.fieldKey})
                  </option>
                ))}
              </select>
              {schema.description ? <p className="hint">{schema.description}</p> : null}
            </div>
          );
        })}

        {datasourceError ? (
          <p className="claims-fb-propertiesHint">{datasourceError}</p>
        ) : null}
      </>
    );
  }

  function renderSelectedChildProperties() {
    if (!selectedChild || !selectedChildField) return null;
    const parentIndex = selectedChild.parentIndex;
    const childIndex = selectedChild.childIndex;
    const childConfig = configRecord(selectedChildField);
    const formulaNumberFields = childFields(fields[parentIndex])
      .filter((field, index) =>
        index !== childIndex && field.status !== false && field.type === "NUMBER",
      );
    const formulaTerms = formulaTermsFromExpression(childConfig.expression);
    const commitChildFormulaTerms = (terms: FormulaTerm[]) => {
      patchRepeatableChildConfig(parentIndex, childIndex, {
        scope: "row",
        expression: expressionFromFormulaTerms(terms),
        precision: Number(childConfig.precision ?? 2),
      });
    };

    return (
      <div className="claims-fb-propertiesForm">
        <div className="claims-fb-childInspectorHead">
          <button
            type="button"
            className="claims-fb-backBtn"
            onClick={() => setSelectedChild(null)}
          >
            <ChevronLeft size={16} />
            Group Settings
          </button>
          <strong>{selectedChildField.label || `Child ${childIndex + 1}`}</strong>
        </div>

        <div className="claims-fb-formGroup">
          <label>Label</label>
          <input
            className="form-input"
            value={selectedChildField.label}
            onChange={(event) =>
              patchRepeatableChild(parentIndex, childIndex, {
                label: event.target.value,
              })
            }
          />
        </div>

        <div className="claims-fb-formGroup">
          <label>Field Key</label>
          <input
            className="form-input"
            value={selectedChildField.fieldKey}
            onChange={(event) =>
              patchRepeatableChild(parentIndex, childIndex, {
                fieldKey: event.target.value,
              })
            }
          />
        </div>

        <div className="claims-fb-formGroup">
          <label>Field Type</label>
          <select
            className="form-input"
            value={selectedChildField.type}
            onChange={(event) =>
              patchRepeatableChild(parentIndex, childIndex, {
                type: event.target.value as UdfFieldType,
                config: createField(event.target.value as UdfFieldType, childIndex + 1).config,
              })
            }
          >
            {CHILD_FIELD_COMPONENTS.map((component) => (
              <option key={component.key} value={component.key}>
                {component.label}
              </option>
            ))}
          </select>
        </div>

        <div className="claims-fb-toggles">
          <label>
            <input
              type="checkbox"
              checked={Boolean(selectedChildField.required)}
              onChange={(event) =>
                patchRepeatableChild(parentIndex, childIndex, {
                  required: event.target.checked,
                })
              }
            />
            Required
          </label>
          <label>
            <input
              type="checkbox"
              checked={selectedChildField.status ?? true}
              onChange={(event) =>
                patchRepeatableChild(parentIndex, childIndex, {
                  status: event.target.checked,
                })
              }
            />
            Active
          </label>
        </div>

        {(selectedChildField.type === "SELECT" || selectedChildField.type === "DROPDOWN") && (
          <div className="claims-fb-formGroup">
            <label>Options (one per line)</label>
            <textarea
              className="form-input"
              rows={6}
              value={Array.isArray(childConfig.options) ? childConfig.options.join("\n") : ""}
              placeholder={"Option 1\nOption 2"}
              onChange={(event) =>
                patchRepeatableChildConfig(parentIndex, childIndex, {
                  options: event.target.value
                    .split("\n")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        )}

        {selectedChildField.type === "API_SELECT" && (
          <>
            <div className="claims-fb-formGroup">
              <label>Data Source</label>
              <select
                className="form-input"
                value={String(childConfig.dataSource ?? childConfig.sourceKey ?? "")}
                onChange={(event) =>
                  replaceRepeatableChildConfig(parentIndex, childIndex, (current) => {
                    const next: Record<string, unknown> = {
                      ...current,
                      dataSource: event.target.value,
                      sourceKey: event.target.value,
                    };
                    delete next.filters;
                    return next;
                  })
                }
              >
                <option value="">Select source...</option>
                {sources.map((source) => (
                  <option key={source.key} value={source.key}>
                    {source.label || source.name}
                  </option>
                ))}
              </select>
            </div>
            {renderDatasourceFilterControls({
              field: selectedChildField,
              idPrefix: `${parentIndex}-child-${childIndex}-api`,
              availableFields: selectedChildContextFields,
              onModeChange: (mode) =>
                updateRepeatableChildDatasourceFilter(parentIndex, childIndex, mode),
              onParamChange: (key, value) =>
                updateRepeatableChildDatasourceFilterParam(parentIndex, childIndex, key, value),
            })}
            <div className="claims-fb-formGroup">
              <label>Label Field</label>
              <input
                className="form-input"
                value={String(childConfig.labelField ?? "")}
                onChange={(event) =>
                  patchRepeatableChildConfig(parentIndex, childIndex, {
                    labelField: event.target.value,
                  })
                }
              />
            </div>
            <div className="claims-fb-formGroup">
              <label>Value Field</label>
              <input
                className="form-input"
                value={String(childConfig.valueField ?? "")}
                onChange={(event) =>
                  patchRepeatableChildConfig(parentIndex, childIndex, {
                    valueField: event.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        {selectedChildField.type === "CASCADING_SELECT" && (
          <>
            <div className="claims-fb-formGroup">
              <label>Parent Field</label>
              <select
                className="form-input"
                value={String(childConfig.dependsOn ?? "")}
                onChange={(event) =>
                  patchRepeatableChildConfig(parentIndex, childIndex, {
                    dependsOn: event.target.value,
                  })
                }
              >
                <option value="">Select parent field...</option>
                {selectedChildContextFields.map((field, optionIndex) => (
                  <option key={`${field.fieldKey}-${optionIndex}`} value={field.fieldKey}>
                    {field.label} ({field.fieldKey})
                  </option>
                ))}
              </select>
            </div>
            <div className="claims-fb-formGroup">
              <label>Dynamic Source</label>
              <select
                className="form-input"
                value={String(childConfig.sourceKey ?? "")}
                onChange={(event) =>
                  replaceRepeatableChildConfig(parentIndex, childIndex, (current) => {
                    const next: Record<string, unknown> = {
                      ...current,
                      sourceKey: event.target.value,
                    };
                    delete next.filters;
                    return next;
                  })
                }
              >
                <option value="">Use static options</option>
                {sources.map((source) => (
                  <option key={source.key} value={source.key}>
                    {source.label || source.name}
                  </option>
                ))}
              </select>
            </div>
            {renderDatasourceFilterControls({
              field: selectedChildField,
              idPrefix: `${parentIndex}-child-${childIndex}-cascade`,
              availableFields: selectedChildContextFields,
              onModeChange: (mode) =>
                updateRepeatableChildDatasourceFilter(parentIndex, childIndex, mode),
              onParamChange: (key, value) =>
                updateRepeatableChildDatasourceFilterParam(parentIndex, childIndex, key, value),
            })}
            <div className="claims-fb-formGroup">
              <label>Dynamic Value Field</label>
              <input
                className="form-input"
                value={String(childConfig.valueField ?? "")}
                onChange={(event) =>
                  patchRepeatableChildConfig(parentIndex, childIndex, {
                    valueField: event.target.value,
                  })
                }
              />
            </div>
            <div className="claims-fb-formGroup">
              <label>Dynamic Parent Field</label>
              <input
                className="form-input"
                value={String(childConfig.parentField ?? "")}
                onChange={(event) =>
                  patchRepeatableChildConfig(parentIndex, childIndex, {
                    parentField: event.target.value,
                  })
                }
              />
            </div>
          </>
        )}

        {selectedChildField.type === "FORMULA" && (
          <>
            <div className="claims-fb-formGroup">
              <label>Formula Expression</label>
              {formulaNumberFields.length === 0 ? (
                <p className="claims-fb-propertiesHint">
                  Add a NUMBER child field before configuring this formula.
                </p>
              ) : (
                <div className="claims-fb-formulaBuilder">
                  {formulaTerms.map((term, termIndex) => (
                    <div className="claims-fb-formulaTerm" key={`formula-term-${termIndex}`}>
                      <select
                        className="form-input"
                        value={term.fieldKey}
                        onChange={(event) => {
                          const next = [...formulaTerms];
                          next[termIndex] = { ...term, fieldKey: event.target.value };
                          commitChildFormulaTerms(next);
                        }}
                      >
                        <option value="">Select number field...</option>
                        {formulaNumberFields.map((field) => (
                          <option key={field.fieldKey} value={field.fieldKey}>
                            {field.label} ({field.fieldKey})
                          </option>
                        ))}
                      </select>
                      {termIndex < formulaTerms.length - 1 && (
                        <select
                          className="form-input claims-fb-operatorSelect"
                          value={term.operator || "ADD"}
                          onChange={(event) => {
                            const next = [...formulaTerms];
                            next[termIndex] = { ...term, operator: event.target.value };
                            commitChildFormulaTerms(next);
                          }}
                        >
                          <option value="ADD">+</option>
                          <option value="SUBTRACT">-</option>
                          <option value="MULTIPLY">×</option>
                          <option value="DIVIDE">÷</option>
                        </select>
                      )}
                      {termIndex === formulaTerms.length - 1 && (
                        <span className="claims-fb-formulaOperatorSpacer" />
                      )}
                      <button
                        type="button"
                        className="claims-fb-iconBtn danger"
                        disabled={formulaTerms.length <= 1}
                        title="Remove term"
                        onClick={() => {
                          const next = formulaTerms
                            .filter((_, index) => index !== termIndex)
                            .map((item, index, list) =>
                              index === list.length - 1 ? { fieldKey: item.fieldKey } : item,
                            );
                          commitChildFormulaTerms(next);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const next = [...formulaTerms];
                      if (next.length > 0) {
                        next[next.length - 1] = {
                          ...next[next.length - 1],
                          operator: next[next.length - 1].operator || "ADD",
                        };
                      }
                      next.push({ fieldKey: formulaNumberFields[0]?.fieldKey ?? "" });
                      commitChildFormulaTerms(next);
                    }}
                  >
                    Add Field
                  </button>
                </div>
              )}
            </div>
            <div className="claims-fb-formGroup">
              <label>Decimal Precision</label>
              <input
                className="form-input"
                type="number"
                min={0}
                max={6}
                value={Number(childConfig.precision ?? 2)}
                onChange={(event) =>
                  patchRepeatableChildConfig(parentIndex, childIndex, {
                    scope: "row",
                    expression: expressionFromFormulaTerms(formulaTerms),
                    precision: Math.min(6, Math.max(0, Number(event.target.value) || 0)),
                  })
                }
              />
            </div>
          </>
        )}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => removeRepeatableChild(parentIndex, childIndex)}
        >
          <Trash2 size={14} />
          Remove Child Field
        </button>
      </div>
    );
  }

  return (
    <div className="claims-form-builder-v2">
      {/* Header */}
      <div className="claims-fb-header">
        <button type="button" className="claims-fb-backBtn" onClick={onBack}>
          <ChevronLeft size={18} />
          Configuration
        </button>
        <div className="claims-fb-headerInfo">
          <h1>Form Builder · {moduleLabel}</h1>
          <p>{claimTypeName} · {fields.length} fields · {dirty ? "Unsaved changes" : "All changes saved"}</p>
        </div>
        <div className="claims-fb-headerActions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            ← Back to Config
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={onSave} 
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      </div>

      {/* Errors */}
      {(error || validationErrors.length > 0) && (
        <div className="claims-fb-errors">
          {error && <p>{error}</p>}
          {validationErrors.map((msg, i) => <p key={i}>{msg}</p>)}
        </div>
      )}

      {/* Stepper */}
      <div className="claims-fb-stepper">
        <div className="claims-fb-step completed">
          <span className="claims-fb-stepNum">1</span>
          <span>Configuration Setup</span>
        </div>
        <div className="claims-fb-step active">
          <span className="claims-fb-stepNum">2</span>
          <span>Form Builder</span>
        </div>
      </div>

      {/* Main Layout */}
      <div className="claims-fb-layout">
        {/* Left Sidebar - Components */}
        <div className="claims-fb-sidebar">
          <h3>Add Fields</h3>
          <p className="claims-fb-sidebarHint">Click to add to form</p>
          <div className="claims-fb-components">
            {fieldComponents.map((comp) => (
              <button
                key={comp.key}
                className="claims-fb-component"
                onClick={() => addField(comp.key)}
                type="button"
              >
                <span className="claims-fb-componentIcon">{comp.icon}</span>
                <span>{comp.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center - Form Preview */}
        <div className="claims-fb-canvas">
          <div className="claims-fb-canvasHeader">
            <h2>{moduleLabel}</h2>
            <p>{showSystemFields ? "Claim Type and its sub-field are auto-added from config" : `${fields.length} configured fields`}</p>
          </div>

          <div className="claims-fb-formPreview">
            {/* Auto fields */}
            {showSystemFields && <div className="claims-fb-field auto">
              <div className="claims-fb-fieldBadge ai">AI</div>
              <div className="claims-fb-fieldBadge config">FROM CONFIG</div>
              <label>
                Claim Type <span className="required">*</span>
              </label>
              <input type="text" placeholder="Select type" disabled />
            </div>}

            {showSystemFields && <div className="claims-fb-field auto">
              <div className="claims-fb-fieldBadge ai">AI</div>
              <div className="claims-fb-fieldBadge conditional">CONDITIONAL</div>
              <label>
                Sub-field (Mode / City / Type) <span className="required">*</span>
              </label>
              <input type="text" placeholder="Appears based on selected claim type" disabled />
            </div>}

            {/* User-added fields */}
            {fields.map((field, index) => (
              <div
	                key={`${field.fieldKey}-${index}`}
	                className={`claims-fb-field ${selectedIndex === index && !selectedChild ? "selected" : ""}`}
	                onClick={() => { setSelectedIndex(index); setSelectedChild(null); setOptionsDraft(null); }}
              >
                <div className="claims-fb-fieldHeader">
                  <div className="claims-fb-fieldBadge type">{`0${index + 1}`}</div>
                  <div className="claims-fb-fieldBadge fieldType">{getFieldTypeLabel(field.type)}</div>
                  {field.required && <div className="claims-fb-fieldBadge required">REQUIRED</div>}
                  <div className="claims-fb-fieldActions">
                    <button
                      type="button"
                      className="claims-fb-iconBtn"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveField(index, -1);
                      }}
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="claims-fb-iconBtn"
                      disabled={index === fields.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        moveField(index, 1);
                      }}
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="claims-fb-iconBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateField(index);
                      }}
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      className="claims-fb-iconBtn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(index);
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <label>
                  {field.label} {field.required && <span className="required">*</span>}
                </label>

                {field.type === "STRING" && (
                  <input type="text" placeholder="Type here..." disabled />
                )}
                {field.type === "NUMBER" && (
                  <input type="number" placeholder="0.00" disabled />
                )}
                {field.type === "DATE" && (
                  <input type="text" placeholder="DD / MM / YYYY" disabled />
                )}
                {field.type === "DROPDOWN" && (
                  <select disabled>
                    <option>Select...</option>
                  </select>
                )}
                {field.type === "SELECT" && (
                  <select disabled>
                    <option>Select...</option>
                  </select>
                )}
                {field.type === "CASCADING_SELECT" && (
                  <select disabled>
                    <option>Select parent value first...</option>
                  </select>
                )}
                {field.type === "IMAGE" && (
                  <div className="claims-fb-upload">
                    <span>📤 Upload</span>
                  </div>
                )}
                {field.type === "FILE" && (
                  <div className="claims-fb-upload">
                    <span>📎 Upload</span>
                  </div>
                )}
                {field.type === "BOOLEAN" && (
                  <label className="claims-fb-booleanPreview">
                    <input type="checkbox" disabled /> Yes
                  </label>
                )}
                {field.type === "API_SELECT" && (
                  <input type="text" placeholder="Select from list..." disabled />
                )}
	                {field.type === "REPEATABLE_GROUP" && (
	                  <div className="claims-fb-repeatPreview">
	                    <div className="claims-fb-repeatMeta">
	                      <span>{childFields(field).length} child fields</span>
	                      <span>{field.view_type === "table" ? "Table rows" : "Stacked rows"}</span>
	                    </div>
	                    <div className="claims-fb-repeatChildren">
	                      {childFields(field).map((child, childIndex) => {
	                        const isSelected =
	                          selectedChild?.parentIndex === index &&
	                          selectedChild.childIndex === childIndex;
	                        return (
	                          <button
	                            key={`preview-child-${childIndex}`}
	                            type="button"
	                            className={`claims-fb-repeatChildCard ${isSelected ? "selected" : ""}`}
	                            onClick={(event) => {
	                              event.stopPropagation();
	                              setSelectedIndex(index);
	                              setSelectedChild({ parentIndex: index, childIndex });
	                              setOptionsDraft(null);
	                            }}
	                          >
	                            <span className="claims-fb-repeatChildIndex">{childIndex + 1}</span>
	                            <span>
	                              <strong>{child.label || `Child ${childIndex + 1}`}</strong>
	                              <small>{child.fieldKey || "fieldKey"} · {getFieldTypeLabel(child.type)}</small>
	                            </span>
	                          </button>
	                        );
	                      })}
	                      {childFields(field).length === 0 && (
	                        <div className="claims-fb-repeatEmpty">No child fields yet</div>
	                      )}
	                    </div>
	                    <div className="claims-fb-repeatAddRow">
	                      {CHILD_FIELD_COMPONENTS.filter((component) => component.key !== "REPEATABLE_GROUP").map((component) => (
	                        <button
	                          key={component.key}
	                          type="button"
	                          onClick={(event) => {
	                            event.stopPropagation();
	                            addRepeatableChild(index, component.key);
	                          }}
	                        >
	                          {component.icon} {component.label}
	                        </button>
	                      ))}
	                    </div>
	                  </div>
	                )}
                {field.type === "FORMULA" && (
                  <input type="text" placeholder="Calculated value" disabled />
                )}
              </div>
            ))}

            {fields.length === 0 && (
              <div className="claims-fb-emptyState">
                <p>No custom fields added yet</p>
                <p className="hint">Click a component from the left sidebar to add fields</p>
              </div>
            )}

	            <button type="button" className="claims-fb-addFieldBtn" onClick={() => { setSelectedIndex(null); setSelectedChild(null); }}>
	              + Add field
	            </button>
          </div>
        </div>

        {/* Right Sidebar - Properties */}
	        <div className="claims-fb-properties">
	          <h3>{selectedChildField ? "Edit child field" : "Select a field"}</h3>
	          {selectedChildField ? (
	            renderSelectedChildProperties()
	          ) : selectedField === null ? (
	            <p className="claims-fb-propertiesHint">
	              Click any field on the canvas to edit its properties here.
	            </p>
          ) : (
            <div className="claims-fb-propertiesForm">
              <div className="claims-fb-formGroup">
                <label>Label</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedField.label}
                  onChange={(e) => updateField(selectedIndex!, { label: e.target.value })}
                />
              </div>

              <div className="claims-fb-formGroup">
                <label>Field Key</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedField.fieldKey}
                  onChange={(e) => updateField(selectedIndex!, { fieldKey: e.target.value })}
                />
              </div>

              <div className="claims-fb-formGroup">
                <label>Field Type</label>
                <select
                  className="form-input"
                  value={selectedField.type}
                  onChange={(e) =>
                    updateField(selectedIndex!, {
                      type: e.target.value as UdfFieldType,
                      config: createField(e.target.value as UdfFieldType, selectedIndex! + 1).config,
                      view_type:
                        e.target.value === "REPEATABLE_GROUP"
                          ? "default"
                          : undefined,
                    })
                  }
                >
                  {fieldComponents.map((comp) => (
                    <option key={comp.key} value={comp.key}>
                      {comp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="claims-fb-toggles">
                <label>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(e) => updateField(selectedIndex!, { required: e.target.checked })}
                  />
                  Required
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedField.status ?? true}
                    onChange={(e) => updateField(selectedIndex!, { status: e.target.checked })}
                  />
                  Active
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedField.summaryKey}
                    onChange={(e) => updateField(selectedIndex!, { summaryKey: e.target.checked })}
                  />
                  Logging
                </label>
              </div>

              {(selectedField.type === "SELECT" || selectedField.type === "DROPDOWN") && (
                <div className="claims-fb-formGroup">
                  <label>Options (one per line)</label>
                  <textarea
                    className="form-input"
                    rows={6}
                    value={optionsDraft !== null ? optionsDraft : optionsText(selectedField)}
                    onChange={(e) => {
                      // Only update local draft — don't parse yet, preserves newlines while typing
                      setOptionsDraft(e.target.value);
                    }}
                    onBlur={(e) => {
                      // Commit to real state only when user leaves the textarea
                      const options = e.target.value
                        .split('\n')
                        .map(v => v.trim())
                        .filter(Boolean);
                      updateFieldConfig(selectedIndex!, { options });
                      setOptionsDraft(null);
                    }}
                    placeholder={`Option 1\nOption 2\nOption 3`}
                    style={{
                      fontFamily: 'monospace',
                      lineHeight: '1.6',
                      resize: 'vertical',
                    }}
                    spellCheck={false}
                  />
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                    Type each option on a new line, then click elsewhere to save.
                  </p>
                </div>
              )}

              {selectedField.type === "API_SELECT" && (
                <>
                  <div className="claims-fb-formGroup">
                    <label>Data Source</label>
                    <select
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.dataSource ||
                        (selectedField.config as Record<string, unknown>)?.sourceKey ||
                        "",
                      )}
                      onChange={(e) =>
                        replaceFieldConfig(selectedIndex!, (current) => {
                          const next: Record<string, unknown> = {
                            ...current,
                            dataSource: e.target.value,
                            sourceKey: e.target.value,
                          };
                          delete next.filters;
                          return next;
                        })
                      }
                    >
                      <option value="">Select source...</option>
                      {sources.map((src) => (
                        <option key={src.key} value={src.key}>
                          {src.label || src.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {renderDatasourceFilterControls({
                    field: selectedField,
                    idPrefix: `${selectedIndex}-api`,
                    availableFields: fields.filter((_, index) => index !== selectedIndex),
                    onModeChange: (mode) => updateDatasourceFilter(selectedIndex!, mode),
                    onParamChange: (key, value) =>
                      updateDatasourceFilterParam(selectedIndex!, key, value),
                  })}
                  <div className="claims-fb-formGroup">
                    <label>Label Field</label>
                    <input
                      type="text"
                      className="form-input"
                      value={
                        String((selectedField.config as Record<string, unknown>)?.labelField || "")
                      }
                      onChange={(e) => updateFieldConfig(selectedIndex!, { labelField: e.target.value })}
                    />
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Value Field</label>
                    <input
                      type="text"
                      className="form-input"
                      value={
                        String((selectedField.config as Record<string, unknown>)?.valueField || "")
                      }
                      onChange={(e) => updateFieldConfig(selectedIndex!, { valueField: e.target.value })}
                    />
                  </div>
                  <div className="claims-fb-toggles">
                    <label>
                      <input
                        type="checkbox"
                        checked={
                          (selectedField.config as Record<string, unknown>)?.multiple === true
                        }
                        onChange={(e) =>
                          updateFieldConfig(selectedIndex!, { multiple: e.target.checked })
                        }
                      />
                      Allow multiple selections
                    </label>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={
                      previewLoading ||
                      !String(
                        (selectedField.config as Record<string, unknown>)?.dataSource ||
                        (selectedField.config as Record<string, unknown>)?.sourceKey ||
                        "",
                      )
                    }
                    onClick={() => void previewApiSource()}
                  >
                    {previewLoading ? "Loading preview..." : "Preview source"}
                  </button>
                  {previewError && <p className="claims-fb-propertiesHint">{previewError}</p>}
                  {sourcePreview.length > 0 && (
                    <pre className="claims-fb-sourcePreview">
                      {JSON.stringify(sourcePreview.slice(0, 5), null, 2)}
                    </pre>
                  )}
                </>
              )}

              {selectedField.type === "CASCADING_SELECT" && (
                <>
                  <div className="claims-fb-formGroup">
                    <label>Parent Field</label>
                    <select
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.dependsOn ?? "",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { dependsOn: e.target.value })
                      }
                    >
                      <option value="">Select parent field...</option>
                      {fields
                        .filter((_, index) => index !== selectedIndex)
                        .map((field) => (
                          <option key={field.fieldKey} value={field.fieldKey}>
                            {field.label} ({field.fieldKey})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Options (parent:value)</label>
                    <textarea
                      className="form-input"
                      rows={6}
                      defaultValue={cascadingOptionsText(selectedField)}
                      onBlur={(e) => {
                        const options = e.target.value
                          .split("\n")
                          .map((line) => {
                            const separator = line.indexOf(":");
                            if (separator < 1) return null;
                            const parentValue = line.slice(0, separator).trim();
                            const value = line.slice(separator + 1).trim();
                            return parentValue && value ? { parentValue, value } : null;
                          })
                          .filter(
                            (option): option is { parentValue: string; value: string } =>
                              Boolean(option),
                          );
                        updateFieldConfig(selectedIndex!, { options });
                      }}
                      placeholder={"India:Delhi\nIndia:Mumbai\nUSA:New York"}
                    />
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Dynamic Source (optional)</label>
                    <select
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.sourceKey ?? "",
                      )}
                      onChange={(e) =>
                        replaceFieldConfig(selectedIndex!, (current) => {
                          const next: Record<string, unknown> = { ...current, sourceKey: e.target.value };
                          delete next.filters;
                          return next;
                        })
                      }
                    >
                      <option value="">Use static options</option>
                      {sources.map((source) => (
                        <option key={source.key} value={source.key}>{source.label || source.name}</option>
                      ))}
                    </select>
                  </div>
                  {renderDatasourceFilterControls({
                    field: selectedField,
                    idPrefix: `${selectedIndex}-cascade`,
                    availableFields: fields.filter((_, index) => index !== selectedIndex),
                    onModeChange: (mode) => updateDatasourceFilter(selectedIndex!, mode),
                    onParamChange: (key, value) =>
                      updateDatasourceFilterParam(selectedIndex!, key, value),
                  })}
                  <div className="claims-fb-formGroup">
                    <label>Dynamic Value Field</label>
                    <input
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.valueField ?? "",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { valueField: e.target.value })
                      }
                    />
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Dynamic Parent Field</label>
                    <input
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.parentField ?? "",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { parentField: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              {selectedField.type === "IMAGE" && (
                <>
                  <div className="claims-fb-formGroup">
                    <label>Image Source</label>
                    <select
                      className="form-input"
                      value={String(
                        (selectedField.config as Record<string, unknown>)?.source ?? "Both",
                      )}
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, { source: e.target.value })
                      }
                    >
                      <option value="Camera">Camera</option>
                      <option value="Gallery">Gallery</option>
                      <option value="Both">Camera or Gallery</option>
                    </select>
                  </div>
                  <MediaSettings
                    field={selectedField}
                    onChange={(patch) => updateFieldConfig(selectedIndex!, patch)}
                  />
                </>
              )}

              {selectedField.type === "FILE" && (
                <>
                  <MediaSettings
                    field={selectedField}
                    onChange={(patch) => updateFieldConfig(selectedIndex!, patch)}
                  />
                  <div className="claims-fb-formGroup">
                    <label>Accepted MIME Types</label>
                    <input
                      className="form-input"
                      placeholder="application/pdf, image/*"
                      value={
                        Array.isArray(
                          (selectedField.config as Record<string, unknown>)?.accept,
                        )
                          ? (
                              (selectedField.config as Record<string, unknown>)
                                .accept as unknown[]
                            ).join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        updateFieldConfig(selectedIndex!, {
                          accept: e.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                </>
              )}

              {selectedField.type === "REPEATABLE_GROUP" && enableAdvancedSalesFields && (
                <>
                  <div className="claims-fb-formGroup">
                    <label>Mobile Rendering</label>
                    <select
                      className="form-input"
                      value={selectedField.view_type ?? "default"}
                      onChange={(event) =>
                        updateField(selectedIndex!, {
                          view_type: event.target.value as "default" | "table",
                        })
                      }
                    >
                      <option value="default">Stacked rows</option>
                      <option value="table">Compact table</option>
                    </select>
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Minimum Rows</label>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      value={Number(configRecord(selectedField).minRows ?? 0)}
                      onChange={(event) =>
                        updateFieldConfig(selectedIndex!, {
                          minRows: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                    />
                  </div>
                  <div className="claims-fb-formGroup">
                    <label>Maximum Rows</label>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      value={Number(configRecord(selectedField).maxRows ?? 10)}
                      onChange={(event) =>
                        updateFieldConfig(selectedIndex!, {
                          maxRows: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                  </div>

	                  <p className="claims-fb-propertiesHint">
	                    Add and select child fields directly inside the repeatable group card in the preview.
	                  </p>
                </>
              )}

              {selectedField.type === "FORMULA" && enableAdvancedSalesFields && (
                <>
                  <div className="claims-fb-formGroup">
                    <label>Formula Scope</label>
                    <select
                      className="form-input"
                      value={String(configRecord(selectedField).scope ?? "row")}
                      onChange={(event) =>
                        updateFieldConfig(selectedIndex!, {
                          scope: event.target.value,
                          ...(event.target.value === "row"
                            ? { expression: [], source: undefined, operation: undefined }
                            : { expression: undefined, operation: "SUM", source: {} }),
                        })
                      }
                    >
                      <option value="row">Row formula</option>
                      <option value="aggregate">Aggregate formula</option>
                    </select>
                  </div>

                  {String(configRecord(selectedField).scope ?? "row") === "row" ? (
                    <div className="claims-fb-formGroup">
                      <label>Expression Tokens</label>
                      <textarea
                        className="form-input"
                        rows={7}
                        value={expressionText(selectedField)}
                        placeholder={"field:grossAmount\noperator:SUBTRACT\nfield:discount"}
                        onChange={(event) =>
                          updateFieldConfig(selectedIndex!, {
                            expression: parseExpression(event.target.value),
                          })
                        }
                      />
                      <p className="hint">Use one token per line: field:key, constant:100, operator:ADD, paren:OPEN.</p>
                    </div>
                  ) : (
                    <>
                      <div className="claims-fb-formGroup">
                        <label>Aggregate Operation</label>
                        <select
                          className="form-input"
                          value={String(configRecord(selectedField).operation ?? "SUM")}
                          onChange={(event) =>
                            updateFieldConfig(selectedIndex!, { operation: event.target.value })
                          }
                        >
                          <option value="SUM">SUM</option>
                          <option value="AVG">AVG</option>
                          <option value="MIN">MIN</option>
                          <option value="MAX">MAX</option>
                          <option value="COUNT">COUNT</option>
                        </select>
                      </div>
                      <div className="claims-fb-formGroup">
                        <label>Repeatable Group</label>
                        <select
                          className="form-input"
                          value={String((configRecord(selectedField).source as Record<string, unknown> | undefined)?.groupFieldKey ?? "")}
                          onChange={(event) =>
                            updateFieldConfig(selectedIndex!, {
                              source: {
                                groupFieldKey: event.target.value,
                                fieldKey: "",
                              },
                            })
                          }
                        >
                          <option value="">Select group...</option>
                          {fields
                            .filter((field) => field.type === "REPEATABLE_GROUP" && field.status !== false)
                            .map((field) => (
                              <option key={field.fieldKey} value={field.fieldKey}>
                                {field.label} ({field.fieldKey})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="claims-fb-formGroup">
                        <label>Source Field</label>
                        <select
                          className="form-input"
                          value={String((configRecord(selectedField).source as Record<string, unknown> | undefined)?.fieldKey ?? "")}
                          onChange={(event) => {
                            const currentSource = configRecord(selectedField).source as Record<string, unknown> | undefined;
                            updateFieldConfig(selectedIndex!, {
                              source: {
                                groupFieldKey: String(currentSource?.groupFieldKey ?? ""),
                                fieldKey: event.target.value,
                              },
                            });
                          }}
                        >
                          <option value="">Select numeric field...</option>
                          {numericChildFields(
                            fields.find(
                              (field) =>
                                field.fieldKey ===
                                String((configRecord(selectedField).source as Record<string, unknown> | undefined)?.groupFieldKey ?? ""),
                            ),
                          ).map((field) => (
                            <option key={field.fieldKey} value={field.fieldKey}>
                              {field.label} ({field.fieldKey})
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="claims-fb-formGroup">
                    <label>Decimal Precision</label>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      max={6}
                      value={Number(configRecord(selectedField).precision ?? 2)}
                      onChange={(event) =>
                        updateFieldConfig(selectedIndex!, {
                          precision: Math.min(6, Math.max(0, Number(event.target.value) || 0)),
                        })
                      }
                    />
                  </div>
                </>
              )}

              <div className="claims-fb-formGroup">
                <label>Conditional Visibility (optional)</label>
                <select
                  className="form-input"
                  value={selectedField.visibilityRules?.[0]?.dependsOnField ?? ""}
                  onChange={(event) => {
                    const dependsOnField = event.target.value;
                    updateField(selectedIndex!, {
                      visibilityRules: dependsOnField
                        ? [{
                            dependsOnField,
                            showWhen: selectedField.visibilityRules?.[0]?.showWhen ?? [],
                          }]
                        : undefined,
                    });
                  }}
                >
                  <option value="">Always visible</option>
                  {fields
                    .filter((_, index) => index !== selectedIndex)
                    .map((field) => (
                      <option key={field.fieldKey} value={field.fieldKey}>
                        Show based on {field.label}
                      </option>
                    ))}
                </select>
              </div>
              {selectedField.visibilityRules?.[0]?.dependsOnField && (
                <div className="claims-fb-formGroup">
                  <label>Show When Values</label>
                  <input
                    className="form-input"
                    placeholder="Approved, Pending"
                    value={selectedField.visibilityRules[0].showWhen.join(", ")}
                    onChange={(event) =>
                      updateField(selectedIndex!, {
                        visibilityRules: [{
                          dependsOnField:
                            selectedField.visibilityRules![0].dependsOnField,
                          showWhen: event.target.value
                            .split(",")
                            .map((value) => value.trim())
                            .filter(Boolean),
                        }],
                      })
                    }
                  />
                </div>
              )}

              <div className="claims-fb-formGroup">
                <label>All Types</label>
                <p className="hint">Available field types for this claim form</p>
                <div className="claims-fb-allTypes">
                  {fieldComponents.map((comp) => (
                    <span key={comp.key} className="claims-fb-typeChip">
                      {comp.icon} {comp.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
