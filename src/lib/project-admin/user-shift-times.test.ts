import { describe, it, expect } from "vitest";
import { validateShiftTimes, isShiftTimeFieldKey } from "./user-shift-times";
import type { UDFField } from "@/types/project-admin";
const fields = ["nightShift", "shiftStartTime", "shiftEndTime", "nightShiftStartTime", "nightShiftEndTime"].map((fieldKey, id) => ({ id, fieldKey })) as UDFField[];
const valid = { nightShift: true, shiftStartTime: "09:00", shiftEndTime: "18:00", nightShiftStartTime: "21:00", nightShiftEndTime: "06:00" };
describe("separate Day/Night editor validation", () => {
  it("accepts separate schedules with Day bypass", () => {
    expect(validateShiftTimes(fields, { ...valid, shiftStartTime: "00:00", shiftEndTime: "00:00" })).toBeNull();
  });
  it.each(["", "00:00", "23:00"])("rejects invalid night end %s", (end) => {
    expect(validateShiftTimes(fields, { ...valid, nightShiftEndTime: end })).not.toBeNull();
  });
  it("preserves an unrelated legacy overnight edit", () => {
    expect(validateShiftTimes(fields, { nightShift: true, shiftStartTime: "21:00", shiftEndTime: "06:00" }, "user", true)).toBeNull();
  });
  it("uses the returned version to reject an erased Night pair", () => {
    expect(validateShiftTimes(fields, { shiftTimingVersion: "2", nightShift: true, shiftStartTime: "09:00", shiftEndTime: "18:00" })).not.toBeNull();
  });
  it("recognizes new Night fields as time inputs", () => {
    expect(isShiftTimeFieldKey("nightShiftStartTime")).toBe(true);
  });
});

it("new Night configuration cannot use Day bypass to omit Night times", () => {
  expect(validateShiftTimes(fields, { nightShift: true, shiftStartTime: "00:00", shiftEndTime: "00:00" })).not.toBeNull();
});
