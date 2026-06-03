/**
 * Defensive parsing for list endpoints where the live API may return:
 * - a bare array in `data`
 * - `{ roles: [...] }` / `{ items: [...] }` (bulk create response shapes)
 * - double-nested `data` arrays
 */

export function normalizeListResponse<T = unknown>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];

  if (!raw || typeof raw !== "object") return [];

  const record = raw as Record<string, unknown>;

  for (const key of ["roles", "items", "data", "results"] as const) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }

  return [];
}
