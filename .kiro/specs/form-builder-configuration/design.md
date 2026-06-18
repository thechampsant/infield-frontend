# Technical Design Document

## Introduction

This document defines the technical architecture for the Form Builder Configuration Suite. The feature adds two pages to the existing project admin area: a Form Configurations List page and a Form Builder Workspace with three-panel layout. The implementation uses mock data initially, with API integration planned as a follow-up phase.

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **UI**: React 19, TypeScript, Tailwind CSS 4
- **Icons**: Lucide React
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable (lightweight, accessible, React-first)
- **State**: React Context + useReducer for form builder state, with useImperativeHandle for undo/redo
- **Storage**: localStorage for auto-draft persistence

### File Organization
```
src/
├── app/project-admin/[accountCode]/[projectCode]/
│   └── form-builder/
│       ├── page.tsx                          # Configurations List Page
│       └── [configId]/
│           └── page.tsx                      # Workspace Page
├── components/project-admin/form-builder/
│   ├── configurations/
│   │   ├── form-config-list-page.tsx         # List page component
│   │   ├── form-config-card.tsx              # Individual config card
│   │   └── config-settings-modal.tsx         # Settings modal
│   ├── workspace/
│   │   ├── form-builder-workspace.tsx        # Three-panel layout
│   │   ├── workspace-header.tsx              # Header with nav + actions
│   │   └── workspace-footer.tsx             # Bottom bar (draft status + publish)
│   ├── palette/
│   │   ├── component-palette.tsx             # Left panel container
│   │   ├── palette-group.tsx                 # Group (Core/Advanced/Layout)
│   │   └── palette-tile.tsx                  # Draggable component tile
│   ├── canvas/
│   │   ├── form-canvas.tsx                   # Center panel container
│   │   ├── field-card.tsx                    # Field card on canvas
│   │   ├── drop-zone.tsx                     # Drop zone indicator
│   │   ├── section-group-container.tsx       # Section group wrapper
│   │   └── add-more-block-container.tsx      # Add more block wrapper
│   └── inspector/
│       ├── field-inspector.tsx               # Right panel container
│       ├── inspector-empty-state.tsx         # "Select a field" state
│       ├── groups/
│       │   ├── field-group.tsx               # Label + help text
│       │   ├── visibility-group.tsx          # Visibility rules
│       │   ├── prefill-group.tsx             # Pre-fill & read-only
│       │   ├── validation-group.tsx          # Required + type-specific
│       │   ├── options-group.tsx             # Options source config
│       │   ├── data-source-group.tsx         # Data source for DD/ListView
│       │   ├── formula-group.tsx             # Calculation formula builder
│       │   └── actions-group.tsx             # Duplicate + Delete actions
│       └── shared/
│           ├── condition-builder.tsx         # Reusable rule builder
│           └── smart-value-pill.tsx          # Value pill display
├── lib/form-builder/
│   ├── types.ts                             # All TypeScript types
│   ├── constants.ts                         # Component catalog (28+ types)
│   ├── form-builder-context.tsx             # React Context + reducer
│   ├── form-builder-reducer.ts             # State reducer (actions)
│   ├── undo-redo.ts                         # Undo/redo stack logic
│   ├── draft-storage.ts                     # localStorage draft persistence
│   ├── publish-validation.ts               # Publish validation logic
│   └── mock-data.ts                         # Mock form configurations
```

## Data Models

### Core Types (`lib/form-builder/types.ts`)

```typescript
// ─── Component Type Definitions ───────────────────────────────────────────

export type ComponentCategory = "core" | "advanced" | "layout";

export type CoreComponentType =
  | "short-text" | "paragraph" | "alphanumeric" | "number"
  | "dropdown" | "multi-select" | "radio" | "checkbox"
  | "toggle" | "image-capture" | "date-picker" | "time-range"
  | "gps-location" | "geo-fencing" | "signature" | "rating"
  | "email" | "phone";

export type AdvancedComponentType =
  | "barcode-qr" | "calculation" | "dependent-dropdown"
  | "list-view" | "file-upload" | "conditional-logic";

export type LayoutComponentType =
  | "section-group" | "add-more-block" | "divider" | "info-label";

export type ComponentType = CoreComponentType | AdvancedComponentType | LayoutComponentType;

// ─── Component Catalog Entry ──────────────────────────────────────────────

export interface ComponentDefinition {
  type: ComponentType;
  category: ComponentCategory;
  name: string;
  description: string;
  icon: string;           // Lucide icon name
  accent: string;         // Color for type badge (teal, pink, blue, purple, amber, green)
  supportsOptions: boolean;
  supportsChildren: boolean;  // Section Group, Add More Block
  supportsFormula: boolean;
  supportsDataSource: boolean;
  supportsPrefill: boolean;
}

// ─── Field Instance on Canvas ─────────────────────────────────────────────

export interface FormField {
  id: string;                    // Unique UUID
  type: ComponentType;
  label: string;
  helpText: string;
  parentId: string | null;       // null = top-level, otherwise section/addMore id
  order: number;                 // Position within parent context

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
  sectionLabel: string;          // Section Group header
  addMoreLabel: string;          // Add More button label
  addMoreMin: number;
  addMoreMax: number;

  // Toggle-specific
  toggleOnLabel: string;
  toggleOffLabel: string;

  // Conditional Logic
  conditionAction: "show" | "hide";
  conditionRules: ConditionRule[];
}

// ─── Rules & Conditions ───────────────────────────────────────────────────

export type ComparisonOperator =
  | "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";

export interface ConditionRule {
  id: string;
  sourceFieldId: string;
  operator: ComparisonOperator;
  value: string;
}

export type VisibilityRule = ConditionRule;

// ─── Pre-fill ─────────────────────────────────────────────────────────────

export type PrefillSource =
  | "user-profile" | "store-mapping" | "product-master" | "system" | "custom";

// ─── Options Source ───────────────────────────────────────────────────────

export type OptionsSourceType = "manual" | "excel" | "from-master" | "from-mapping";

// ─── Data Source ──────────────────────────────────────────────────────────

export interface DataSourceConfig {
  source: "product-master" | "store-master" | "custom";
  customName: string;
  chainLevels: string[];        // For dependent dropdown
  filterColumns: string[];      // For list view
  readOnlyColumns: string[];    // For list view
  editableColumns: EditableColumn[];  // For list view
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

export interface FormBuilderState {
  configurations: FormConfiguration[];
  activeConfigId: string | null;
  selectedFieldId: string | null;
  dragState: DragState | null;
  undoStack: FormField[][];   // Past states (max 30)
  redoStack: FormField[][];   // Future states
  draftStatus: "saved" | "saving" | "error" | "idle";
  lastSavedAt: string | null;
}

export interface DragState {
  type: "palette" | "reorder";
  componentType?: ComponentType;
  fieldId?: string;
  overDropZoneId: string | null;
}
```

## Component Architecture

### 1. Form Configurations List Page

```
FormConfigListPage
├── PageHeader (eyebrow + title + "< Modules" back link)
├── FormConfigCard[] (mapped from configurations)
│   ├── NumberBadge (green sequential)
│   ├── ConfigInfo (name, designations, field count)
│   ├── EditPermissionBadge
│   └── ActionButtons (settings, clone, delete)
├── AddNewConfigButton
└── ConfigSettingsModal (conditionally rendered)
```

**Route**: `/project-admin/[accountCode]/[projectCode]/form-builder`

### 2. Form Builder Workspace

```
FormBuilderWorkspace (flex row, full height)
├── WorkspaceHeader
│   ├── BackLink ("< All Configs")
│   ├── FormNameDisplay + FieldCountBadge
│   └── ActionBar (undo, redo, refresh, settings, Save & Publish)
├── ThreePanelLayout (flex row, flex-1)
│   ├── ComponentPalette (w-[260px], overflow-y-auto)
│   │   ├── SearchInput
│   │   ├── PaletteGroup "CORE"
│   │   │   └── PaletteTile[] (18 items)
│   │   ├── PaletteGroup "ADVANCED"
│   │   │   └── PaletteTile[] (7 items)
│   │   └── PaletteGroup "LAYOUT"
│   │       └── PaletteTile[] (4 items)
│   ├── FormCanvas (flex-1, overflow-y-auto)
│   │   ├── CanvasHeader (form name, field count, designations)
│   │   ├── FieldCard[] (mapped from fields)
│   │   │   ├── DragHandle
│   │   │   ├── QuestionNumber
│   │   │   ├── TypeBadge (color-coded)
│   │   │   ├── FlagIndicators (Required, Conditional, Read-only)
│   │   │   ├── FieldLabel
│   │   │   ├── HelpText
│   │   │   └── InlinePreview (type-specific)
│   │   ├── DropZone[] (between cards, visible on drag)
│   │   ├── SectionGroupContainer (purple border)
│   │   │   └── FieldCard[] (nested children)
│   │   ├── AddMoreBlockContainer (amber border)
│   │   │   └── FieldCard[] (nested children)
│   │   └── AddFieldPrompt ("+ Add field" card at bottom)
│   └── FieldInspector (w-[350px], overflow-y-auto)
│       ├── InspectorEmptyState (when no selection)
│       └── InspectorContent (when field selected)
│           ├── FieldGroup (label, help text)
│           ├── VisibilityGroup (always/conditional rules)
│           ├── PrefillGroup (source, field mapping, read-only)
│           ├── ValidationGroup (required + type-specific)
│           ├── OptionsGroup (manual/excel/master/mapping)
│           ├── DataSourceGroup (for DD/ListView)
│           ├── FormulaGroup (for Calculation)
│           └── ActionsGroup (duplicate, delete)
└── WorkspaceFooter
    ├── DraftStatusIndicator ("Auto-draft saved")
    └── PublishButton ("Save & Publish")
```

**Route**: `/project-admin/[accountCode]/[projectCode]/form-builder/[configId]`

## State Management

### FormBuilderContext

The entire workspace state is managed via a React Context wrapping a `useReducer`:

```typescript
// Actions dispatched to the reducer
export type FormBuilderAction =
  | { type: "ADD_FIELD"; componentType: ComponentType; atIndex?: number; parentId?: string }
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
```

### Undo/Redo Strategy

- Before any field mutation (add, delete, duplicate, move, update), push current `fields[]` snapshot to `undoStack`
- Clear `redoStack` on new action
- On undo: move current to `redoStack`, pop from `undoStack`
- On redo: move current to `undoStack`, pop from `redoStack`
- Cap at 30 entries (FIFO discard from oldest)

### Auto-Draft Save

- Debounced (2s) save to `localStorage` after any field mutation
- Key: `form-builder-draft-{configId}`
- On workspace load, check for draft → restore if newer than mock data
- On publish success, clear draft

## Drag and Drop Implementation

### Library: @dnd-kit

Using `@dnd-kit/core` and `@dnd-kit/sortable` for:
- Accessible by default (keyboard support)
- React-first architecture (no DOM manipulation)
- Supports multiple draggable sources (palette → canvas, canvas → canvas)
- Lightweight (~15KB gzipped)

### DnD Contexts

```typescript
// Palette → Canvas: useDraggable on PaletteTile, useDroppable on DropZone
// Canvas reorder: useSortable on FieldCard within SortableContext
// Nesting: useDroppable on SectionGroupContainer / AddMoreBlockContainer

// DragOverlay renders a ghost preview of the dragged item
```

### Drop Zone Behavior
- Default height: 6px (collapsed, invisible)
- On drag hover: expand to 36px with dashed blue border
- Valid drop targets determined by:
  - Cannot drop Section_Group inside Section_Group
  - Cannot drop Add_More_Block inside Add_More_Block
  - Max nesting depth: 2 levels

## Component Catalog (`lib/form-builder/constants.ts`)

```typescript
export const COMPONENT_CATALOG: ComponentDefinition[] = [
  // CORE (18)
  { type: "short-text", category: "core", name: "Short Text", icon: "Type", accent: "blue", ... },
  { type: "paragraph", category: "core", name: "Paragraph", icon: "AlignLeft", accent: "blue", ... },
  { type: "alphanumeric", category: "core", name: "Alphanumeric", icon: "Hash", accent: "teal", ... },
  { type: "number", category: "core", name: "Number", icon: "Calculator", accent: "pink", ... },
  { type: "dropdown", category: "core", name: "Dropdown", icon: "ChevronDown", accent: "blue", ... },
  { type: "multi-select", category: "core", name: "Multi Select", icon: "ListChecks", accent: "blue", ... },
  { type: "radio", category: "core", name: "Radio", icon: "Circle", accent: "pink", ... },
  { type: "checkbox", category: "core", name: "Checkbox", icon: "CheckSquare", accent: "pink", ... },
  { type: "toggle", category: "core", name: "Toggle", icon: "ToggleLeft", accent: "blue", ... },
  { type: "image-capture", category: "core", name: "Image Capture", icon: "Camera", accent: "amber", ... },
  { type: "date-picker", category: "core", name: "Date Picker", icon: "Calendar", accent: "amber", ... },
  { type: "time-range", category: "core", name: "Time Range", icon: "Clock", accent: "amber", ... },
  { type: "gps-location", category: "core", name: "GPS Location", icon: "MapPin", accent: "green", ... },
  { type: "geo-fencing", category: "core", name: "Geo-fencing", icon: "Target", accent: "green", ... },
  { type: "signature", category: "core", name: "Signature", icon: "PenTool", accent: "purple", ... },
  { type: "rating", category: "core", name: "Rating / Stars", icon: "Star", accent: "amber", ... },
  { type: "email", category: "core", name: "Email", icon: "Mail", accent: "blue", ... },
  { type: "phone", category: "core", name: "Phone", icon: "Phone", accent: "blue", ... },

  // ADVANCED (7)
  { type: "barcode-qr", category: "advanced", name: "Barcode / QR", icon: "QrCode", accent: "purple", ... },
  { type: "calculation", category: "advanced", name: "Calculation", icon: "Sigma", accent: "teal", ... },
  { type: "dependent-dropdown", category: "advanced", name: "Dependent DD", icon: "GitBranch", accent: "blue", ... },
  { type: "list-view", category: "advanced", name: "List View", icon: "Table", accent: "teal", ... },
  { type: "file-upload", category: "advanced", name: "File Upload", icon: "Upload", accent: "amber", ... },
  { type: "conditional-logic", category: "advanced", name: "Conditional Logic", icon: "GitMerge", accent: "purple", ... },

  // LAYOUT (4)
  { type: "section-group", category: "layout", name: "Section Group", icon: "Layers", accent: "purple", ... },
  { type: "add-more-block", category: "layout", name: "Add More Block", icon: "PlusCircle", accent: "amber", ... },
  { type: "divider", category: "layout", name: "Divider", icon: "Minus", accent: "gray", ... },
  { type: "info-label", category: "layout", name: "Info / Label", icon: "Info", accent: "gray", ... },
];
```

## Publish Validation (`lib/form-builder/publish-validation.ts`)

```typescript
export interface ValidationResult {
  errors: ValidationIssue[];    // Block publish
  warnings: ValidationIssue[];  // Allow with acknowledgment
}

export interface ValidationIssue {
  fieldId: string | null;
  message: string;
  type: "error" | "warning";
}

// Blocking errors:
// - Field with empty label
// - Number field with min > max
// - Image field with minPhotos > maxPhotos
// - Add More Block with minEntries > maxEntries
// - Form with zero fields
// - Calculation with invalid formula (syntax error or broken reference)

// Non-blocking warnings:
// - No designations assigned to form
// - Duplicate field labels
// - Conditional visibility with no rules defined
// - Pre-fill from Product Master without a product selector above
// - Master source without display columns selected
```

## Mock Data Strategy

Since API integration comes later, all data operations use an in-memory store with localStorage persistence:

```typescript
// lib/form-builder/mock-data.ts
export const MOCK_CONFIGURATIONS: FormConfiguration[] = [
  {
    id: "config-1",
    name: "All 28 Components — Sequential Demo",
    designations: ["ISP Executive", "Team Lead"],
    editPermission: "editable",
    editWindow: "custom-hours",
    editWindowHours: 36,
    fields: [...], // Pre-populated with sample fields
    status: "published",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "config-2",
    name: "New Form",
    designations: [],
    editPermission: "editable",
    editWindow: "custom-hours",
    editWindowHours: 24,
    fields: [...], // Default sample fields
    status: "draft",
    createdAt: "2025-01-16T10:00:00Z",
    updatedAt: "2025-01-16T10:00:00Z",
  },
];
```

### Mock Service Layer

```typescript
// lib/form-builder/form-builder-service.ts
// Mirrors the API service pattern used in feature-config-service.ts
export const formBuilderService = {
  getConfigurations(projectId: string): Promise<FormConfiguration[]>,
  getConfiguration(configId: string): Promise<FormConfiguration>,
  createConfiguration(projectId: string): Promise<FormConfiguration>,
  updateConfiguration(configId: string, data: Partial<FormConfiguration>): Promise<FormConfiguration>,
  cloneConfiguration(configId: string): Promise<FormConfiguration>,
  deleteConfiguration(configId: string): Promise<void>,
  publishConfiguration(configId: string): Promise<FormConfiguration>,
};
```

This service will be swapped with real API calls in the integration phase without changing component code.

## Routing

| Route | Page | Description |
|-------|------|-------------|
| `/project-admin/[accountCode]/[projectCode]/form-builder` | List Page | Shows all form configurations |
| `/project-admin/[accountCode]/[projectCode]/form-builder/[configId]` | Workspace | Three-panel form builder |

Navigation flow:
1. Modules page → click "Configure" on Form Builder → List page
2. List page → click config card → Workspace
3. List page → click "+ Add New" → creates config → Workspace
4. Workspace → "< All Configs" → List page
5. Workspace → "Save & Publish" success → List page

## Styling Approach

- Use inline styles matching existing project patterns (as seen in `modal.tsx`, `action-buttons.tsx`)
- CSS variables from `globals.css` for colors (`--orca-brand`, `--orca-surface`, `--orca-border`, etc.)
- Utility classes from Tailwind where appropriate for layout (`flex`, `gap`, `w-[260px]`, `overflow-y-auto`)
- Component-specific colors for type badges use the accent field from component catalog

### Color Mapping for Type Badges
| Accent | Background | Text | Usage |
|--------|-----------|------|-------|
| blue | `var(--orca-brand-light)` | `var(--orca-brand)` | Short Text, Dropdown, Multi Select, etc. |
| teal | `#d1fae5` | `#059669` | Alphanumeric, Calculation, List View |
| pink | `#fce7f3` | `#db2777` | Number, Radio, Checkbox |
| purple | `#ede9fe` | `#7c3aed` | Signature, Barcode, Conditional Logic, Section Group |
| amber | `var(--orca-brand-3-light)` | `var(--orca-brand-3)` | Image, Date, Time, File Upload, Add More |
| green | `var(--orca-brand-2-light)` | `var(--orca-brand-2)` | GPS, Geo-fencing |
| gray | `#f1f5f9` | `#64748b` | Divider, Info/Label |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y` | Redo |
| `Delete` / `Backspace` | Delete selected field (with confirmation) |
| `Ctrl/Cmd + D` | Duplicate selected field |
| `Escape` | Deselect current field |

## Accessibility

- All interactive elements have proper `aria-labels`
- Drag handles include `aria-roledescription="sortable"` via @dnd-kit
- Keyboard navigation through palette items (Tab + Enter to add)
- Focus management: selecting a field moves focus to Inspector
- Screen reader announcements for drag operations via @dnd-kit's announcements API
- Color contrast ratios meet WCAG AA for all text/badge combinations

## Performance Considerations

- **Virtualization**: Not needed initially (typical forms have <100 fields)
- **Debounced updates**: Inspector property changes debounce Canvas re-render (150ms)
- **Draft save debounce**: 2 seconds after last change
- **Undo stack**: Shallow copies of field array (fields are treated as immutable)
- **Palette search**: Simple string filter, no need for fuzzy matching at <30 items

## Dependencies to Add

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

## Security Considerations

- File uploads (Excel for options) are client-side only (parsed in browser, not sent to server yet)
- localStorage draft data contains no sensitive information (form structure only)
- Form names and labels are sanitized before display (XSS prevention)
- No server-side operations in this phase (mock data only)
