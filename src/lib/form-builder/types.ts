// ─── Component Type Definitions ───────────────────────────────────────────

export type ComponentCategory = "core" | "advanced" | "layout";

export type CoreComponentType =
  | "short-text"
  | "paragraph"
  | "alphanumeric"
  | "number"
  | "dropdown"
  | "multi-select"
  | "radio"
  | "checkbox"
  | "toggle"
  | "image-capture"
  | "date-picker"
  | "time-range"
  | "gps-location"
  | "geo-fencing"
  | "signature"
  | "rating"
  | "email"
  | "phone";

export type AdvancedComponentType =
  | "barcode-qr"
  | "calculation"
  | "dependent-dropdown"
  | "list-view"
  | "file-upload"
  | "conditional-logic";

export type LayoutComponentType =
  | "section-group"
  | "add-more-block"
  | "divider"
  | "info-label";

export type ComponentType =
  | CoreComponentType
  | AdvancedComponentType
  | LayoutComponentType;

// ─── Component Catalog Entry ──────────────────────────────────────────────

export interface ComponentDefinition {
  type: ComponentType;
  category: ComponentCategory;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  accent: string; // Color for type badge (teal, pink, blue, purple, amber, green, gray)
  supportsOptions: boolean;
  supportsChildren: boolean; // Section Group, Add More Block
  supportsFormula: boolean;
  supportsDataSource: boolean;
  supportsPrefill: boolean;
}


// ─── Rules & Conditions ───────────────────────────────────────────────────

export type ComparisonOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "is_empty"
  | "is_not_empty";

export interface ConditionRule {
  id: string;
  sourceFieldId: string;
  operator: ComparisonOperator;
  value: string;
}

export type VisibilityRule = ConditionRule;

// ─── Pre-fill ─────────────────────────────────────────────────────────────

export type PrefillSource =
  | "user-profile"
  | "store-mapping"
  | "product-master"
  | "system"
  | "custom";

// ─── Options Source ───────────────────────────────────────────────────────

export type OptionsSourceType = "manual" | "excel" | "from-master" | "from-mapping";

// ─── Data Source ──────────────────────────────────────────────────────────

export interface DataSourceConfig {
  source: "product-master" | "store-master" | "custom";
  customName: string;
  chainLevels: string[]; // For dependent dropdown
  filterColumns: string[]; // For list view
  readOnlyColumns: string[]; // For list view
  editableColumns: EditableColumn[]; // For list view
}

export interface EditableColumn {
  name: string;
  type: "text" | "number" | "dropdown" | "alphanumeric" | "date";
  required: boolean;
  min?: number;
  max?: number;
  options?: string[];
}

// ─── Type-Specific Config ─────────────────────────────────────────────────

export interface TypeSpecificConfig {
  // Number
  minValue?: number;
  maxValue?: number;
  decimals?: number;

  // Text (short text, paragraph, alphanumeric)
  minLength?: number;
  maxLength?: number;

  // Image Capture
  captureMode?: "live" | "gallery" | "both";
  minPhotos?: number;
  maxPhotos?: number;
  watermark?: boolean;

  // Date Picker
  defaultToday?: boolean;
  allowPast?: boolean;
  maxBackdateDays?: number;
  allowFuture?: boolean;
  maxFutureDays?: number;

  // Time Range
  timeFormat?: "12h" | "24h";

  // Geo-fencing
  radiusMeters?: number;
  latLongSource?: "store-master" | "user-master";

  // Rating
  maxStars?: number;

  // Barcode
  codeType?: "barcode" | "qr" | "any";
  validateAgainstMaster?: boolean;

  // File Upload
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxFileCount?: number;
}


// ─── Field Instance on Canvas ─────────────────────────────────────────────

export interface FormField {
  id: string; // Unique UUID
  type: ComponentType;
  label: string;
  helpText: string;
  parentId: string | null; // null = top-level, otherwise section/addMore id
  order: number; // Position within parent context

  // Visibility
  visibility: "always" | "conditional";
  visibilityRules: VisibilityRule[];

  // Pre-fill & Read-only
  readOnly: boolean;
  prefillSource: PrefillSource | null;
  prefillField: string;
  prefillCustomValue: string;

  // Validation
  required: "no" | "always" | "conditional";
  requiredRules: ConditionRule[];
  typeConfig: TypeSpecificConfig;

  // Options (for dropdown, multi-select, radio, checkbox)
  optionsSource: OptionsSourceType | null;
  manualOptions: string[];
  excelOptionsCount: number;
  masterEntity: string;
  masterField: string;
  mappingParentField: string;

  // Data Source (dependent dropdown, list view)
  dataSource: DataSourceConfig | null;

  // Formula (calculation)
  formula: string;
  formulaResultFormat: "number" | "currency" | "percentage";

  // Layout-specific
  sectionLabel: string; // Section Group header
  addMoreLabel: string; // Add More button label
  addMoreMin: number;
  addMoreMax: number;

  // Toggle-specific
  toggleOnLabel: string;
  toggleOffLabel: string;

  // Conditional Logic
  conditionAction: "show" | "hide";
  conditionRules: ConditionRule[];
}

// ─── Form Configuration ───────────────────────────────────────────────────

export type EditPermission = "editable" | "locked";
export type EditWindow = "until-checkout" | "custom-hours" | "manager-approval";

export interface FormConfiguration {
  id: string;
  name: string;
  designations: string[];
  editPermission: EditPermission;
  editWindow: EditWindow;
  editWindowHours: number;
  fields: FormField[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
}

// ─── Form Builder State ───────────────────────────────────────────────────

export interface DragState {
  type: "palette" | "reorder";
  componentType?: ComponentType;
  fieldId?: string;
  overDropZoneId: string | null;
}

export interface FormBuilderState {
  configurations: FormConfiguration[];
  activeConfigId: string | null;
  selectedFieldId: string | null;
  dragState: DragState | null;
  undoStack: FormField[][]; // Past states (max 30)
  redoStack: FormField[][]; // Future states
  draftStatus: "saved" | "saving" | "error" | "idle";
  lastSavedAt: string | null;
}

// ─── Form Builder Actions ─────────────────────────────────────────────────

export type FormBuilderAction =
  | { type: "ADD_FIELD"; componentType: ComponentType; atIndex?: number; parentId?: string }
  | { type: "ADD_API_FIELD"; field: FormField }
  | { type: "DELETE_FIELD"; fieldId: string }
  | { type: "DUPLICATE_FIELD"; fieldId: string }
  | { type: "MOVE_FIELD"; fieldId: string; toIndex: number; toParentId: string | null }
  | { type: "UPDATE_FIELD"; fieldId: string; changes: Partial<FormField> }
  | { type: "SELECT_FIELD"; fieldId: string | null }
  | { type: "SET_DRAG_STATE"; dragState: DragState | null }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOAD_CONFIG"; config: FormConfiguration }
  | { type: "SET_DRAFT_STATUS"; status: "saved" | "saving" | "error" | "idle" };
