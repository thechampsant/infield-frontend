import type { FormField } from "./types";

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
export function saveDraft(configId: string, fields: FormField[]): boolean {
  try {
    const key = getDraftKey(configId);
    localStorage.setItem(key, JSON.stringify(fields));
    return true;
  } catch {
    return false;
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
export function clearDraft(configId: string, expectedFields?: FormField[]): void {
  try {
    const key = getDraftKey(configId);
    if (expectedFields && localStorage.getItem(key) !== JSON.stringify(expectedFields)) return;
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
  delayMs: number = 2000,
  onSave?: (saved: boolean) => void,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: FormField[] | null = null;

  function flush() {
    clearTimeout(timer);
    if (pending === null) return;
    const saved = saveDraft(configId, pending);
    if (saved) pending = null;
    onSave?.(saved);
  }

  function schedule(fields: FormField[]) {
    clearTimeout(timer);
    pending = fields;
    timer = setTimeout(flush, delayMs);
  }

  function published(fields: FormField[]) {
    if (pending === fields) {
      clearTimeout(timer);
      pending = null;
    }
    clearDraft(configId, fields);
  }

  return Object.assign(schedule, { flush, published });
}
