import { FormField } from "./types";

/**
 * Generates the localStorage key for a given config ID.
 */
function getDraftKey(configId: string): string {
  return `form-builder-draft-${configId}`;
}

/**
 * Saves the current fields array to localStorage as JSON.
 * Handles localStorage unavailability gracefully.
 */
export function saveDraft(configId: string, fields: FormField[]): void {
  try {
    const key = getDraftKey(configId);
    localStorage.setItem(key, JSON.stringify(fields));
  } catch {
    // localStorage unavailable or quota exceeded — fail silently
  }
}

/**
 * Loads a draft from localStorage.
 * Returns null if not found, corrupted, or localStorage unavailable.
 */
export function loadDraft(configId: string): FormField[] | null {
  try {
    const key = getDraftKey(configId);
    const data = localStorage.getItem(key);
    if (data === null) {
      return null;
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed as FormField[];
  } catch {
    // JSON parse error or localStorage unavailable
    return null;
  }
}

/**
 * Removes the draft from localStorage.
 * Handles localStorage unavailability gracefully.
 */
export function clearDraft(configId: string): void {
  try {
    const key = getDraftKey(configId);
    localStorage.removeItem(key);
  } catch {
    // localStorage unavailable — fail silently
  }
}

/**
 * Creates a debounced save function that calls saveDraft after the specified delay.
 * Uses setTimeout/clearTimeout pattern. Default delay is 2000ms.
 */
export function createDebouncedSave(
  configId: string,
  delayMs: number = 2000
): (fields: FormField[]) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (fields: FormField[]) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      saveDraft(configId, fields);
      timeoutId = null;
    }, delayMs);
  };
}
