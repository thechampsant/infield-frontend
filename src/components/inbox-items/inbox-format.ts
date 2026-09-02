/**
 * Inbox display formatting helpers.
 * Replicates the metadata-driven formatting rules used across inbox clients.
 */

import type {
  InboxDisplayField,
  InboxDisplaySection,
} from "@/lib/api/inbox-items-service";

// ─── Time ago ─────────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Date formatters ──────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDateDDMMYYYY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// ─── Module label ─────────────────────────────────────────────────────────

export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Humanize keys (camelCase / snake_case → Title Case) ───────────────────

export function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// ─── Image detection & URL resolution ──────────────────────────────────────

// Matches an image extension, optionally followed by a query string.
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?.*)?$/i;

export function isImagePath(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return IMAGE_EXT_RE.test(value) && value.includes("/");
}

// ─── Data type guessing (for fallback fields) ──────────────────────────────

export function guessDataType(value: unknown): string {
  if (Array.isArray(value)) return "image";
  if (isImagePath(value)) return "image";
  return "text";
}

// ─── Value formatting by dataType ──────────────────────────────────────────

/**
 * Returns a formatted string for non-image field values.
 * Image/file/attachment values are handled separately by the renderer.
 */
export function formatFieldValue(value: unknown, dataType: string): string {
  if (value === null || value === undefined || value === "") return "—";

  switch (dataType) {
    case "currency": {
      const num = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(num)) return String(value);
      return `₹${num.toFixed(2)}`;
    }
    case "number":
      return String(value);
    case "boolean": {
      const truthy = value === true || value === "true";
      return truthy ? "Yes" : "No";
    }
    case "date":
      return formatDateDDMMYYYY(String(value));
    case "datetime":
      return formatDateTime(String(value));
    default:
      return String(value);
  }
}

// ─── Resolved field for rendering ──────────────────────────────────────────

export interface ResolvedField {
  fieldKey: string;
  label: string;
  dataType: string;
  displayOrder: number;
  value: unknown;
  isImage: boolean;
}

/**
 * Builds the ordered list of fields to render from displayMetadata + moduleData.
 *
 * - Uses sections with sectionType === "fields", flattened + sorted by displayOrder.
 * - Appends extra moduleData keys (no field definition) as fallback fields (order 999).
 * - If no field sections exist at all, renders raw moduleData as fallback.
 */
export function resolveFields(
  sections: InboxDisplaySection[],
  moduleData: Record<string, unknown>
): ResolvedField[] {
  const fieldSections = sections.filter((s) => s.sectionType === "fields");

  // No field sections → fallback: raw moduleData
  if (fieldSections.length === 0) {
    return Object.entries(moduleData).map(([key, value], idx) => {
      const dataType = guessDataType(value);
      return {
        fieldKey: key,
        label: humanizeKey(key),
        dataType,
        displayOrder: idx,
        value,
        isImage: dataType === "image",
      };
    });
  }

  // Flatten defined fields
  const definedFields: InboxDisplayField[] = fieldSections
    .flatMap((s) => s.fields ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const definedKeys = new Set(definedFields.map((f) => f.fieldKey));

  const resolved: ResolvedField[] = definedFields.map((f) => {
    const value = moduleData[f.fieldKey];
    const isImage =
      f.dataType === "image" ||
      f.dataType === "file" ||
      f.dataType === "attachment" ||
      isImagePath(value) ||
      (Array.isArray(value) && value.some(isImagePath));
    return {
      fieldKey: f.fieldKey,
      label: f.label,
      dataType: f.dataType,
      displayOrder: f.displayOrder,
      value,
      isImage,
    };
  });

  // Append fallback fields for extra moduleData keys
  Object.entries(moduleData).forEach(([key, value]) => {
    if (definedKeys.has(key)) return;
    const dataType = guessDataType(value);
    resolved.push({
      fieldKey: key,
      label: humanizeKey(key),
      dataType,
      displayOrder: 999,
      value,
      isImage: dataType === "image",
    });
  });

  return resolved.sort((a, b) => a.displayOrder - b.displayOrder);
}

// ─── Status color parsing ──────────────────────────────────────────────────

export interface BadgeStyle {
  bg: string;
  border: string;
  color: string;
}

/**
 * Parse a hex color into a badge style: 10% fill / 40% border / full text.
 */
export function hexToBadgeStyle(hex?: string): BadgeStyle {
  if (!hex || !/^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(hex)) {
    return { bg: "#f1f5f9", border: "#cbd5e1", color: "#64748b" };
  }
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.1)`,
    border: `rgba(${r}, ${g}, ${b}, 0.4)`,
    color: hex,
  };
}

// ─── Action color mapping ──────────────────────────────────────────────────

export type ActionTone = "success" | "danger" | "warning" | "primary";

export function actionTone(color?: string): ActionTone {
  const c = (color ?? "").toLowerCase();
  if (c === "green") return "success";
  if (c === "red") return "danger";
  if (c === "yellow" || c === "orange") return "warning";
  return "primary";
}

const TONE_HEX: Record<ActionTone, string> = {
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  primary: "#4f46e5",
};

export function toneColor(tone: ActionTone): string {
  return TONE_HEX[tone];
}
