/**
 * Manager rejection reasons for approval flows (Attendance regularization, Claims,
 * Leave, Visit, Sales). Each flow's config carries one `rejectionReasons` block; the
 * reject dialogs read the combined rules from POST /api/v1/inbox/rejection-reasons.
 */

export interface RejectionReasonOption {
  key: string;
  label: string;
  isActive: boolean;
  displayOrder: number;
  requiresRemarks: boolean;
}

/** Shape stored on the backend and sent in config payloads. */
export interface RejectionReasonsConfig {
  isEnabled: boolean;
  isMandatory: boolean;
  applyToBulkReject: boolean;
  reasonOptions: RejectionReasonOption[];
}

/** Editor row: `originalKey` marks a saved reason, `keyTouched` stops key auto-fill. */
export interface RejectionReasonOptionForm extends RejectionReasonOption {
  uid?: string;
  originalKey?: string;
  keyTouched?: boolean;
}

export interface RejectionReasonsForm {
  isEnabled: boolean;
  isMandatory: boolean;
  applyToBulkReject: boolean;
  reasonOptions: RejectionReasonOptionForm[];
}

export const SAVED_REJECTION_KEY_WARNING =
  "Changing this saved key may affect old records/reporting. Prefer renaming the label.";
export const REJECTION_REASONS_NO_ACTIVE_ERROR = "Add at least one active reason.";
export const REJECTION_REASON_KEY_PATTERN = /^[a-z0-9_]+$/;
export const REJECTION_REASON_KEY_MAX = 64;
export const REJECTION_REASON_LABEL_MAX = 120;

export const DEFAULT_REJECTION_REASON_OPTIONS: RejectionReasonOption[] = [
  { key: "insufficient_proof", label: "Insufficient proof", isActive: true, displayOrder: 1, requiresRemarks: false },
  { key: "time_mismatch", label: "Time doesn’t match records", isActive: true, displayOrder: 2, requiresRemarks: false },
  { key: "outside_geofence", label: "Outside store geo-fence", isActive: true, displayOrder: 3, requiresRemarks: false },
  { key: "duplicate_request", label: "Duplicate request", isActive: true, displayOrder: 4, requiresRemarks: false },
  { key: "other", label: "Other", isActive: true, displayOrder: 5, requiresRemarks: true },
];

let uidCounter = 0;
function newUid(): string {
  uidCounter += 1;
  return `rr_new_${uidCounter}`;
}

export function emptyRejectionReasons(): RejectionReasonsForm {
  return { isEnabled: false, isMandatory: true, applyToBulkReject: true, reasonOptions: [] };
}

/** Forgiving parser for API data: missing or malformed values become the OFF default. */
export function normalizeRejectionReasonsDto(raw: unknown): RejectionReasonsConfig {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const options = Array.isArray(source.reasonOptions) ? source.reasonOptions : [];
  return {
    isEnabled: source.isEnabled === true,
    isMandatory: source.isMandatory !== false,
    applyToBulkReject: source.applyToBulkReject !== false,
    reasonOptions: options
      .map((item) => {
        const option = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const order = Number(option.displayOrder);
        return {
          key: String(option.key ?? "").trim(),
          label: String(option.label ?? "").trim(),
          isActive: option.isActive !== false,
          displayOrder: Number.isFinite(order) ? order : 0,
          requiresRemarks: option.requiresRemarks === true,
        };
      })
      .map((option, index) => ({ option, index }))
      .sort((a, b) => a.option.displayOrder - b.option.displayOrder || a.index - b.index)
      .map(({ option }) => option),
  };
}

/** API value to editor value. Saved rows keep their key unless the admin edits it. */
export function rejectionReasonsToForm(raw: unknown): RejectionReasonsForm {
  const config = normalizeRejectionReasonsDto(raw);
  return {
    ...config,
    reasonOptions: config.reasonOptions.map((option, index) => ({
      ...option,
      uid: `saved_${index}_${option.key}`,
      originalKey: option.key,
      keyTouched: true,
    })),
  };
}

/**
 * Editor value to API payload. Rows are ordered by the Order column (ties keep row
 * position) and renumbered 1..n; editor-only fields are dropped.
 */
export function rejectionReasonsToDto(form?: RejectionReasonsForm | null): RejectionReasonsConfig {
  const value = form ?? emptyRejectionReasons();
  const rows = value.reasonOptions
    .filter((option) => {
      const label = option.label.trim();
      const key = option.key.trim();
      if (!label && !key) return false;
      // A hidden (toggle OFF) list must not block saving with half-filled rows.
      if (!value.isEnabled && (!label || !key)) return false;
      return true;
    })
    .map((option, index) => ({ option, index }))
    .sort((a, b) => (Number(a.option.displayOrder) || 0) - (Number(b.option.displayOrder) || 0) || a.index - b.index)
    .map(({ option }) => option);
  return {
    isEnabled: value.isEnabled,
    isMandatory: value.isMandatory,
    applyToBulkReject: value.applyToBulkReject,
    reasonOptions: rows.map((option, index) => ({
      key: option.key.trim(),
      label: option.label.trim(),
      isActive: option.isActive,
      displayOrder: index + 1,
      requiresRemarks: option.requiresRemarks,
    })),
  };
}

/** After a save that does not reload the form, treat every row as saved. */
export function markRejectionReasonsSaved(form?: RejectionReasonsForm | null): RejectionReasonsForm {
  const value = form ?? emptyRejectionReasons();
  return {
    ...value,
    reasonOptions: value.reasonOptions.map((option) => ({
      ...option,
      key: option.key.trim(),
      originalKey: option.key.trim(),
      keyTouched: true,
    })),
  };
}

export function slugifyReasonKey(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, REJECTION_REASON_KEY_MAX);
}

export function createRejectionReasonOption(count: number): RejectionReasonOptionForm {
  return {
    uid: newUid(),
    key: "",
    label: "",
    isActive: true,
    displayOrder: count + 1,
    requiresRemarks: false,
    keyTouched: false,
  };
}

/** Key follows the label only on a new row whose key the admin has not typed. */
export function withLabel(option: RejectionReasonOptionForm, label: string): RejectionReasonOptionForm {
  const autoFill = !option.originalKey && !option.keyTouched;
  return { ...option, label, ...(autoFill ? { key: slugifyReasonKey(label) } : {}) };
}

/** Typing a key stops auto-fill; clearing it turns auto-fill back on for new rows. */
export function withKey(option: RejectionReasonOptionForm, raw: string): RejectionReasonOptionForm {
  const key = raw
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, REJECTION_REASON_KEY_MAX);
  return { ...option, key, keyTouched: key !== "" };
}

export function moveRejectionReason<T extends RejectionReasonOption>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next.map((option, i) => ({ ...option, displayOrder: i + 1 }));
}

export function hasMissingDefaultReasons(list: RejectionReasonOption[]): boolean {
  const keys = new Set(list.map((option) => option.key.trim()));
  return DEFAULT_REJECTION_REASON_OPTIONS.some((option) => !keys.has(option.key));
}

/** Appends defaults whose key is not in the list yet; existing rows are never replaced. */
export function addMissingDefaultReasons(list: RejectionReasonOptionForm[]): RejectionReasonOptionForm[] {
  const keys = new Set(list.map((option) => option.key.trim()));
  const added = DEFAULT_REJECTION_REASON_OPTIONS.filter((option) => !keys.has(option.key)).map((option) => ({
    ...option,
    uid: newUid(),
    keyTouched: true,
  }));
  return [...list, ...added].map((option, i) => ({ ...option, displayOrder: i + 1 }));
}

export function isSavedKeyChanged(option: RejectionReasonOptionForm): boolean {
  return Boolean(option.originalKey) && option.key.trim() !== option.originalKey;
}

/** Save-blocking messages for one list; empty when the dropdown is off. */
export function validateRejectionReasons(form?: RejectionReasonsForm | null): string[] {
  if (!form?.isEnabled) return [];
  const errors: string[] = [];
  const rows = form.reasonOptions;
  if (!rows.some((option) => option.isActive)) {
    errors.push(REJECTION_REASONS_NO_ACTIVE_ERROR);
  }
  if (rows.some((option) => !option.label.trim())) {
    errors.push("Every rejection reason needs a label.");
  }
  if (rows.some((option) => !option.key.trim())) {
    errors.push("Every rejection reason needs a key.");
  }
  const badKeys = rows
    .map((option) => option.key.trim())
    .filter((key) => key && !REJECTION_REASON_KEY_PATTERN.test(key));
  if (badKeys.length) {
    errors.push(`Reason keys can use lowercase letters, numbers and underscores only: ${badKeys.join(", ")}`);
  }
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const option of rows) {
    const key = option.key.trim();
    if (!key) continue;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  if (duplicates.size) {
    errors.push(`Duplicate reason key: ${[...duplicates].join(", ")}`);
  }
  return errors;
}

// ─── Reject dialog rules ─────────────────────────────────────────────────────

export interface RejectionReasonChoice {
  key: string;
  label: string;
  requiresRemarks: boolean;
}

export interface RejectionReasonLookupItem {
  inboxItemId: string;
  module: string;
  requestType: string;
  isEnabled: boolean;
  isMandatory: boolean;
  applyToBulkReject: boolean;
  reasonOptions: RejectionReasonChoice[];
}

/** Response of POST /api/v1/inbox/rejection-reasons. */
export interface RejectionReasonLookup {
  showReasonDropdown: boolean;
  reasonRequired: boolean;
  remarksAlwaysRequired: boolean;
  reasonOptions: RejectionReasonChoice[];
  bulkBlockedItemIds: string[];
  items: RejectionReasonLookupItem[];
  unavailableItemIds: string[];
}

/** Used when the backend has no lookup yet: today's dialog (no dropdown, remarks required). */
export const LEGACY_REJECTION_LOOKUP: RejectionReasonLookup = {
  showReasonDropdown: false,
  reasonRequired: false,
  remarksAlwaysRequired: true,
  reasonOptions: [],
  bulkBlockedItemIds: [],
  items: [],
  unavailableItemIds: [],
};

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function choices(value: unknown): RejectionReasonChoice[] {
  return (Array.isArray(value) ? value : [])
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : {}))
    .filter((item) => item.key)
    .map((item) => ({
      key: String(item.key),
      label: String(item.label ?? item.key),
      requiresRemarks: item.requiresRemarks === true,
    }));
}

export function normalizeRejectionReasonLookup(raw: unknown): RejectionReasonLookup {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    showReasonDropdown: source.showReasonDropdown === true,
    reasonRequired: source.reasonRequired === true,
    remarksAlwaysRequired: source.remarksAlwaysRequired !== false,
    reasonOptions: choices(source.reasonOptions),
    bulkBlockedItemIds: stringList(source.bulkBlockedItemIds),
    items: (Array.isArray(source.items) ? source.items : []).map((item) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        inboxItemId: String(row.inboxItemId ?? ""),
        module: String(row.module ?? ""),
        requestType: String(row.requestType ?? ""),
        isEnabled: row.isEnabled === true,
        isMandatory: row.isMandatory !== false,
        applyToBulkReject: row.applyToBulkReject !== false,
        reasonOptions: choices(row.reasonOptions),
      };
    }),
    unavailableItemIds: stringList(source.unavailableItemIds),
  };
}

export const REJECT_REASON_LISTS_DIFFER =
  "These requests use different rejection reason lists. Reject them separately or select requests from one module.";
export const REJECT_REASONS_NOT_CONFIGURED =
  "No rejection reason is available for this request. Ask your admin to check its reason list.";

export function bulkBlockedNote(count: number): string {
  return count === 1
    ? "1 request needs its own reason. Reject it separately."
    : `${count} requests need their own reason. Reject them one by one.`;
}

export interface RejectRules {
  showDropdown: boolean;
  reasonRequired: boolean;
  options: RejectionReasonChoice[];
  selectedOption?: RejectionReasonChoice;
  remarksRequired: boolean;
  /** Ids to send in the reject call (blocked and unavailable ids removed). */
  rejectIds: string[];
  skippedIds: string[];
  blockedNote?: string;
  /** Set when the dialog cannot submit at all. */
  blockedMessage?: string;
}

export function resolveRejectRules(
  lookup: RejectionReasonLookup,
  selectedKey: string,
  selectedIds: string[],
): RejectRules {
  const skipped = new Set([...lookup.bulkBlockedItemIds, ...lookup.unavailableItemIds]);
  const rejectIds = selectedIds.filter((id) => !skipped.has(id));
  const skippedIds = selectedIds.filter((id) => skipped.has(id));
  const options = lookup.reasonOptions;
  const selectedOption = options.find((option) => option.key === selectedKey);
  const showDropdown = lookup.showReasonDropdown && options.length > 0;
  const remarksRequired =
    !lookup.showReasonDropdown || lookup.remarksAlwaysRequired || Boolean(selectedOption?.requiresRemarks);

  let blockedMessage: string | undefined;
  if (rejectIds.length === 0) {
    blockedMessage =
      lookup.bulkBlockedItemIds.length > 0
        ? bulkBlockedNote(lookup.bulkBlockedItemIds.length)
        : "These requests are no longer waiting for your approval.";
  } else if (lookup.reasonRequired && options.length === 0) {
    blockedMessage = selectedIds.length > 1 ? REJECT_REASON_LISTS_DIFFER : REJECT_REASONS_NOT_CONFIGURED;
  }

  return {
    showDropdown,
    reasonRequired: lookup.reasonRequired,
    options,
    selectedOption,
    remarksRequired,
    rejectIds,
    skippedIds,
    blockedNote: lookup.bulkBlockedItemIds.length > 0 && rejectIds.length > 0
      ? bulkBlockedNote(lookup.bulkBlockedItemIds.length)
      : undefined,
    blockedMessage,
  };
}
