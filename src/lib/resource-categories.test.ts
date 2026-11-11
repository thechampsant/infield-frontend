import { describe, expect, it } from "vitest";
import { categoryNameError } from "./resource-categories";

describe("resource category validation", () => {
  it.each(["", " ", "\t"])("rejects empty names: %j", (name) => {
    expect(categoryNameError(name, [])).toBe("Category name is required.");
  });
  it("compares names ignoring case and surrounding whitespace", () => {
    expect(categoryNameError(" cooking ", ["Cooking", "Fans"])).toContain("already exists");
    expect(categoryNameError("COOKING", ["Cooking"])).toContain("already exists");
    expect(categoryNameError("Fans", ["Cooking"])).toBeNull();
  });
  it("accepts 24 characters and rejects 25", () => {
    expect(categoryNameError("a".repeat(24), [])).toBeNull();
    expect(categoryNameError("a".repeat(25), [])).toContain("24 characters");
  });
});
