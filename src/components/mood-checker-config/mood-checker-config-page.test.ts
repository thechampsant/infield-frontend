import { describe, expect, it } from "vitest";
import { defaultMoodConfigForm } from "@/lib/api/mood-checker-config-service";
import { frequencySummary, isMoodFormDirty } from "./mood-checker-config-page";

describe("isMoodFormDirty", () => {
  it("is clean for identical forms and dirty after any edit", () => {
    const saved = defaultMoodConfigForm();
    const same = defaultMoodConfigForm();
    const edited = { ...defaultMoodConfigForm(), question: "How was your day?" };

    expect(isMoodFormDirty(same, saved)).toBe(false);
    expect(isMoodFormDirty(edited, saved)).toBe(true);
  });

  it("treats reordering options as a change", () => {
    const saved = defaultMoodConfigForm();
    const reordered = { ...saved, options: [...saved.options].reverse() };

    expect(isMoodFormDirty(reordered, saved)).toBe(true);
  });
});

describe("frequencySummary", () => {
  const withFrequency = (frequency: ReturnType<typeof defaultMoodConfigForm>["frequency"]) => ({ frequency });

  it("describes each frequency type", () => {
    expect(frequencySummary(withFrequency({ type: "DAILY", days: [], dates: [], everyNDays: 1 }))).toBe("Daily");
    expect(frequencySummary(withFrequency({ type: "SELECT_DAYS", days: ["FRI", "MON"], dates: [], everyNDays: 1 }))).toBe(
      "Mon, Fri",
    );
    expect(frequencySummary(withFrequency({ type: "SELECT_DATES", days: [], dates: [15, 1], everyNDays: 1 }))).toBe(
      "Dates 1, 15",
    );
    expect(frequencySummary(withFrequency({ type: "EVERY_N_DAYS", days: [], dates: [], everyNDays: 3 }))).toBe(
      "Every 3 days",
    );
  });
});
