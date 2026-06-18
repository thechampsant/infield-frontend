# Requirements Document

## Introduction

The Form Builder Configuration Suite provides Project Admins with a complete visual interface to create, manage, and publish dynamic forms used for field data collection. The feature consists of two main pages: a Form Configurations List Page that displays all form configurations for the project with clone/delete/settings actions, and a Form Builder Workspace with a three-panel layout (Component Palette, Canvas, Inspector) for designing forms via drag-and-drop. The implementation targets the existing Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 frontend with mock data, with API integration to follow separately.

## Glossary

- **Form_Builder_Suite**: The complete set of pages and components that enable form configuration, including the list page and the workspace page.
- **Form_Configuration**: A single form definition containing metadata (name, designations, edit permission, edit window) and an ordered list of fields.
- **Configurations_List_Page**: The page displaying all Form_Configurations as numbered cards, accessible from the Modules page via "Configure" on the Form Builder module.
- **Workspace_Page**: The three-panel form editing interface with Component Palette, Canvas, and Inspector panels.
- **Component_Palette**: The left panel (~260px) listing all available field component types grouped into Core, Advanced, and Layout categories.
- **Canvas**: The center panel providing a visual preview of form fields with drag-and-drop reordering and drop zones.
- **Inspector**: The right panel (~350px) showing editable properties of the currently selected field, organized into collapsible groups.
- **Field_Card**: A visual representation of a single form field on the Canvas showing its question number, type badge, flags, label, and help text.
- **Drop_Zone**: A visual indicator between Field_Cards on the Canvas where a new or moved component can be placed.
- **Section_Group**: A layout component that visually groups related fields into a collapsible section and supports nesting of fields within it.
- **Add_More_Block**: A layout component representing a repeatable group of fields that the end-user can duplicate at data-entry time.
- **Visibility_Rule**: A conditional expression defining when a field is shown or hidden based on other field values.
- **Smart_Value_Pill**: A compact visual chip displaying a referenced field value within a Visibility_Rule condition.
- **Pre_Fill_Source**: A data origin (User Profile, Store Mapping, Product Master, System, or Custom) from which a field value is automatically populated.
- **Validation_Rule**: A constraint applied to a field (required, min/max, regex, etc.) that must be satisfied before form submission.
- **Options_Source**: The mechanism providing selectable values for dropdown/radio/checkbox fields (Manual, Excel Upload, From Master, From Mapping).
- **Dependent_Dropdown**: A dropdown field whose available options depend on the selected value of a parent dropdown field.
- **Undo_Redo_Stack**: A 30-action history buffer supporting undo and redo operations on Canvas changes.
- **Auto_Draft**: An automatic background save mechanism that persists the current form state without user intervention.
- **Publish_Validation**: A set of checks run before publishing a form, categorized into blocking errors and non-blocking warnings.
- **Config_Settings_Modal**: A dialog for editing form-level metadata: form name, assigned designations, edit permission, and edit window duration.
- **Project_Admin**: The authenticated user role with permissions to manage form configurations for a project.

## Requirements

### Requirement 1: Navigation from Modules to Form Configurations List

**User Story:** As a Project Admin, I want to navigate from the Modules page to the Form Configurations List page, so that I can manage form configurations for the project.

#### Acceptance Criteria

1. WHEN the Project_Admin clicks "Go to Configuration" on the Form Builder module card while the module is enabled, THE Form_Builder_Suite SHALL navigate to the Configurations_List_Page at route `/project-admin/[accountCode]/[projectCode]/form-builder`.
2. THE Configurations_List_Page SHALL display a header with eyebrow text "FORM BUILDER", title "Form Configurations", and subtitle "Same designation can have multiple forms".
3. THE Configurations_List_Page SHALL display a "< Modules" back link that navigates to the Modules page at route `/project-admin/[accountCode]/[projectCode]/modules`.
4. IF the Form Builder module is disabled on the Modules page, THEN THE Form_Builder_Suite SHALL NOT display the "Go to Configuration" button on the Form Builder module card.

### Requirement 2: Form Configuration Cards Display

**User Story:** As a Project Admin, I want to see all form configurations listed as numbered cards, so that I can quickly identify and manage each configuration.

#### Acceptance Criteria

1. THE Configurations_List_Page SHALL display each Form_Configuration as a card with a sequential green numbered badge starting from 1, ordered by creation date ascending.
2. THE Configurations_List_Page SHALL display the form name (truncated at 80 characters with ellipsis if exceeded), list of assigned designations (showing up to 3 designation names with a "+N more" indicator for additional items), total field count as a numeric value, and an edit permission badge indicating either "Editable" or "Read-Only" status on each card.
3. WHEN no Form_Configurations exist, THE Configurations_List_Page SHALL display an empty state with a message indicating no configurations are available and a call-to-action element to add a configuration.
4. IF the Form_Configurations fail to load due to a network or server error, THEN THE Configurations_List_Page SHALL display an error message indicating the failure and provide an option to retry loading.

### Requirement 3: Add New Form Configuration

**User Story:** As a Project Admin, I want to add a new form configuration, so that I can create forms for different designations.

#### Acceptance Criteria

1. THE Configurations_List_Page SHALL display an "+ Add New Form Configuration" button below the list of cards, including when the list is empty.
2. WHEN the Project_Admin clicks "+ Add New Form Configuration", THE Form_Builder_Suite SHALL disable the button to prevent duplicate submissions, create a new Form_Configuration with a default name "Untitled Form", and navigate to the Workspace_Page for that configuration.
3. IF the creation of a new Form_Configuration fails, THEN THE Form_Builder_Suite SHALL re-enable the "+ Add New Form Configuration" button, remain on the Configurations_List_Page, and display an error message indicating the configuration could not be created.

### Requirement 4: Clone Form Configuration

**User Story:** As a Project Admin, I want to clone an existing form configuration, so that I can quickly create a similar form without rebuilding from scratch.

#### Acceptance Criteria

1. WHEN the Project_Admin clicks the clone action button on a form configuration card, THE Form_Builder_Suite SHALL create a duplicate Form_Configuration with the original name appended with " (Copy)".
2. WHEN a Form_Configuration is cloned and the source name already ends with " (Copy)", THE Form_Builder_Suite SHALL append an additional " (Copy)" suffix to the cloned name, truncating the name to a maximum of 100 characters.
3. WHEN the clone operation completes, THE Form_Builder_Suite SHALL duplicate all fields (preserving order and nesting structure), validation rules, visibility rules, pre-fill configurations, and settings from the source Form_Configuration into the cloned Form_Configuration, with the cloned form set to draft state regardless of the source form's publish status.
4. WHEN the clone operation completes, THE Configurations_List_Page SHALL display the cloned Form_Configuration as a new card at the end of the list with the next sequential number badge.
5. IF the clone operation fails, THEN THE Form_Builder_Suite SHALL display an error notification indicating the form could not be cloned and leave the Configurations_List_Page unchanged.

### Requirement 5: Delete Form Configuration

**User Story:** As a Project Admin, I want to delete a form configuration, so that I can remove configurations that are no longer needed.

#### Acceptance Criteria

1. WHEN the Project_Admin clicks the delete action button on a form configuration card, THE Form_Builder_Suite SHALL display a confirmation dialog that identifies the Form_Configuration by name and provides confirm and cancel actions.
2. IF the Project_Admin selects the cancel action on the deletion confirmation dialog, THEN THE Form_Builder_Suite SHALL close the dialog and leave the Form_Configuration unchanged.
3. WHEN the Project_Admin confirms deletion, THE Form_Builder_Suite SHALL remove the Form_Configuration, re-number remaining cards sequentially starting from 1, and display a success notification indicating the configuration was deleted.
4. IF the deletion request fails due to a server error, THEN THE Form_Builder_Suite SHALL display an error notification indicating the deletion was unsuccessful and retain the Form_Configuration in its original position.
5. IF only one Form_Configuration exists, THEN THE Form_Builder_Suite SHALL disable the delete action button and display a tooltip indicating a minimum of one configuration is required.

### Requirement 6: Form Configuration Settings

**User Story:** As a Project Admin, I want to edit form-level settings, so that I can control metadata like form name, designations, edit permission, and edit window.

#### Acceptance Criteria

1. WHEN the Project_Admin clicks the settings (gear) action button on a form configuration card, THE Form_Builder_Suite SHALL open the Config_Settings_Modal pre-populated with the current metadata values for that Form_Configuration.
2. THE Config_Settings_Modal SHALL provide editable fields for: form name (text input, 1 to 100 characters), designation assignment (multi-select from the project's existing designations), edit permission toggle (Editable or Locked after submit), and edit window duration input (numeric field accepting whole numbers from 0 to 720 hours).
3. IF the Project_Admin attempts to save the Config_Settings_Modal with an empty form name, THEN THE Form_Builder_Suite SHALL display an inline validation error indicating the missing required field and SHALL NOT save the changes.
4. WHEN the Project_Admin saves valid changes in the Config_Settings_Modal, THE Form_Builder_Suite SHALL update the Form_Configuration metadata and reflect the updated form name, designations, and edit permission badge on the card immediately without requiring a page reload.
5. WHEN the Project_Admin clicks the cancel button or closes the Config_Settings_Modal without saving, THE Form_Builder_Suite SHALL discard all unsaved edits and leave the Form_Configuration metadata unchanged.
6. WHEN the Project_Admin is in the Workspace_Page and clicks the settings icon in the header, THE Form_Builder_Suite SHALL open the Config_Settings_Modal with the current configuration settings for the active Form_Configuration.

### Requirement 7: Component Palette Display and Search

**User Story:** As a Project Admin, I want to browse and search available field components, so that I can find and add the right component types to my form.

#### Acceptance Criteria

1. THE Component_Palette SHALL display a minimum of 28 field component types organized into three groups: Core (18 components), Advanced (7 components), and Layout (4 components), with each group preceded by a visible group header label.
2. THE Component_Palette SHALL display each component as a tile with a colored icon and a text label showing the component type name.
3. WHEN the Project_Admin types in the search input at the top of the Component_Palette, THE Component_Palette SHALL filter displayed components in real time (on each keystroke) to only those whose names contain the search text (case-insensitive), hiding any group headers whose group contains zero matching components.
4. WHEN the search text matches no components, THE Component_Palette SHALL display an empty state message indicating that no components match the current search term.
5. WHEN the Project_Admin clears the search input (by deleting all text or activating a clear control), THE Component_Palette SHALL restore the full list of components organized into their original groups.

### Requirement 8: Add Component by Click

**User Story:** As a Project Admin, I want to click a component in the palette to add it to the form, so that I can quickly build forms without dragging.

#### Acceptance Criteria

1. WHEN the Project_Admin clicks a component tile in the Component_Palette, THE Canvas SHALL append a new Field_Card of that component type after the last top-level field in the field list, assigning it the next sequential question number and a default label of "Untitled [component type]".
2. WHEN a new Field_Card is added by click, THE Canvas SHALL select the newly added Field_Card (deselecting any previously selected field) and scroll it into view within 300ms.
3. WHEN a new Field_Card is added by click, THE Inspector SHALL display the properties of the newly added field with default values for all property groups.
4. IF the Canvas field list is empty when the Project_Admin clicks a component tile, THEN THE Canvas SHALL insert the new Field_Card as the first item in the field list with question number 1.

### Requirement 9: Add Component by Drag and Drop

**User Story:** As a Project Admin, I want to drag components from the palette to a specific position on the canvas, so that I can place fields exactly where I want them.

#### Acceptance Criteria

1. WHEN the Project_Admin initiates a drag on a component tile in the Component_Palette, THE Canvas SHALL display Drop_Zones between existing Field_Cards within 200 milliseconds; IF the Canvas contains no existing Field_Cards, THEN THE Canvas SHALL display a single Drop_Zone indicating the empty canvas accepts the drop.
2. WHILE the Project_Admin drags a component over a Drop_Zone, THE Canvas SHALL visually highlight that Drop_Zone to indicate it is the active insertion target.
3. WHEN the Project_Admin drops the component onto a Drop_Zone, THE Canvas SHALL insert a new Field_Card of that component type at the indicated position, select the newly inserted Field_Card, and scroll it into view.
4. WHEN the Project_Admin drops a component onto a Drop_Zone, THE Inspector SHALL display the properties of the newly inserted field.
5. IF the Project_Admin drops the component outside a valid Drop_Zone, THEN THE Form_Builder_Suite SHALL cancel the drop operation without modifying the field list and remove all visible Drop_Zones from the Canvas.

### Requirement 10: Canvas Field Card Display

**User Story:** As a Project Admin, I want each field on the canvas to show key information at a glance, so that I can understand the form structure without selecting each field.

#### Acceptance Criteria

1. THE Canvas SHALL display each Field_Card with: sequential question number (starting from 1), a color-coded type badge showing the component type name in uppercase, field label (truncated with ellipsis if exceeding 60 characters), and help text (truncated with ellipsis if exceeding 80 characters).
2. IF a Field_Card has no label configured, THEN THE Canvas SHALL display a placeholder text "Untitled Field" in the label position.
3. THE Canvas SHALL display flag indicators on each Field_Card for: required status (when required is set to "Always" or "Conditional"), visibility conditions applied (when at least one Visibility_Rule is configured), and pre-fill configured (when a Pre_Fill_Source is assigned).
4. WHEN the Project_Admin selects a Field_Card, THE Canvas SHALL highlight the selected card with a visually differentiated border and deselect any previously selected Field_Card, ensuring only one Field_Card is selected at a time.
5. WHEN the Project_Admin clicks an area of the Canvas outside any Field_Card, THE Canvas SHALL deselect the currently selected Field_Card.

### Requirement 11: Canvas Field Reordering

**User Story:** As a Project Admin, I want to reorder fields on the canvas by dragging, so that I can arrange the form layout as needed.

#### Acceptance Criteria

1. WHEN the Project_Admin initiates a drag on a Field_Card, THE Canvas SHALL display Drop_Zones at valid insertion positions between existing Field_Cards and inside Section_Group and Add_More_Block containers.
2. WHEN the Project_Admin drops a Field_Card onto a Drop_Zone, THE Canvas SHALL move the field to the new position and re-number all question numbers sequentially starting from 1.
3. IF the Project_Admin drops a Field_Card outside a valid Drop_Zone or releases the drag without targeting a Drop_Zone, THEN THE Canvas SHALL cancel the reorder operation and retain the field in its original position.
4. WHEN the Project_Admin drops a Field_Card into a Section_Group or Add_More_Block container, THE Canvas SHALL nest the field inside that container and visually indent it. WHEN the Project_Admin drops a Field_Card from inside a container to a Drop_Zone outside the container, THE Canvas SHALL remove the field from the container and place it at the indicated position.
5. IF the Project_Admin attempts to drag a Section_Group into another Section_Group or an Add_More_Block into another Add_More_Block, THEN THE Canvas SHALL not display a Drop_Zone inside the target container, preventing invalid nesting.

### Requirement 12: Canvas Field Duplication and Deletion

**User Story:** As a Project Admin, I want to duplicate or delete fields on the canvas, so that I can efficiently manage individual fields.

#### Acceptance Criteria

1. WHEN the Project_Admin selects a Field_Card and triggers the duplicate action, THE Canvas SHALL insert a copy of the field immediately below the original with all properties preserved, append " (Copy)" to the duplicated field's label, auto-select the new Field_Card, and re-number all subsequent question numbers sequentially.
2. WHEN the Project_Admin selects a Field_Card and triggers the delete action, THE Canvas SHALL display a confirmation dialog; WHEN the Project_Admin confirms, THE Canvas SHALL remove the field and re-number remaining fields sequentially.
3. WHEN a field referenced by a Visibility_Rule on another field is deleted, THE Form_Builder_Suite SHALL remove the orphaned Visibility_Rule from the dependent field and display a transient notification informing the Project_Admin which Visibility_Rule was removed and from which field.

### Requirement 13: Section Group and Add More Block Nesting

**User Story:** As a Project Admin, I want to group fields into sections and repeatable blocks, so that the form has logical structure and supports repeated data entry.

#### Acceptance Criteria

1. WHEN the Project_Admin adds a Section_Group component, THE Canvas SHALL render a collapsible container with a header displaying the section label and a collapse/expand toggle, defaulting to the expanded state, that accepts other Field_Cards dropped inside it.
2. WHEN the Project_Admin adds an Add_More_Block component, THE Canvas SHALL render a repeatable container with a header displaying the block label that accepts other Field_Cards dropped inside it.
3. THE Canvas SHALL visually indent nested fields within Section_Group and Add_More_Block containers by one level of indentation to indicate hierarchy.
4. IF the Project_Admin attempts to drop a Section_Group inside another Section_Group, or an Add_More_Block inside another Add_More_Block, THEN THE Canvas SHALL reject the drop, leave the field list unchanged, and display a visual indication that the nesting operation is not permitted.
5. THE Canvas SHALL allow cross-type nesting: a Section_Group may be placed inside an Add_More_Block and an Add_More_Block may be placed inside a Section_Group, limited to a maximum nesting depth of 2 levels.

### Requirement 14: Inspector Field Properties

**User Story:** As a Project Admin, I want to edit the basic properties of a selected field, so that I can customize labels, help text, and toggle settings.

#### Acceptance Criteria

1. WHEN a Field_Card is selected on the Canvas, THE Inspector SHALL display the properties of that field organized into collapsible groups: Field, Visibility, Pre-fill & Read-only, Validation, Options, Data Source, Formula, and Actions, showing only the groups applicable to the selected field's component type.
2. WHILE a Field_Card is selected on the Canvas, THE Inspector SHALL display editable text inputs for field label (maximum 100 characters) and help text (maximum 250 characters) in the Field group.
3. WHEN no Field_Card is selected, THE Inspector SHALL display a "Select a field" empty state with an icon and descriptive text.
4. WHEN the Project_Admin modifies a property in the Inspector, THE Canvas SHALL reflect the change on the corresponding Field_Card within 500 milliseconds.
5. IF the Project_Admin clears the field label input leaving it empty, THEN THE Inspector SHALL display a validation indicator on the label input and THE Field_Card SHALL display a placeholder label on the Canvas.

### Requirement 15: Visibility Rules Configuration

**User Story:** As a Project Admin, I want to define conditional visibility rules for fields, so that fields appear or hide based on other field values at data-entry time.

#### Acceptance Criteria

1. THE Inspector SHALL provide a Visibility group where the Project_Admin can add up to 10 Visibility_Rules for the selected field.
2. WHEN the Project_Admin adds a Visibility_Rule, THE Inspector SHALL provide selectors for: source field (limited to other fields on the same Canvas, excluding the selected field itself), comparison operator (equals, not equals, contains, is empty, is not empty), and comparison value.
3. WHEN multiple Visibility_Rules are defined for a field, THE Inspector SHALL combine rules using AND logic (all conditions must be met).
4. THE Inspector SHALL display referenced field values as Smart_Value_Pills within the rule condition display.
5. WHEN the source field for a Visibility_Rule is deleted from the Canvas, THE Form_Builder_Suite SHALL remove the orphaned rule and display an inline notification to the Project_Admin indicating which rule was removed and why.

### Requirement 16: Pre-fill and Read-only Configuration

**User Story:** As a Project Admin, I want to configure pre-fill sources and read-only states for fields, so that forms auto-populate known data and protect certain values from editing.

#### Acceptance Criteria

1. THE Inspector SHALL provide a "Pre-fill & Read-only" group for the selected field.
2. THE Inspector SHALL allow the Project_Admin to select a Pre_Fill_Source from: User Profile, Store Mapping, Product Master, System, or Custom.
3. WHEN the Pre_Fill_Source "User Profile" or "Store Mapping" or "Product Master" is selected, THE Inspector SHALL display a field-mapping selector allowing the Project_Admin to choose a source entity field. WHEN the Pre_Fill_Source "System" is selected, THE Inspector SHALL display a read-only expression value showing the system-derived field. WHEN the Pre_Fill_Source "Custom" is selected, THE Inspector SHALL display a text input for the Project_Admin to enter a static value of up to 500 characters.
4. THE Inspector SHALL provide a read-only toggle that can be enabled independently of whether a Pre_Fill_Source is configured.
5. WHILE the read-only toggle is enabled, THE Field_Card SHALL display a "Read-only" flag indicator on the Canvas.
6. WHEN the Project_Admin clears the Pre_Fill_Source selection, THE Inspector SHALL remove the source-specific configuration fields and retain the current read-only toggle state unchanged.

### Requirement 17: Required Validation Configuration

**User Story:** As a Project Admin, I want to configure whether a field is required, including conditional required logic, so that I can enforce mandatory data capture based on context.

#### Acceptance Criteria

1. THE Inspector SHALL provide a Validation group with a "Required" setting offering three options: No (default for newly added fields), Always, and Conditional.
2. WHEN the Project_Admin selects "Always", THE Field_Card SHALL display a required flag indicator. WHEN the Project_Admin selects "No", THE Field_Card SHALL remove the required flag indicator.
3. WHEN the Project_Admin selects "Conditional", THE Inspector SHALL display a condition builder allowing the Project_Admin to define when the field becomes required by specifying a source field (selected from existing fields on the Canvas), a comparison operator, and a comparison value.
4. WHEN the Project_Admin selects "Conditional", THE Field_Card SHALL display a conditional-required flag indicator distinct from the "Always" required indicator.
5. IF a source field referenced in a conditional required rule is deleted from the Canvas, THEN THE Form_Builder_Suite SHALL remove the orphaned conditional required rule, revert the Required setting to "No", and display a notification informing the Project_Admin.

### Requirement 18: Type-Specific Validations

**User Story:** As a Project Admin, I want to set validation rules specific to each field type, so that captured data meets business constraints.

#### Acceptance Criteria

1. WHEN a Number-type field is selected, THE Inspector SHALL provide min value, max value, and decimal places (0–10) validation inputs, where all inputs are optional and left blank by default.
2. WHEN an Image Capture field is selected, THE Inspector SHALL provide minimum count (1–50), maximum count (1–50), and maximum file size (1–25 MB) validation inputs, where all inputs are optional and left blank by default.
3. WHEN a Date Picker field is selected, THE Inspector SHALL provide min date and max date validation inputs that accept both absolute dates and relative date expressions using the format "today", "today + N days", or "today - N days" where N is a positive integer.
4. WHEN a Geo-fencing field is selected, THE Inspector SHALL provide a radius input accepting a numeric value between 1 and 100,000 meters defining the allowed geographic boundary.
5. WHEN a Barcode/QR field is selected, THE Inspector SHALL provide a format selector (Code128, EAN-13, QR) and an expected-length input accepting a positive integer between 1 and 256.
6. IF the Project_Admin enters a min value greater than the max value for any type-specific range validation (Number min/max, Image count min/max), THEN THE Inspector SHALL display an inline error message indicating the invalid range and prevent the value from being saved.

### Requirement 19: Options Source Configuration

**User Story:** As a Project Admin, I want to configure where dropdown, radio, and checkbox options come from, so that I can use static or dynamic data sources.

#### Acceptance Criteria

1. WHEN a field supporting options (Dropdown, Multi Select, Radio, Checkbox) is selected, THE Inspector SHALL display an Options group with four source choices: Manual, Excel Upload, From Master, and From Mapping.
2. WHEN "Manual" is selected, THE Inspector SHALL display an editable list where the Project_Admin can add, reorder, and remove option labels, supporting a maximum of 500 options with each label limited to 200 characters.
3. WHEN the Project_Admin adds a manual option label that is identical to an existing label in the same list (case-insensitive), THE Inspector SHALL prevent the addition and display an error message indicating the duplicate value.
4. WHEN "Excel Upload" is selected, THE Inspector SHALL provide a file upload input accepting .xlsx files up to 5 MB and parse the first column as option values, importing a maximum of 2000 rows.
5. IF the uploaded .xlsx file contains no data in the first column or the file is malformed, THEN THE Inspector SHALL display an error message indicating the parsing failure and retain any previously configured options unchanged.
6. WHEN "From Master" is selected, THE Inspector SHALL provide a selector listing available master data entities and, upon entity selection, a second selector listing that entity's fields to use as option values.
7. WHEN "From Mapping" is selected, THE Inspector SHALL provide a mapping configuration where the Project_Admin selects a parent field from the same form and defines child option sets corresponding to each distinct parent field value.

### Requirement 20: Dependent Dropdown Configuration

**User Story:** As a Project Admin, I want to configure dependent dropdowns where child options change based on parent selection, so that forms support cascading data relationships.

#### Acceptance Criteria

1. WHEN a Dependent Dropdown field is on the Canvas, THE Inspector SHALL display a parent dropdown selector listing all non-dependent Dropdown fields currently on the same Canvas.
2. WHILE a parent Dropdown is assigned, THE Inspector SHALL provide a mapping interface that lists each parent option value and allows the Project_Admin to define between 1 and 200 child options per parent value.
3. WHEN the parent Dropdown field is deleted from the Canvas, THE Form_Builder_Suite SHALL convert the dependent Dropdown to a standard Dropdown retaining its previously mapped child options as a flat list, and SHALL display an inline notification to the Project_Admin indicating which field lost its dependency.
4. WHEN a parent Dropdown's options are modified (added, removed, or renamed) after a dependency mapping exists, THE Form_Builder_Suite SHALL update the mapping interface to reflect the current parent options and remove mappings for deleted parent options.

### Requirement 21: List View Configuration

**User Story:** As a Project Admin, I want to configure List View fields that display tabular data from a data source, so that users can view and select from structured records.

#### Acceptance Criteria

1. WHEN a List View field is selected, THE Inspector SHALL provide configuration for: data source selection (Product Master, Store Master, Custom), filter columns (selectable from data source fields), read-only columns (selectable from data source fields), and editable columns with per-column type configuration.
2. THE Inspector SHALL allow the Project_Admin to define column order and column display labels for the List View.
3. WHEN a data source is selected, THE Inspector SHALL populate available columns from that data source's field definitions.
4. FOR each editable column, THE Inspector SHALL allow the Project_Admin to configure: column type (Text, Number, Dropdown, Alphanumeric, Date), required flag, and type-specific validations (min/max for Number, options for Dropdown).

### Requirement 22: Calculation Formula Builder

**User Story:** As a Project Admin, I want to build calculation formulas referencing other fields, so that computed values are automatically derived at data-entry time.

#### Acceptance Criteria

1. WHEN a Calculation field is selected, THE Inspector SHALL display a formula builder interface containing a formula input area, a list of referenceable numeric fields from the Canvas, and operator buttons for add, subtract, multiply, divide, and parentheses.
2. THE Inspector SHALL allow the Project_Admin to reference other numeric fields by name within the formula expression, inserting each referenced field as a Smart_Value_Pill in the formula input area.
3. THE Inspector SHALL support arithmetic operators (add, subtract, multiply, divide) and parentheses in the formula, with a maximum formula length of 256 characters.
4. IF the formula expression contains a syntax error (unbalanced parentheses, consecutive operators, or trailing operator), THEN THE Inspector SHALL display an inline validation error message indicating the nature of the syntax issue.
5. IF a field referenced in a formula is deleted from the Canvas, THEN THE Form_Builder_Suite SHALL mark the formula as invalid, display an error indicator on the Field_Card, and highlight the broken reference within the formula input area.
6. THE Inspector SHALL provide a result format selector with options: Number, Currency (₹), and Percentage (%).

### Requirement 23: Conditional Logic Blocks

**User Story:** As a Project Admin, I want to configure conditional logic that shows or hides groups of fields based on rules, so that complex branching forms are possible.

#### Acceptance Criteria

1. WHEN a Conditional Logic component is added, THE Canvas SHALL render a logic block container that displays its configured action (Show when / Hide when) and accepts conditions.
2. THE Inspector SHALL allow the Project_Admin to select an action type: "Show when…" or "Hide when…".
3. THE Inspector SHALL allow the Project_Admin to define one or more conditions (source field from fields above on the Canvas, operator: equals/not equals/contains/is empty, and comparison value).
4. WHEN multiple conditions are defined, THE Inspector SHALL combine rules using AND logic (all conditions must be met).
5. IF a source field referenced in a Conditional Logic block's conditions is deleted from the Canvas, THEN THE Form_Builder_Suite SHALL remove the orphaned condition and notify the Project_Admin.

### Requirement 24: File Upload Field Configuration

**User Story:** As a Project Admin, I want to configure file upload fields with constraints, so that field users can attach documents within defined limits.

#### Acceptance Criteria

1. WHEN a File Upload field is selected, THE Inspector SHALL provide configuration for: allowed file types (multi-select from PDF, DOCX, XLSX, JPG, PNG), maximum file size input in megabytes (accepting values from 1 to 25), and maximum file count input (accepting values from 1 to 10).
2. IF the Project_Admin does not specify allowed file types, THEN THE Inspector SHALL default to allowing all supported file types (PDF, DOCX, XLSX, JPG, PNG). IF the Project_Admin does not specify a maximum file size, THEN THE Inspector SHALL default to 10 MB. IF the Project_Admin does not specify a maximum file count, THEN THE Inspector SHALL default to 5 files.
3. IF the Project_Admin enters a maximum file size or maximum file count value outside the allowed range, THEN THE Inspector SHALL display an inline validation error indicating the permitted range and prevent the value from being saved.

### Requirement 25: Undo and Redo

**User Story:** As a Project Admin, I want to undo and redo changes to the form, so that I can recover from mistakes without rebuilding.

#### Acceptance Criteria

1. THE Workspace_Page header SHALL display undo and redo buttons.
2. WHEN the Project_Admin clicks undo, THE Form_Builder_Suite SHALL revert the most recent Canvas change from the Undo_Redo_Stack, where an undoable Canvas change includes: adding a field, deleting a field, duplicating a field, reordering a field, moving a field into or out of a container, and modifying a field property via the Inspector.
3. WHEN the Project_Admin clicks redo, THE Form_Builder_Suite SHALL re-apply the most recently undone change from the Undo_Redo_Stack.
4. THE Undo_Redo_Stack SHALL maintain a maximum of 30 actions; when the limit is reached, the oldest action SHALL be discarded.
5. WHEN no actions are available to undo, THE Form_Builder_Suite SHALL disable the undo button. WHEN no actions are available to redo, THE Form_Builder_Suite SHALL disable the redo button.
6. WHEN the Project_Admin performs a new Canvas change after one or more undo operations, THE Form_Builder_Suite SHALL clear all redo entries from the Undo_Redo_Stack.
7. WHEN the Workspace_Page first loads for a Form_Configuration, THE Form_Builder_Suite SHALL initialize the Undo_Redo_Stack as empty with both undo and redo buttons disabled.

### Requirement 26: Auto-Draft Save

**User Story:** As a Project Admin, I want changes to auto-save as a draft, so that I do not lose work if I navigate away or close the browser.

#### Acceptance Criteria

1. THE Form_Builder_Suite SHALL automatically save the current form state as a draft to local storage after each Canvas modification, with a debounce period of 2 seconds from the last modification before persisting.
2. WHEN a draft save completes successfully, THE Workspace_Page bottom bar SHALL display an "Auto-draft saved" status indicator with a relative timestamp (e.g., "Auto-draft saved a few seconds ago").
3. WHEN the Project_Admin returns to a previously edited Form_Configuration, THE Workspace_Page SHALL restore the auto-draft state.
4. WHEN a Form_Configuration is successfully published, THE Form_Builder_Suite SHALL remove the corresponding auto-draft from local storage.
5. IF the auto-draft save fails due to storage unavailability or quota exceeded, THEN THE Form_Builder_Suite SHALL display a warning indicator in the bottom bar informing the Project_Admin that the draft could not be saved.

### Requirement 27: Save and Publish with Validation

**User Story:** As a Project Admin, I want to validate and publish the form, so that only valid forms become active for field users.

#### Acceptance Criteria

1. THE Workspace_Page SHALL display a "Save & Publish" button in both the header area and the bottom bar.
2. WHEN the Project_Admin clicks "Save & Publish", THE Form_Builder_Suite SHALL disable the button, display a loading indicator, and execute Publish_Validation checks on the form.
3. IF Publish_Validation detects blocking errors (empty field labels, min > max for number fields, min photos > max photos, min entries > max entries for repeat blocks, zero fields), THEN THE Form_Builder_Suite SHALL display the error list in a scrollable panel, highlight the first error, re-enable the "Save & Publish" button, and prevent publishing until all blocking errors are resolved.
4. IF Publish_Validation detects non-blocking warnings (no designations assigned, duplicate labels, conditional visibility with no rules defined), THEN THE Form_Builder_Suite SHALL display the warning list in a confirmation dialog and require the Project_Admin to click "Publish Anyway" to proceed or "Cancel" to return to editing.
5. IF Publish_Validation passes with no errors and no warnings, or the Project_Admin acknowledges warnings, THEN THE Form_Builder_Suite SHALL publish the form, display a success notification showing the form name and field count, and navigate back to the Configurations_List_Page.
6. IF the publish operation fails due to a server or network error, THEN THE Form_Builder_Suite SHALL display an error notification indicating the failure reason, re-enable the "Save & Publish" button, and retain the current form state without navigating away.

### Requirement 28: Workspace Page Header and Navigation

**User Story:** As a Project Admin, I want clear navigation and context in the workspace header, so that I know which form I am editing and can return to the list easily.

#### Acceptance Criteria

1. THE Workspace_Page header SHALL display a "< All Configs" back link that navigates to the Configurations_List_Page at route `/project-admin/[accountCode]/[projectCode]/form-builder`.
2. THE Workspace_Page header SHALL display the form name (editable inline or via settings) and a field count badge showing the total number of fields on the Canvas.
3. THE Workspace_Page header SHALL display action buttons for: undo, redo, refresh, and settings (gear icon opening the Config_Settings_Modal).
4. THE Workspace_Page header SHALL display a "Save & Publish" button in the top-right corner for quick access.
