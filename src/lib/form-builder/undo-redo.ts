import { FormField } from "./types";

const MAX_STACK_SIZE = 30;

/**
 * Pushes the current fields snapshot onto the undo stack.
 * Trims from the front if stack exceeds 30 entries.
 */
export function pushUndo(
  undoStack: FormField[][],
  currentFields: FormField[]
): FormField[][] {
  const newStack = [...undoStack, [...currentFields]];
  if (newStack.length > MAX_STACK_SIZE) {
    return newStack.slice(newStack.length - MAX_STACK_SIZE);
  }
  return newStack;
}

/**
 * Clears the redo stack. Returns an empty array.
 */
export function clearRedo(): FormField[][] {
  return [];
}

/**
 * Performs an undo operation.
 * Pops the last entry from undoStack, pushes currentFields to redoStack.
 * Returns null if undoStack is empty.
 */
export function performUndo(
  undoStack: FormField[][],
  redoStack: FormField[][],
  currentFields: FormField[]
): { undoStack: FormField[][]; redoStack: FormField[][]; fields: FormField[] } | null {
  if (undoStack.length === 0) {
    return null;
  }

  const newUndoStack = [...undoStack];
  const previousFields = newUndoStack.pop()!;
  const newRedoStack = [...redoStack, [...currentFields]];

  return {
    undoStack: newUndoStack,
    redoStack: newRedoStack,
    fields: previousFields,
  };
}

/**
 * Performs a redo operation.
 * Pops the last entry from redoStack, pushes currentFields to undoStack.
 * Returns null if redoStack is empty.
 */
export function performRedo(
  undoStack: FormField[][],
  redoStack: FormField[][],
  currentFields: FormField[]
): { undoStack: FormField[][]; redoStack: FormField[][]; fields: FormField[] } | null {
  if (redoStack.length === 0) {
    return null;
  }

  const newRedoStack = [...redoStack];
  const nextFields = newRedoStack.pop()!;
  const newUndoStack = [...undoStack, [...currentFields]];

  return {
    undoStack: newUndoStack,
    redoStack: newRedoStack,
    fields: nextFields,
  };
}

/**
 * Returns whether the undo stack has entries.
 */
export function canUndo(undoStack: FormField[][]): boolean {
  return undoStack.length > 0;
}

/**
 * Returns whether the redo stack has entries.
 */
export function canRedo(redoStack: FormField[][]): boolean {
  return redoStack.length > 0;
}
