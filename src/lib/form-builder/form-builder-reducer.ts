import type {
  FormBuilderState,
  FormBuilderAction,
  FormField,
  ComponentType,
} from "./types";
import { getComponentDefinition } from "./constants";

// ─── Constants ────────────────────────────────────────────────────────────

const MAX_UNDO_STACK = 30;

// ─── Helper: Create Default Field ─────────────────────────────────────────

function createDefaultField(
  componentType: ComponentType,
  order: number,
  parentId: string | null
): FormField {
  const definition = getComponentDefinition(componentType);
  const label = `Untitled ${definition?.name ?? componentType}`;

  return {
    id: crypto.randomUUID(),
    type: componentType,
    label,
    helpText: "",
    parentId,
    order,

    // Visibility
    visibility: "always",
    visibilityRules: [],

    // Pre-fill & Read-only
    readOnly: false,
    prefillSource: null,
    prefillField: "",
    prefillCustomValue: "",

    // Validation
    required: "no",
    requiredRules: [],
    typeConfig: {},

    // Options
    optionsSource: null,
    manualOptions: [],
    excelOptionsCount: 0,
    masterEntity: "",
    masterField: "",
    mappingParentField: "",

    // Data Source
    dataSource: null,

    // Formula
    formula: "",
    formulaResultFormat: "number",

    // Layout-specific
    sectionLabel: componentType === "section-group" ? "Section" : "",
    addMoreLabel: componentType === "add-more-block" ? "Add More" : "",
    addMoreMin: 1,
    addMoreMax: 5,

    // Toggle-specific
    toggleOnLabel: "Yes",
    toggleOffLabel: "No",

    // Conditional Logic
    conditionAction: "show",
    conditionRules: [],
  };
}

// ─── Helper: Renumber Fields ──────────────────────────────────────────────

/**
 * Assigns sequential order numbers (0-based) grouped by parentId.
 * Top-level fields (parentId === null) get 0, 1, 2...
 * Children of each parent get their own 0, 1, 2...
 */
export function renumberFields(fields: FormField[]): FormField[] {
  // Group fields by parentId
  const groups = new Map<string | null, FormField[]>();

  for (const field of fields) {
    const key = field.parentId;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(field);
  }

  // Sort each group by current order and assign sequential numbers
  const result: FormField[] = [];

  for (const [, group] of groups) {
    group.sort((a, b) => a.order - b.order);
    group.forEach((field, index) => {
      result.push({ ...field, order: index });
    });
  }

  return result;
}

// ─── Helper: Push to Undo Stack ───────────────────────────────────────────

function pushUndo(
  state: FormBuilderState,
  currentFields: FormField[]
): { undoStack: FormField[][]; redoStack: FormField[][] } {
  const undoStack = [...state.undoStack, currentFields];
  // Cap at MAX_UNDO_STACK entries (FIFO discard oldest)
  if (undoStack.length > MAX_UNDO_STACK) {
    undoStack.shift();
  }
  return { undoStack, redoStack: [] };
}

// ─── Helper: Get Active Fields ────────────────────────────────────────────

function getActiveFields(state: FormBuilderState): FormField[] {
  const config = state.configurations.find(
    (c) => c.id === state.activeConfigId
  );
  return config?.fields ?? [];
}

// ─── Helper: Update Active Config Fields ──────────────────────────────────

function updateActiveConfigFields(
  state: FormBuilderState,
  fields: FormField[]
): FormConfiguration[] {
  return state.configurations.map((c) =>
    c.id === state.activeConfigId
      ? { ...c, fields, updatedAt: new Date().toISOString() }
      : c
  );
}

// We need to import FormConfiguration for the helper above
import type { FormConfiguration } from "./types";

// ─── Helper: Remove Orphan References ─────────────────────────────────────

function removeOrphanReferences(
  fields: FormField[],
  deletedFieldId: string
): FormField[] {
  return fields.map((field) => ({
    ...field,
    visibilityRules: field.visibilityRules.filter(
      (rule) => rule.sourceFieldId !== deletedFieldId
    ),
    requiredRules: field.requiredRules.filter(
      (rule) => rule.sourceFieldId !== deletedFieldId
    ),
    conditionRules: field.conditionRules.filter(
      (rule) => rule.sourceFieldId !== deletedFieldId
    ),
  }));
}

// ─── Initial State ────────────────────────────────────────────────────────

export const initialFormBuilderState: FormBuilderState = {
  configurations: [],
  activeConfigId: null,
  selectedFieldId: null,
  dragState: null,
  undoStack: [],
  redoStack: [],
  draftStatus: "idle",
  lastSavedAt: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────

export function formBuilderReducer(
  state: FormBuilderState,
  action: FormBuilderAction
): FormBuilderState {
  switch (action.type) {
    case "ADD_FIELD": {
      const currentFields = getActiveFields(state);
      const { undoStack, redoStack } = pushUndo(state, currentFields);

      // Determine insertion position
      const topLevelFields = currentFields.filter(
        (f) => f.parentId === (action.parentId ?? null)
      );
      const insertOrder =
        action.atIndex !== undefined
          ? action.atIndex
          : topLevelFields.length;

      const newField = createDefaultField(
        action.componentType,
        insertOrder,
        action.parentId ?? null
      );

      // Shift fields at or after the insertion index
      const updatedFields = currentFields.map((f) => {
        if (
          f.parentId === (action.parentId ?? null) &&
          f.order >= insertOrder
        ) {
          return { ...f, order: f.order + 1 };
        }
        return f;
      });

      const allFields = renumberFields([...updatedFields, newField]);
      const configurations = updateActiveConfigFields(state, allFields);

      return {
        ...state,
        configurations,
        selectedFieldId: newField.id,
        undoStack,
        redoStack,
      };
    }

    case "ADD_API_FIELD": {
      const currentFields = getActiveFields(state);
      const { undoStack, redoStack } = pushUndo(state, currentFields);

      const allFields = [...currentFields, action.field];
      const configurations = updateActiveConfigFields(state, allFields);

      return {
        ...state,
        configurations,
        selectedFieldId: action.field.id,
        undoStack,
        redoStack,
      };
    }

    case "DELETE_FIELD": {
      const currentFields = getActiveFields(state);
      const { undoStack, redoStack } = pushUndo(state, currentFields);

      // Remove the field and its children
      const fieldToDelete = currentFields.find(
        (f) => f.id === action.fieldId
      );
      if (!fieldToDelete) return state;

      // Collect IDs to delete: the field itself + any children
      const idsToDelete = new Set<string>([action.fieldId]);
      currentFields
        .filter((f) => f.parentId === action.fieldId)
        .forEach((child) => idsToDelete.add(child.id));

      let remainingFields = currentFields.filter(
        (f) => !idsToDelete.has(f.id)
      );

      // Clean up orphan references in other fields
      for (const deletedId of idsToDelete) {
        remainingFields = removeOrphanReferences(remainingFields, deletedId);
      }

      const allFields = renumberFields(remainingFields);
      const configurations = updateActiveConfigFields(state, allFields);

      // Deselect if deleted field was selected
      const selectedFieldId = idsToDelete.has(state.selectedFieldId ?? "")
        ? null
        : state.selectedFieldId;

      return {
        ...state,
        configurations,
        selectedFieldId,
        undoStack,
        redoStack,
      };
    }

    case "DUPLICATE_FIELD": {
      const currentFields = getActiveFields(state);
      const { undoStack, redoStack } = pushUndo(state, currentFields);

      const originalField = currentFields.find(
        (f) => f.id === action.fieldId
      );
      if (!originalField) return state;

      const duplicateField: FormField = {
        ...originalField,
        id: crypto.randomUUID(),
        label: `${originalField.label} (Copy)`,
        order: originalField.order + 1,
      };

      // Shift fields after the original
      const updatedFields = currentFields.map((f) => {
        if (
          f.parentId === originalField.parentId &&
          f.order > originalField.order
        ) {
          return { ...f, order: f.order + 1 };
        }
        return f;
      });

      const allFields = renumberFields([...updatedFields, duplicateField]);
      const configurations = updateActiveConfigFields(state, allFields);

      return {
        ...state,
        configurations,
        selectedFieldId: duplicateField.id,
        undoStack,
        redoStack,
      };
    }

    case "MOVE_FIELD": {
      const currentFields = getActiveFields(state);
      const { undoStack, redoStack } = pushUndo(state, currentFields);

      const fieldToMove = currentFields.find(
        (f) => f.id === action.fieldId
      );
      if (!fieldToMove) return state;

      // Update the field's parentId and order
      const updatedFields = currentFields.map((f) => {
        if (f.id === action.fieldId) {
          return {
            ...f,
            parentId: action.toParentId,
            order: action.toIndex,
          };
        }
        return f;
      });

      const allFields = renumberFields(updatedFields);
      const configurations = updateActiveConfigFields(state, allFields);

      return {
        ...state,
        configurations,
        undoStack,
        redoStack,
      };
    }

    case "UPDATE_FIELD": {
      const currentFields = getActiveFields(state);
      const { undoStack, redoStack } = pushUndo(state, currentFields);

      const updatedFields = currentFields.map((f) => {
        if (f.id === action.fieldId) {
          return { ...f, ...action.changes };
        }
        return f;
      });

      const configurations = updateActiveConfigFields(state, updatedFields);

      return {
        ...state,
        configurations,
        undoStack,
        redoStack,
      };
    }

    case "SELECT_FIELD": {
      return {
        ...state,
        selectedFieldId: action.fieldId,
      };
    }

    case "SET_DRAG_STATE": {
      return {
        ...state,
        dragState: action.dragState,
      };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state;

      const currentFields = getActiveFields(state);
      const previousFields = state.undoStack[state.undoStack.length - 1];
      const undoStack = state.undoStack.slice(0, -1);
      const redoStack = [...state.redoStack, currentFields];

      const configurations = updateActiveConfigFields(state, previousFields);

      return {
        ...state,
        configurations,
        undoStack,
        redoStack,
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;

      const currentFields = getActiveFields(state);
      const nextFields = state.redoStack[state.redoStack.length - 1];
      const redoStack = state.redoStack.slice(0, -1);
      const undoStack = [...state.undoStack, currentFields];

      const configurations = updateActiveConfigFields(state, nextFields);

      return {
        ...state,
        configurations,
        undoStack,
        redoStack,
      };
    }

    case "LOAD_CONFIG": {
      const existingIndex = state.configurations.findIndex(
        (c) => c.id === action.config.id
      );
      const configurations =
        existingIndex >= 0
          ? state.configurations.map((c) =>
              c.id === action.config.id ? action.config : c
            )
          : [...state.configurations, action.config];

      return {
        ...state,
        configurations,
        activeConfigId: action.config.id,
        selectedFieldId: null,
        undoStack: [],
        redoStack: [],
      };
    }

    case "SET_DRAFT_STATUS": {
      return {
        ...state,
        draftStatus: action.status,
        lastSavedAt:
          action.status === "saved"
            ? new Date().toISOString()
            : state.lastSavedAt,
      };
    }

    default:
      return state;
  }
}
