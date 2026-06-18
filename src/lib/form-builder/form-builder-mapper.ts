/**
 * Mapper functions to convert between API types (UdfField, ApiFormConfig)
 * and frontend types (FormField, FormConfiguration).
 *
 * Key differences from old implementation:
 * - Backend uses `fieldKey` (not `fieldId`)
 * - Backend uses UPPER_SNAKE_CASE `type` string (not `componentType`)
 * - Backend stores all config in a single `config` object (not flat properties)
 * - Backend `required` is a boolean; frontend uses "no" | "always" | "conditional"
 * - Config and fields are fetched separately; this mapper combines them
 */

import type { ApiFormConfig, ApiUdfField, UpdateFieldPayload } from "./form-builder-api";
import type {
  ComponentType,
  EditWindow,
  FormConfiguration,
  FormField,
} from "./types";

// ─── Component Type to UDF Type Mapping (for save-schema) ─────────────────

const COMPONENT_TO_UDF_TYPE: Record<string, string> = {
  "short-text": "STRING",
  "paragraph": "STRING",
  "alphanumeric": "STRING",
  "number": "NUMBER",
  "dropdown": "DROPDOWN",
  "multi-select": "SELECT",
  "radio": "DROPDOWN",
  "checkbox": "SELECT",
  "toggle": "BOOLEAN",
  "image-capture": "IMAGE",
  "date-picker": "DATE",
  "time-range": "STRING",
  "gps-location": "STRING",
  "geo-fencing": "STRING",
  "signature": "IMAGE",
  "rating": "NUMBER",
  "email": "STRING",
  "phone": "STRING",
  "barcode-qr": "STRING",
  "calculation": "NUMBER",
  "dependent-dropdown": "CASCADING_SELECT",
  "list-view": "API_SELECT",
  "file-upload": "FILE",
  "conditional-logic": "STRING",
  "section-group": "STRING",
  "add-more-block": "STRING",
  "divider": "STRING",
  "info-label": "STRING",
};

// ─── Component Type Mapping ───────────────────────────────────────────────

const API_TYPE_TO_FRONTEND: Record<string, ComponentType> = {
  SHORT_TEXT: "short-text",
  PARAGRAPH: "paragraph",
  ALPHANUMERIC: "alphanumeric",
  NUMBER: "number",
  DROPDOWN: "dropdown",
  MULTI_SELECT: "multi-select",
  RADIO: "radio",
  CHECKBOX: "checkbox",
  TOGGLE: "toggle",
  IMAGE_CAPTURE: "image-capture",
  DATE_PICKER: "date-picker",
  TIME_RANGE: "time-range",
  GPS_LOCATION: "gps-location",
  GEO_FENCING: "geo-fencing",
  SIGNATURE: "signature",
  RATING: "rating",
  EMAIL: "email",
  PHONE: "phone",
  BARCODE_QR: "barcode-qr",
  CALCULATION: "calculation",
  DEPENDENT_DROPDOWN: "dependent-dropdown",
  LIST_VIEW: "list-view",
  FILE_UPLOAD: "file-upload",
  CONDITIONAL_LOGIC: "conditional-logic",
  SECTION_GROUP: "section-group",
  ADD_MORE_BLOCK: "add-more-block",
  DIVIDER: "divider",
  INFO_LABEL: "info-label",
};

const FRONTEND_TO_API_TYPE: Record<ComponentType, string> = Object.fromEntries(
  Object.entries(API_TYPE_TO_FRONTEND).map(([api, fe]) => [fe, api])
) as Record<ComponentType, string>;

export function mapFieldsToSaveSchemaPayload(fields: FormField[]): any[] {
  return fields.map((field, index) => {
    const componentType = frontendComponentTypeToApi(field.type);
    const udfType = COMPONENT_TO_UDF_TYPE[field.type] ?? "STRING";

    const config: Record<string, any> = {
      componentType,
      visibilityMode: field.visibility,
      isReadOnly: field.readOnly,
    };

    if (field.helpText) config.helpText = field.helpText;
    if (field.toggleOnLabel && field.toggleOnLabel !== "Yes") config.onLabel = field.toggleOnLabel;
    if (field.toggleOffLabel && field.toggleOffLabel !== "No") config.offLabel = field.toggleOffLabel;
    if (field.parentId) config.parentFieldId = field.parentId;

    // Validation
    if (field.required !== "no" || Object.keys(field.typeConfig).length > 0) {
      config.validation = { ...field.typeConfig };
      config.validation.requiredMode = field.required === "no" ? "never" : field.required;
    }

    // Visibility rules
    if (field.visibility === "conditional" && field.visibilityRules.length > 0) {
      config.visibilityRules = field.visibilityRules.map(rule => ({
        dependsOnFieldId: rule.sourceFieldId,
        operator: rule.operator,
        value: rule.value,
      }));
    }

    // Options
    if (field.optionsSource) {
      config.options = field.manualOptions;
    }

    // Pre-fill
    if (field.prefillSource) {
      config.preFill = {
        sourceType: field.prefillSource,
        sourceField: field.prefillField,
      };
    }

    // Section/AddMore specific
    if (field.type === "section-group") config.sectionLabel = field.sectionLabel;
    if (field.type === "add-more-block") {
      config.buttonLabel = field.addMoreLabel;
      config.minEntries = field.addMoreMin;
      config.maxEntries = field.addMoreMax;
    }

    // Image-specific config (IMAGE_CAPTURE, SIGNATURE)
    if (field.type === "image-capture") {
      const captureMode = field.typeConfig.captureMode ?? "camera";
      config.source = captureMode === "live" ? "Camera" : captureMode === "gallery" ? "Gallery" : "Both";
      config.multiple = (field.typeConfig.maxPhotos ?? 1) > 1;
      config.maxCount = field.typeConfig.maxPhotos ?? 5;
    }
    if (field.type === "signature") {
      config.source = "Camera";
      config.multiple = false;
      config.maxCount = 1;
    }

    return {
      fieldKey: field.id,
      label: field.label,
      type: udfType,
      config,
      required: field.required === "always",
      order: index,
      status: true,
    };
  });
}

export function apiComponentTypeToFrontend(apiType: string): ComponentType {
  const result = API_TYPE_TO_FRONTEND[apiType];
  if (result) return result;
  // Fallback: convert UPPER_SNAKE_CASE to kebab-case
  return apiType.toLowerCase().replace(/_/g, "-") as ComponentType;
}

export function frontendComponentTypeToApi(type: ComponentType): string {
  const result = FRONTEND_TO_API_TYPE[type];
  if (result) return result;
  // Fallback: convert kebab-case to UPPER_SNAKE_CASE
  return type.toUpperCase().replace(/-/g, "_");
}

// ─── Edit Window Mapping ──────────────────────────────────────────────────

const API_TO_FRONTEND_EDIT_WINDOW: Record<string, EditWindow> = {
  until_checkout: "until-checkout",
  custom_hours: "custom-hours",
  manager_approval: "manager-approval",
};

const FRONTEND_TO_API_EDIT_WINDOW: Record<EditWindow, string> = {
  "until-checkout": "until_checkout",
  "custom-hours": "custom_hours",
  "manager-approval": "manager_approval",
};

function apiEditWindowToFrontend(apiWindow?: string): EditWindow {
  if (!apiWindow) return "custom-hours";
  return API_TO_FRONTEND_EDIT_WINDOW[apiWindow] ?? "custom-hours";
}

function frontendEditWindowToApi(window: EditWindow): string {
  return FRONTEND_TO_API_EDIT_WINDOW[window] ?? "custom_hours";
}

// ─── UdfField → FormField ─────────────────────────────────────────────────

/**
 * Maps a backend UdfField to frontend FormField.
 * The backend `config` object is unpacked into the frontend's flat structure.
 */
export function mapUdfFieldToFrontend(udf: ApiUdfField): FormField {
  const cfg = udf.config ?? {};

  // Determine required mode from boolean + config
  let required: "no" | "always" | "conditional" = "no";
  if (udf.required) {
    required = cfg.validation?.conditionalRequired ? "conditional" : "always";
  }

  // Map visibility rules from backend format to frontend format
  const visibilityRules = (udf.visibilityRules ?? []).map((rule) => ({
    id: crypto.randomUUID(),
    sourceFieldId: rule.dependsOnField,
    operator: "equals" as const,
    value: Array.isArray(rule.showWhen) ? rule.showWhen[0]?.toString() ?? "" : "",
  }));

  const visibility: "always" | "conditional" =
    cfg.visibilityMode === "conditional" || (udf.visibilityRules && udf.visibilityRules.length > 0)
      ? "conditional"
      : "always";

  // Use config.componentType (the original form builder type like TOGGLE, IMAGE_CAPTURE)
  // rather than udf.type (generic UDF type like STRING, BOOLEAN, NUMBER)
  const componentType = cfg.componentType ?? udf.type;

  return {
    id: udf.fieldKey,
    type: apiComponentTypeToFrontend(componentType),
    label: udf.label,
    helpText: cfg.helpText ?? "",
    parentId: cfg.parentFieldId ?? null,
    order: udf.order,

    // Visibility
    visibility,
    visibilityRules,

    // Read-only & prefill
    readOnly: cfg.isReadOnly ?? false,
    prefillSource: cfg.preFill?.sourceType ?? null,
    prefillField: cfg.preFill?.sourceField ?? "",
    prefillCustomValue: cfg.preFill?.customValue ?? "",

    // Validation
    required,
    requiredRules: (cfg.validation?.requiredRules ?? []).map((r: any) => ({
      id: r.id ?? crypto.randomUUID(),
      sourceFieldId: r.sourceFieldId ?? r.dependsOnFieldId ?? "",
      operator: r.operator ?? "equals",
      value: r.value ?? "",
    })),
    typeConfig: cfg.validation?.typeConfig ?? cfg.validation ?? {},

    // Options
    optionsSource: Array.isArray(cfg.options) ? "manual" : (cfg.options?.source ?? null),
    manualOptions: Array.isArray(cfg.options) ? cfg.options : (cfg.values ?? cfg.options?.manualOptions ?? []),
    excelOptionsCount: Array.isArray(cfg.options) ? 0 : (cfg.options?.excelOptionsCount ?? 0),
    masterEntity: Array.isArray(cfg.options) ? "" : (cfg.options?.masterEntity ?? ""),
    masterField: Array.isArray(cfg.options) ? "" : (cfg.options?.masterField ?? ""),
    mappingParentField: Array.isArray(cfg.options) ? "" : (cfg.options?.mappingParentField ?? ""),

    // Data source
    dataSource: cfg.dataSource ?? null,

    // Formula
    formula: cfg.formula?.expression ?? "",
    formulaResultFormat: cfg.formula?.resultFormat ?? "number",

    // Layout
    sectionLabel: cfg.sectionLabel ?? "",
    addMoreLabel: cfg.buttonLabel ?? "",
    addMoreMin: cfg.minEntries ?? 1,
    addMoreMax: cfg.maxEntries ?? 5,

    // Toggle
    toggleOnLabel: cfg.onLabel ?? "Yes",
    toggleOffLabel: cfg.offLabel ?? "No",

    // Conditional logic
    conditionAction: cfg.conditionGroups?.[0]?.action ?? "show",
    conditionRules: (cfg.conditionGroups ?? []).flatMap((group: any) =>
      (group.conditions ?? []).map((c: any) => ({
        id: c.id ?? crypto.randomUUID(),
        sourceFieldId: c.sourceFieldId ?? c.dependsOnFieldId ?? "",
        operator: c.operator ?? "equals",
        value: c.value ?? "",
      }))
    ),
  };
}

// ─── FormField changes → UpdateFieldPayload ───────────────────────────────

/**
 * Maps partial frontend FormField changes to the API UpdateFieldPayload.
 * Only includes fields that are actually changing.
 */
export function mapFrontendFieldToUpdatePayload(changes: Partial<FormField>): UpdateFieldPayload {
  const payload: UpdateFieldPayload = {};

  if (changes.label !== undefined) payload.label = changes.label;
  if (changes.helpText !== undefined) payload.helpText = changes.helpText;

  // Toggle labels
  if (changes.toggleOnLabel !== undefined) payload.onLabel = changes.toggleOnLabel;
  if (changes.toggleOffLabel !== undefined) payload.offLabel = changes.toggleOffLabel;

  // Visibility
  if (changes.visibility !== undefined) payload.visibilityMode = changes.visibility;
  if (changes.visibilityRules !== undefined) {
    payload.visibilityRules = changes.visibilityRules.map((rule) => ({
      dependsOnFieldId: rule.sourceFieldId,
      operator: rule.operator,
      value: rule.value,
    }));
  }

  // Prefill
  if (changes.prefillSource !== undefined || changes.prefillField !== undefined) {
    if (changes.prefillSource === null) {
      payload.preFill = null;
    } else {
      payload.preFill = {
        sourceType: changes.prefillSource ?? "system",
        sourceField: changes.prefillField ?? "",
      };
    }
  }

  // Read-only
  if (changes.readOnly !== undefined) payload.isReadOnly = changes.readOnly;

  // Validation
  if (
    changes.required !== undefined ||
    changes.requiredRules !== undefined ||
    changes.typeConfig !== undefined
  ) {
    const validation: Record<string, any> = {};
    if (changes.required !== undefined) {
      validation.requiredMode = changes.required === "no" ? "never" : changes.required;
    }
    if (changes.requiredRules !== undefined) {
      validation.requiredRules = changes.requiredRules;
    }
    if (changes.typeConfig !== undefined) {
      validation.typeConfig = changes.typeConfig;
    }
    payload.validation = validation;
  }

  // Options
  if (
    changes.optionsSource !== undefined ||
    changes.manualOptions !== undefined ||
    changes.masterEntity !== undefined ||
    changes.masterField !== undefined ||
    changes.mappingParentField !== undefined
  ) {
    if (changes.manualOptions !== undefined) {
      payload.options = changes.manualOptions;
    }
  }

  // Data source
  if (changes.dataSource !== undefined) {
    payload.dataSource = changes.dataSource ?? undefined;
  }

  // Formula
  if (changes.formula !== undefined || changes.formulaResultFormat !== undefined) {
    const formula: Record<string, any> = {};
    if (changes.formula !== undefined) formula.expression = changes.formula;
    if (changes.formulaResultFormat !== undefined) formula.resultFormat = changes.formulaResultFormat;
    payload.formula = formula;
  }

  // Conditional logic
  if (changes.conditionAction !== undefined || changes.conditionRules !== undefined) {
    const conditionGroups: Record<string, any>[] = [];
    if (changes.conditionRules && changes.conditionRules.length > 0) {
      conditionGroups.push({
        action: changes.conditionAction ?? "show",
        conditions: changes.conditionRules.map((rule) => ({
          id: rule.id,
          sourceFieldId: rule.sourceFieldId,
          operator: rule.operator,
          value: rule.value,
        })),
      });
    }
    payload.conditionGroups = conditionGroups;
  }

  // Add More Block
  if (changes.addMoreLabel !== undefined) payload.buttonLabel = changes.addMoreLabel;
  if (changes.addMoreMin !== undefined) payload.minEntries = changes.addMoreMin;
  if (changes.addMoreMax !== undefined) payload.maxEntries = changes.addMoreMax;

  return payload;
}

// ─── ApiFormConfig + UdfField[] → FormConfiguration ───────────────────────

/**
 * Combines a config (without fields) and a separate fields array
 * into the frontend's unified FormConfiguration.
 */
export function mapApiConfigToFrontend(
  apiConfig: ApiFormConfig,
  fields: ApiUdfField[]
): FormConfiguration {
  return {
    id: apiConfig._id,
    name: apiConfig.name,
    designations: apiConfig.applicableDesignations ?? [],
    editPermission: apiConfig.editPermission,
    editWindow: apiEditWindowToFrontend(apiConfig.editWindow),
    editWindowHours: apiConfig.editWindowHours ?? 24,
    fields: fields.map(mapUdfFieldToFrontend),
    status: apiConfig.status === "archived" ? "draft" : apiConfig.status,
    createdAt: apiConfig.createdAt,
    updatedAt: apiConfig.updatedAt,
  };
}

/**
 * Maps config-only data to a FormConfiguration with empty fields.
 * Used for list views where fields aren't fetched.
 */
export function mapApiConfigToFrontendListItem(apiConfig: ApiFormConfig): FormConfiguration {
  return mapApiConfigToFrontend(apiConfig, []);
}

// ─── Settings Payload Builder ─────────────────────────────────────────────

export function mapSettingsToApiPayload(
  data: Partial<FormConfiguration>
): Record<string, any> {
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.designations !== undefined) payload.applicableDesignations = data.designations;
  if (data.editPermission !== undefined) payload.editPermission = data.editPermission;
  if (data.editWindow !== undefined) payload.editWindow = frontendEditWindowToApi(data.editWindow);
  if (data.editWindowHours !== undefined) payload.editWindowHours = data.editWindowHours;

  return payload;
}

// ─── Draft Payload Builder ────────────────────────────────────────────────

export function mapConfigToDraftPayload(
  data: Partial<FormConfiguration>
): Record<string, any> {
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.designations !== undefined) payload.applicableDesignations = data.designations;
  if (data.editPermission !== undefined) payload.editPermission = data.editPermission;
  if (data.editWindow !== undefined) payload.editWindow = frontendEditWindowToApi(data.editWindow);
  if (data.editWindowHours !== undefined) payload.editWindowHours = data.editWindowHours;

  return payload;
}
