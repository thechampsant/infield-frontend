import { describe, expect, it } from "vitest";
import {
  DEFAULT_REJECTION_REASON_OPTIONS,
  LEGACY_REJECTION_LOOKUP,
  REJECTION_REASONS_NO_ACTIVE_ERROR,
  REJECT_REASON_LISTS_DIFFER,
  addMissingDefaultReasons,
  createRejectionReasonOption,
  emptyRejectionReasons,
  hasMissingDefaultReasons,
  isSavedKeyChanged,
  markRejectionReasonsSaved,
  moveRejectionReason,
  normalizeRejectionReasonLookup,
  rejectionReasonsToDto,
  rejectionReasonsToForm,
  resolveRejectRules,
  slugifyReasonKey,
  validateRejectionReasons,
  withKey,
  withLabel,
  type RejectionReasonLookup,
} from "./rejection-reasons";

describe("rejection reasons config", () => {
  it("reads a missing or malformed setting as OFF (AC1)", () => {
    expect(rejectionReasonsToForm(undefined)).toEqual(emptyRejectionReasons());
    expect(rejectionReasonsToForm("legacy")).toEqual(emptyRejectionReasons());
    expect(emptyRejectionReasons().isEnabled).toBe(false);
  });

  it("sorts saved rows by display order and marks them saved", () => {
    const form = rejectionReasonsToForm({
      isEnabled: true,
      reasonOptions: [
        { key: "other", label: "Other", displayOrder: 2, requiresRemarks: true },
        { key: "insufficient_proof", label: "Insufficient proof", displayOrder: 1 },
      ],
    });

    expect(form.reasonOptions.map((option) => option.key)).toEqual(["insufficient_proof", "other"]);
    expect(form.reasonOptions[0]).toEqual(
      expect.objectContaining({ originalKey: "insufficient_proof", keyTouched: true, isActive: true }),
    );
  });

  it("round-trips to the API shape, numbering rows by position (AC4)", () => {
    const form = rejectionReasonsToForm({
      isEnabled: true,
      isMandatory: false,
      reasonOptions: [
        { key: "a", label: "A", displayOrder: 1 },
        { key: "b", label: "B", displayOrder: 2 },
      ],
    });
    const moved = { ...form, reasonOptions: moveRejectionReason(form.reasonOptions, 1, -1) };

    expect(rejectionReasonsToDto(moved)).toEqual({
      isEnabled: true,
      isMandatory: false,
      applyToBulkReject: true,
      reasonOptions: [
        { key: "b", label: "B", isActive: true, displayOrder: 1, requiresRemarks: false },
        { key: "a", label: "A", isActive: true, displayOrder: 2, requiresRemarks: false },
      ],
    });
  });

  it("orders by a typed Order value before renumbering", () => {
    const form = rejectionReasonsToForm({
      isEnabled: true,
      reasonOptions: [
        { key: "a", label: "A", displayOrder: 1 },
        { key: "b", label: "B", displayOrder: 2 },
        { key: "c", label: "C", displayOrder: 3 },
      ],
    });
    form.reasonOptions[0] = { ...form.reasonOptions[0], displayOrder: 9 };

    expect(rejectionReasonsToDto(form).reasonOptions.map((option) => [option.key, option.displayOrder])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });

  it("drops blank rows, and half-filled rows while the toggle is off", () => {
    const rows = [
      { ...createRejectionReasonOption(0) },
      { ...createRejectionReasonOption(1), label: "Only label" },
      { ...createRejectionReasonOption(2), label: "Full", key: "full" },
    ];

    expect(rejectionReasonsToDto({ ...emptyRejectionReasons(), reasonOptions: rows }).reasonOptions).toHaveLength(1);
    expect(
      rejectionReasonsToDto({ ...emptyRejectionReasons(), isEnabled: true, reasonOptions: rows }).reasonOptions,
    ).toHaveLength(2);
  });

  it("auto-fills the key from the label on a new row only (AC2)", () => {
    let row = createRejectionReasonOption(0);
    row = withLabel(row, "Wrong amount");
    expect(row.key).toBe("wrong_amount");

    row = withKey(row, "amount_wrong");
    row = withLabel(row, "Wrong amount claimed");
    expect(row.key).toBe("amount_wrong");

    row = withKey(row, "");
    row = withLabel(row, "Time doesn’t match records");
    expect(row.key).toBe("time_doesn_t_match_records");

    const saved = rejectionReasonsToForm({ isEnabled: true, reasonOptions: [{ key: "a", label: "A" }] }).reasonOptions[0];
    expect(withLabel(saved, "Renamed").key).toBe("a");
  });

  it("slugifies accents and punctuation", () => {
    expect(slugifyReasonKey("  Café — late!! ")).toBe("cafe_late");
  });

  it("flags only an edited saved key (AC3)", () => {
    const [saved] = rejectionReasonsToForm({ isEnabled: true, reasonOptions: [{ key: "a", label: "A" }] }).reasonOptions;

    expect(isSavedKeyChanged(saved)).toBe(false);
    expect(isSavedKeyChanged(withKey(saved, "b"))).toBe(true);
    expect(isSavedKeyChanged(withKey(withKey(saved, "b"), "a"))).toBe(false);
    expect(isSavedKeyChanged(withLabel(createRejectionReasonOption(0), "x"))).toBe(false);
  });

  it("marks rows saved after a save that does not reload", () => {
    const form = { ...emptyRejectionReasons(), reasonOptions: [withLabel(createRejectionReasonOption(0), "New one")] };

    expect(markRejectionReasonsSaved(form).reasonOptions[0]).toEqual(
      expect.objectContaining({ originalKey: "new_one", keyTouched: true }),
    );
  });

  it("adds only missing defaults", () => {
    const list = rejectionReasonsToForm({
      isEnabled: true,
      reasonOptions: [{ key: "other", label: "Other (custom)" }],
    }).reasonOptions;

    const next = addMissingDefaultReasons(list);
    expect(next).toHaveLength(DEFAULT_REJECTION_REASON_OPTIONS.length);
    expect(next[0].label).toBe("Other (custom)");
    expect(next.map((option) => option.displayOrder)).toEqual([1, 2, 3, 4, 5]);
    expect(hasMissingDefaultReasons(next)).toBe(false);
    expect(hasMissingDefaultReasons(list)).toBe(true);
  });

  it("blocks save with no active reason while ON (AC5) and checks keys", () => {
    expect(validateRejectionReasons({ ...emptyRejectionReasons(), isEnabled: false })).toEqual([]);
    expect(validateRejectionReasons({ ...emptyRejectionReasons(), isEnabled: true })[0]).toBe(
      REJECTION_REASONS_NO_ACTIVE_ERROR,
    );

    const rows = [
      { ...createRejectionReasonOption(0), label: "A", key: "dup" },
      { ...createRejectionReasonOption(1), label: "B", key: "dup" },
      { ...createRejectionReasonOption(2), label: "", key: "Bad Key" },
    ];
    expect(validateRejectionReasons({ ...emptyRejectionReasons(), isEnabled: true, reasonOptions: rows })).toEqual([
      "Every rejection reason needs a label.",
      "Reason keys can use lowercase letters, numbers and underscores only: Bad Key",
      "Duplicate reason key: dup",
    ]);
  });
});

describe("reject dialog rules", () => {
  const lookup = (overrides: Partial<RejectionReasonLookup> = {}): RejectionReasonLookup => ({
    ...LEGACY_REJECTION_LOOKUP,
    showReasonDropdown: true,
    reasonRequired: true,
    remarksAlwaysRequired: false,
    reasonOptions: [
      { key: "insufficient_proof", label: "Insufficient proof", requiresRemarks: false },
      { key: "other", label: "Other", requiresRemarks: true },
    ],
    ...overrides,
  });

  it("keeps today's rule when no flow has a dropdown", () => {
    const rules = resolveRejectRules(LEGACY_REJECTION_LOOKUP, "", ["a"]);
    expect(rules.showDropdown).toBe(false);
    expect(rules.remarksRequired).toBe(true);
    expect(rules.blockedMessage).toBeUndefined();
  });

  it("requires remarks only for a reason that needs them", () => {
    expect(resolveRejectRules(lookup(), "insufficient_proof", ["a"]).remarksRequired).toBe(false);
    expect(resolveRejectRules(lookup(), "other", ["a"]).remarksRequired).toBe(true);
    expect(resolveRejectRules(lookup({ remarksAlwaysRequired: true }), "insufficient_proof", ["a", "b"]).remarksRequired).toBe(true);
  });

  it("leaves out bulk-blocked and unavailable ids", () => {
    const rules = resolveRejectRules(
      lookup({ bulkBlockedItemIds: ["b"], unavailableItemIds: ["c"] }),
      "",
      ["a", "b", "c"],
    );
    expect(rules.rejectIds).toEqual(["a"]);
    expect(rules.skippedIds).toEqual(["b", "c"]);
    expect(rules.blockedNote).toBe("1 request needs its own reason. Reject it separately.");
    expect(rules.blockedMessage).toBeUndefined();
  });

  it("blocks when every id is blocked or the lists share no reason", () => {
    expect(resolveRejectRules(lookup({ bulkBlockedItemIds: ["a", "b"] }), "", ["a", "b"]).blockedMessage).toBe(
      "2 requests need their own reason. Reject them one by one.",
    );
    expect(resolveRejectRules(lookup({ reasonOptions: [] }), "", ["a", "b"]).blockedMessage).toBe(
      REJECT_REASON_LISTS_DIFFER,
    );
  });

  it("normalizes the API response defensively", () => {
    const parsed = normalizeRejectionReasonLookup({
      showReasonDropdown: true,
      reasonOptions: [{ key: "a", label: "A" }, { label: "no key" }],
      items: [{ inboxItemId: 1, isEnabled: true }],
    });
    expect(parsed.reasonOptions).toEqual([{ key: "a", label: "A", requiresRemarks: false }]);
    expect(parsed.remarksAlwaysRequired).toBe(true);
    expect(parsed.items[0]).toEqual(expect.objectContaining({ inboxItemId: "1", isMandatory: true }));
  });
});
