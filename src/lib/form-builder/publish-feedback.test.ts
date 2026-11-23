import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-client";
import { MOCK_CONFIGURATIONS } from "./mock-data";
import { formBuilderApi } from "./form-builder-api";
import { formBuilderService } from "./form-builder-service";
import { checkPublishFields, publishErrorMessages, publishReceipt } from "./publish-feedback";

const form = MOCK_CONFIGURATIONS[0];
const field = form.fields[0];

describe("Form Builder publish feedback", () => {
  it("blocks empty forms, blank labels, and reversed number limits", () => {
    expect(checkPublishFields({ ...form, fields: [] }).errors).toEqual(["Add at least one field."]);
    const number = { ...field, type: "number" as const, label: " ", typeConfig: { minValue: 50, maxValue: 10 } };
    expect(checkPublishFields({ ...form, fields: [number] }).errors).toEqual([
      "Field 1 has an empty label.", "Field 1: min (50) > max (10).",
    ]);
  });

  it("includes each warning without blocking publication", () => {
    const input = { ...form, name: "Store Audit", designations: [], fields: [
      { ...field, visibility: "conditional" as const, visibilityRules: [] },
    ] };
    const result = checkPublishFields(input);
    expect(result.errors).toEqual([]);
    expect(publishReceipt(input, [result.warnings[0]], result.warnings)).toEqual({
      summary: "Published “Store Audit” — 1 field, 2 warnings.",
      warnings: [expect.stringContaining("No designations"), expect.stringContaining(field.label)],
    });
  });

  it("summarizes a clean publish", () => {
    expect(publishReceipt({ ...form, name: "Survey", fields: [field, field] }, [])).toEqual({
      summary: "Published “Survey” — 2 fields, 0 issues.", warnings: [],
    });
  });

  it("shows detailed validation messages from a rejected publish", () => {
    const error = new ApiError(422, "VALIDATION_FAILED", undefined, "Publish validation failed", {
      data: { errors: [{ message: "Choose a source" }, { message: "Missing field reference" }] },
    });
    expect(publishErrorMessages(error)).toEqual(["Choose a source", "Missing field reference"]);
    expect(publishErrorMessages(new Error("Network unavailable"))).toEqual(["Network unavailable"]);
  });

  it("does not turn an unsuccessful publish response or exception into success", async () => {
    const save = vi.spyOn(formBuilderApi, "saveSchema").mockResolvedValue(null);
    const publish = vi.spyOn(formBuilderApi, "publish");
    try {
      const failure = { status: "failed" as const, errors: [], warnings: [] };
      publish.mockResolvedValueOnce(failure);
      await expect(formBuilderService.saveSchemaAndPublish(form.id, [field])).resolves.toEqual(failure);
      publish.mockRejectedValueOnce(new Error("No draft could be published"));
      await expect(formBuilderService.saveSchemaAndPublish(form.id, [field])).rejects.toThrow("No draft");
    } finally {
      save.mockRestore();
      publish.mockRestore();
    }
  });
});
