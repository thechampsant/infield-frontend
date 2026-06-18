# Implementation Plan: Form Builder Configuration Suite

## Overview

Build the Form Builder Configuration Suite incrementally across 10 logical phases: foundation (types, constants, mock data, context/reducer), list page, workspace shell, component palette, canvas, drag-and-drop, basic inspector, advanced inspector, undo/redo + auto-draft, and publish validation. Each phase builds on prior work and is independently testable. Uses Next.js 16, React 19, TypeScript, Tailwind CSS 4, @dnd-kit, Lucide icons, and mock data (no API integration).

## Tasks

- [x] 1. Foundation — Types, Constants, Mock Data, Context & Reducer
  - [x] 1.1 Install @dnd-kit dependencies and create type definitions
    - Run `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
    - Create `src/lib/form-builder/types.ts` with all TypeScript types from design: ComponentType unions, ComponentDefinition, FormField, ConditionRule, VisibilityRule, PrefillSource, OptionsSourceType, DataSourceConfig, EditableColumn, TypeSpecificConfig, FormConfiguration, FormBuilderState, DragState, and FormBuilderAction union
    - _Requirements: 2.1, 7.1, 9.1, 10.1, 14.1, 15.1, 16.1, 17.1, 18.1, 19.1, 25.1_

  - [x] 1.2 Create component catalog constants
    - Create `src/lib/form-builder/constants.ts` with COMPONENT_CATALOG array (28+ component definitions) organized into Core (18), Advanced (7), and Layout (4) groups
    - Each entry has type, category, name, description, icon (Lucide name), accent color, and boolean capability flags (supportsOptions, supportsChildren, supportsFormula, supportsDataSource, supportsPrefill)
    - _Requirements: 7.1, 7.2_

  - [x] 1.3 Create mock data and mock service layer
    - Create `src/lib/form-builder/mock-data.ts` with 2 sample FormConfiguration objects including pre-populated fields
    - Create `src/lib/form-builder/form-builder-service.ts` with mock service (getConfigurations, getConfiguration, createConfiguration, updateConfiguration, cloneConfiguration, deleteConfiguration, publishConfiguration) using in-memory state backed by localStorage
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.3_

  - [x] 1.4 Create form builder context and reducer
    - Create `src/lib/form-builder/form-builder-reducer.ts` with reducer handling all FormBuilderAction types: ADD_FIELD, DELETE_FIELD, DUPLICATE_FIELD, MOVE_FIELD, UPDATE_FIELD, SELECT_FIELD, SET_DRAG_STATE, UNDO, REDO, LOAD_CONFIG, SET_DRAFT_STATUS
    - Create `src/lib/form-builder/form-builder-context.tsx` with React Context provider wrapping useReducer, exposing state + dispatch
    - Include helper for sequential question numbering on every mutation
    - _Requirements: 8.1, 9.3, 11.2, 12.1, 12.2, 25.2, 25.3_

  - [x] 1.5 Create undo/redo stack utility and draft storage utility
    - Create `src/lib/form-builder/undo-redo.ts` with pushUndo, undo, redo functions capped at 30 entries
    - Create `src/lib/form-builder/draft-storage.ts` with saveDraft (debounced 2s), loadDraft, clearDraft using localStorage key `form-builder-draft-{configId}`
    - _Requirements: 25.2, 25.3, 25.4, 25.6, 26.1, 26.3, 26.4_

- [x] 2. Configurations List Page
  - [x] 2.1 Create list page route and main component
    - Create `src/app/project-admin/[accountCode]/[projectCode]/form-builder/page.tsx` (route page with metadata)
    - Create `src/components/project-admin/form-builder/configurations/form-config-list-page.tsx` with page header (eyebrow "FORM BUILDER", title "Form Configurations", subtitle, "< Modules" back link)
    - Fetch configurations from mock service on mount, handle loading/error states
    - _Requirements: 1.1, 1.2, 1.3, 2.3, 2.4_

  - [x] 2.2 Create form configuration card component
    - Create `src/components/project-admin/form-builder/configurations/form-config-card.tsx`
    - Display: green sequential number badge, form name (truncated 80 chars), designations list (up to 3 + "+N more"), field count, edit permission badge ("Editable"/"Read-Only")
    - Include action buttons: settings (gear), clone, delete
    - Use inline styles with CSS variables matching existing project patterns
    - _Requirements: 2.1, 2.2_

  - [x] 2.3 Implement clone configuration action
    - On clone click, call formBuilderService.cloneConfiguration
    - Append " (Copy)" to cloned name, truncate to 100 chars
    - Add cloned config card at end of list with next sequential badge
    - Handle error state with error notification
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 2.4 Implement delete configuration action with confirmation
    - Show confirmation dialog identifying config by name
    - On confirm: delete via service, re-number remaining cards, show success notification
    - Disable delete button when only 1 config exists (show tooltip)
    - Handle cancel (close dialog, no changes) and error states
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.5 Implement config settings modal
    - Create `src/components/project-admin/form-builder/configurations/config-settings-modal.tsx`
    - Reuse project's existing Modal component pattern
    - Fields: form name (1–100 chars), designation multi-select, edit permission toggle (Editable/Locked), edit window hours (0–720)
    - Validation: empty name shows inline error, blocks save
    - On save: update config via service, reflect changes on card immediately
    - On cancel/close: discard unsaved edits
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.6 Implement add new configuration
    - "+ Add New Form Configuration" button below card list (shown even when empty)
    - On click: disable button, create config via service with default name "Untitled Form", navigate to workspace
    - On error: re-enable button, show error message, stay on list page
    - _Requirements: 3.1, 3.2, 3.3_

- [~] 3. Checkpoint — List page complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Workspace Shell — Three-Panel Layout, Header, Footer
  - [x] 4.1 Create workspace route and layout container
    - Create `src/app/project-admin/[accountCode]/[projectCode]/form-builder/[configId]/page.tsx`
    - Create `src/components/project-admin/form-builder/workspace/form-builder-workspace.tsx` with full-height flex layout wrapping the three-panel body
    - Wrap with FormBuilderContext provider, load config from service on mount
    - _Requirements: 28.1, 28.2_

  - [x] 4.2 Create workspace header
    - Create `src/components/project-admin/form-builder/workspace/workspace-header.tsx`
    - "< All Configs" back link to list route
    - Form name display + field count badge
    - Action buttons: undo, redo, refresh, settings (gear), "Save & Publish" button
    - Undo/redo buttons disabled when stacks empty
    - _Requirements: 25.1, 25.5, 28.1, 28.2, 28.3, 28.4_

  - [x] 4.3 Create workspace footer
    - Create `src/components/project-admin/form-builder/workspace/workspace-footer.tsx`
    - Draft status indicator ("Auto-draft saved X ago")
    - "Save & Publish" button (secondary location)
    - _Requirements: 26.2, 27.1_

  - [x] 4.4 Create three-panel layout with placeholder panels
    - Flex row: left panel 260px (palette placeholder), center flex-1 (canvas placeholder), right panel 350px (inspector placeholder)
    - All panels have overflow-y-auto
    - _Requirements: 7.1, 10.1, 14.1_

- [x] 5. Component Palette — Display, Search, Click-to-Add
  - [x] 5.1 Create component palette with grouped display
    - Create `src/components/project-admin/form-builder/palette/component-palette.tsx`
    - Create `src/components/project-admin/form-builder/palette/palette-group.tsx` (group header + tiles)
    - Create `src/components/project-admin/form-builder/palette/palette-tile.tsx` (colored icon + label)
    - Display all 28+ components in Core/Advanced/Layout groups from COMPONENT_CATALOG
    - _Requirements: 7.1, 7.2_

  - [x] 5.2 Implement palette search filtering
    - Search input at top of palette
    - Real-time case-insensitive filter on each keystroke
    - Hide group headers with zero matching components
    - Show empty state when no match
    - Clear control restores full list
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 5.3 Implement click-to-add from palette
    - On tile click: dispatch ADD_FIELD to append after last top-level field
    - Assign next sequential question number, default label "Untitled [component type]"
    - Select new field, scroll into view within 300ms
    - Inspector shows properties with defaults
    - Handle empty canvas (insert as first item, question number 1)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 6. Canvas — Field Cards, Selection, Display
  - [x] 6.1 Create form canvas container and field card component
    - Create `src/components/project-admin/form-builder/canvas/form-canvas.tsx` (center panel)
    - Create `src/components/project-admin/form-builder/canvas/field-card.tsx`
    - Field card displays: question number, color-coded type badge (uppercase), field label (truncate 60 chars), help text (truncate 80 chars)
    - Placeholder "Untitled Field" when label empty
    - Flag indicators: required, visibility conditions, pre-fill configured, read-only
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 6.2 Implement field selection and deselection
    - Click field card → highlight with differentiated border, deselect previous
    - Click outside any field card → deselect
    - Only one field selected at a time
    - _Requirements: 10.4, 10.5_

  - [x] 6.3 Create section group and add-more-block containers
    - Create `src/components/project-admin/form-builder/canvas/section-group-container.tsx` (collapsible, purple border, expand/collapse toggle)
    - Create `src/components/project-admin/form-builder/canvas/add-more-block-container.tsx` (repeatable, amber border)
    - Visually indent nested fields by one level
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 6.4 Implement field duplication and deletion on canvas
    - Duplicate: insert copy below original, append " (Copy)" to label, preserve all properties, auto-select, re-number
    - Delete: show confirmation, remove field, re-number remaining
    - Handle orphaned visibility rules on deletion (remove rule, show notification)
    - _Requirements: 12.1, 12.2, 12.3_

- [~] 7. Checkpoint — Palette and Canvas working
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Drag and Drop — Palette-to-Canvas, Canvas Reorder, Nesting
  - [~] 8.1 Set up DndContext and implement palette-to-canvas drag
    - Wrap workspace in DndContext from @dnd-kit/core
    - Make palette tiles draggable (useDraggable)
    - Create `src/components/project-admin/form-builder/canvas/drop-zone.tsx` (6px collapsed, 36px expanded on drag hover with dashed blue border)
    - Show drop zones between field cards on drag start (within 200ms)
    - On drop: insert field at position, select it, scroll into view
    - On drop outside valid zone: cancel, remove drop zones
    - Show DragOverlay ghost preview
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [~] 8.2 Implement canvas field reordering via drag
    - Make field cards sortable (useSortable from @dnd-kit/sortable)
    - Show drop zones at valid insertion positions including inside containers
    - On drop: move field to new position, re-number all questions
    - Cancel if dropped outside valid zone
    - _Requirements: 11.1, 11.2, 11.3_

  - [~] 8.3 Implement nesting rules for drag and drop
    - Allow dropping fields into Section Group and Add More Block containers
    - Prevent Section Group inside Section Group, Add More Block inside Add More Block
    - Allow cross-type nesting (Section inside Add More, and vice versa)
    - Enforce max nesting depth of 2 levels
    - Moving field out of container places at indicated position
    - _Requirements: 11.4, 11.5, 13.4, 13.5_

- [ ] 9. Inspector — Field Group, Visibility, Pre-fill, Validation, Options
  - [~] 9.1 Create inspector container and empty state
    - Create `src/components/project-admin/form-builder/inspector/field-inspector.tsx` (right panel container)
    - Create `src/components/project-admin/form-builder/inspector/inspector-empty-state.tsx` ("Select a field" with icon + text)
    - When field selected: show collapsible groups applicable to field type
    - _Requirements: 14.1, 14.3_

  - [~] 9.2 Implement field group (label + help text)
    - Create `src/components/project-admin/form-builder/inspector/groups/field-group.tsx`
    - Label input (max 100 chars), help text input (max 250 chars)
    - Empty label shows validation indicator; canvas reflects changes within 500ms
    - _Requirements: 14.2, 14.4, 14.5_

  - [~] 9.3 Implement visibility rules group
    - Create `src/components/project-admin/form-builder/inspector/groups/visibility-group.tsx`
    - Create `src/components/project-admin/form-builder/inspector/shared/condition-builder.tsx` (reusable)
    - Create `src/components/project-admin/form-builder/inspector/shared/smart-value-pill.tsx`
    - Add up to 10 rules: source field selector (exclude self), operator (equals, not_equals, contains, is_empty, is_not_empty), comparison value
    - Multiple rules combined with AND logic
    - Show Smart Value Pills for referenced fields
    - Handle source field deletion (remove orphaned rule + notification)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [~] 9.4 Implement pre-fill and read-only group
    - Create `src/components/project-admin/form-builder/inspector/groups/prefill-group.tsx`
    - Source selector: User Profile, Store Mapping, Product Master, System, Custom
    - Source-specific UI: field-mapping selector / read-only expression / text input (500 chars)
    - Read-only toggle (independent of pre-fill)
    - Clear source removes sub-fields, retains read-only state
    - Read-only flag shown on canvas field card
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [~] 9.5 Implement validation group (required + type-specific)
    - Create `src/components/project-admin/form-builder/inspector/groups/validation-group.tsx`
    - Required: No / Always / Conditional with condition builder
    - Type-specific: Number (min, max, decimals 0–10), Image (min/max count 1–50, max size 1–25 MB), Date (min/max with relative expressions), Geo-fencing (radius 1–100,000m), Barcode (format + length 1–256)
    - Inline error when min > max
    - Handle conditional required source field deletion (revert to "No" + notification)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [~] 9.6 Implement options source group
    - Create `src/components/project-admin/form-builder/inspector/groups/options-group.tsx`
    - Four source types: Manual, Excel Upload, From Master, From Mapping
    - Manual: editable list, add/reorder/remove, max 500 options, 200 chars each, prevent duplicates (case-insensitive)
    - Excel Upload: .xlsx upload (max 5 MB), parse first column, max 2000 rows, error on malformed/empty
    - From Master: entity selector + field selector
    - From Mapping: parent field selector + child option sets per parent value
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

- [~] 10. Checkpoint — Core inspector working
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Advanced Inspector — Data Source, Formula, Conditional Logic, File Upload, Dependent DD
  - [~] 11.1 Implement dependent dropdown configuration
    - Create `src/components/project-admin/form-builder/inspector/groups/data-source-group.tsx`
    - Parent dropdown selector (non-dependent dropdowns on same canvas)
    - Mapping interface: list parent options → define 1–200 child options per parent value
    - Handle parent deletion (convert to standard dropdown, flatten child options, notify)
    - Handle parent option changes (update mapping, remove deleted parent mappings)
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [~] 11.2 Implement list view configuration
    - Add list view section to data-source-group.tsx
    - Data source selection: Product Master, Store Master, Custom
    - Configure: filter columns, read-only columns, editable columns with per-column type (Text, Number, Dropdown, Alphanumeric, Date), required flag, type-specific validations
    - Column order and display labels
    - Populate available columns from selected data source
    - _Requirements: 21.1, 21.2, 21.3, 21.4_

  - [~] 11.3 Implement calculation formula builder
    - Create `src/components/project-admin/form-builder/inspector/groups/formula-group.tsx`
    - Formula input area with Smart Value Pills for field references
    - List of referenceable numeric fields from canvas
    - Operator buttons: +, -, ×, ÷, parentheses
    - Max 256 chars, syntax validation (unbalanced parens, consecutive/trailing operators)
    - Result format selector: Number, Currency (₹), Percentage (%)
    - Handle referenced field deletion (mark formula invalid, show error indicator on card)
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

  - [~] 11.4 Implement conditional logic block configuration
    - Inspector for conditional logic component: action selector (Show when / Hide when)
    - Condition builder: source field (above on canvas), operator, value
    - Multiple conditions with AND logic
    - Handle source field deletion (remove orphaned condition, notify)
    - Canvas renders logic block container with action display
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

  - [~] 11.5 Implement file upload field configuration
    - Add file upload section to validation-group or create dedicated UI
    - Allowed file types multi-select (PDF, DOCX, XLSX, JPG, PNG), defaults to all
    - Max file size (1–25 MB, default 10), max file count (1–10, default 5)
    - Inline validation for out-of-range values
    - _Requirements: 24.1, 24.2, 24.3_

- [ ] 12. Undo/Redo and Auto-Draft Save
  - [~] 12.1 Wire undo/redo into reducer and workspace header
    - Integrate undo-redo.ts utility with form-builder-reducer
    - Push state snapshot before each field mutation (add, delete, duplicate, move, update)
    - UNDO action: revert to previous snapshot, push current to redo
    - REDO action: re-apply next snapshot, push current to undo
    - Clear redo stack on new action after undo
    - Cap at 30 entries
    - Initialize empty stacks on workspace load
    - _Requirements: 25.2, 25.3, 25.4, 25.5, 25.6, 25.7_

  - [~] 12.2 Implement keyboard shortcuts
    - Ctrl/Cmd+Z → undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y → redo
    - Delete/Backspace → delete selected field (with confirmation)
    - Ctrl/Cmd+D → duplicate selected field
    - Escape → deselect current field
    - _Requirements: 25.2, 25.3 (keyboard equivalents from design)_

  - [~] 12.3 Wire auto-draft save with debounce and status display
    - On any field mutation: debounce 2s then save to localStorage
    - Update draft status in footer ("Auto-draft saved a few seconds ago")
    - On workspace load: check for draft, restore if exists
    - On publish success: clear draft from localStorage
    - Handle storage errors (quota exceeded → show warning)
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [ ] 13. Publish Validation
  - [~] 13.1 Create publish validation logic
    - Create `src/lib/form-builder/publish-validation.ts`
    - Blocking errors: empty field label, Number min > max, Image minPhotos > maxPhotos, Add More min > max, zero fields, Calculation with invalid formula
    - Non-blocking warnings: no designations, duplicate labels, conditional visibility with no rules, pre-fill from Product Master without product selector above, master source without display columns
    - Return ValidationResult with errors[] and warnings[]
    - _Requirements: 27.3, 27.4_

  - [~] 13.2 Implement publish flow UI in workspace
    - "Save & Publish" click → disable button, show loading, run validation
    - Errors: display scrollable error panel, highlight first error, re-enable button, block publish
    - Warnings only: show confirmation dialog with "Publish Anyway" / "Cancel"
    - Success: publish via service, show success notification (form name + field count), navigate to list page
    - Error from service: show error notification, re-enable button, stay on page
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_

  - [~] 13.3 Wire settings modal in workspace header
    - Settings gear icon in workspace header opens ConfigSettingsModal with active config
    - Same modal component as list page, updates active config in context
    - _Requirements: 6.6, 28.3_

- [~] 14. Final Checkpoint — Full feature integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP — no optional tasks in this plan as there are no correctness properties requiring property-based tests
- Each task references specific requirement acceptance criteria for traceability
- Checkpoints ensure incremental validation at logical boundaries
- All components use inline styles with CSS variables (matching existing modal.tsx, module-card patterns)
- @dnd-kit is the only new runtime dependency; vitest + fast-check already in devDependencies
- Mock service layer will be swapped for real API calls in a future integration phase
- The list page is independently usable before workspace tasks are complete

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5"] },
    { "id": 3, "tasks": ["2.1", "4.1"] },
    { "id": 4, "tasks": ["2.2", "4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["2.3", "2.4", "2.5", "2.6", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 8, "tasks": ["8.1"] },
    { "id": 9, "tasks": ["8.2", "8.3"] },
    { "id": 10, "tasks": ["9.1", "9.2"] },
    { "id": 11, "tasks": ["9.3", "9.4", "9.5", "9.6"] },
    { "id": 12, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] },
    { "id": 13, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 14, "tasks": ["13.1"] },
    { "id": 15, "tasks": ["13.2", "13.3"] }
  ]
}
```
