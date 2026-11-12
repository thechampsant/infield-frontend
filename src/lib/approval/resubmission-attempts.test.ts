import { describe, expect, it } from "vitest";
import { parseResubmissionAttempts, resubmissionAttemptsError } from "./resubmission-attempts";

describe("additional-submission limit validation", () => {
  it.each([0, 1, 20, "0", "1", "20"])("serializes %s as a number", (value) => {
    expect(resubmissionAttemptsError(value)).toBeNull();
    expect(parseResubmissionAttempts(value)).toBe(Number(value));
  });

  it.each(["", " ", "abc", -1, "-1", 1.5, "1.5", NaN, Infinity, null, undefined, true])(
    "blocks invalid input %s instead of converting it to zero",
    (value) => {
      expect(resubmissionAttemptsError(value)).toContain("whole number");
      expect(() => parseResubmissionAttempts(value)).toThrow();
    },
  );
});
