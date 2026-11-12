import { describe, expect, it } from "vitest";
import { inboxSubmissionFields } from "./inbox-resubmission";
import { formatFieldValue, resolveFields } from "@/components/inbox-items/inbox-format";

describe("Inbox resubmission fields", () => {
  it("shows Re-Applied: Yes in the workspace inbox only on retries", () => {
    const fields = [{ label: "ROOT REQUEST ID", value: "internal-id" }, { label: "RESUBMISSION METADATA VERSION", value: "1" }, { label: "Reason", value: "Personal" }];
    expect(inboxSubmissionFields(fields, { reApplied: "Yes" })).toEqual([
      { label: "Reason", value: "Personal" }, { label: "Re-Applied", value: "Yes" },
    ]);
    expect(inboxSubmissionFields(fields, {})).toEqual([{ label: "Reason", value: "Personal" }]);
  });

  it("does not duplicate a field already supplied by metadata", () => {
    expect(inboxSubmissionFields([{ label: "Re-Applied", value: "Yes" }], { reApplied: "Yes" }))
      .toEqual([{ label: "Re-Applied", value: "Yes" }]);
  });

  it.each([true, false])("keeps the admin inbox correct with configured sections = %s", configured => {
    const sections = configured ? [{ sectionKey: "details", sectionTitle: "Details", sectionType: "fields", displayOrder: 1,
      fields: [
        { fieldKey: "reApplied", label: "Re-Applied", dataType: "text", displayOrder: 1 },
        { fieldKey: "rootRequestId", label: "ROOT REQUEST ID", dataType: "text", displayOrder: 3 },
        { fieldKey: "resubmissionMetadataVersion", label: "RESUBMISSION METADATA VERSION", dataType: "number", displayOrder: 2 },
      ],
    }] : [];
    const initial = resolveFields(sections, { reason: "Personal", rootRequestId: "internal-id", resubmissionMetadataVersion: 1 });
    expect(initial.map(field => field.fieldKey)).toEqual(["reason"]);
    const retry = resolveFields(sections, { reason: "Personal", rootRequestId: "internal-id", resubmissionMetadataVersion: 1, reApplied: "Yes" });
    const field = retry.find(field => field.fieldKey === "reApplied")!;
    expect(field.label).toBe("Re-Applied");
    expect(formatFieldValue(field.value, field.dataType)).toBe("Yes");
    expect(retry.some(field => field.fieldKey === "resubmissionMetadataVersion")).toBe(false);
    expect(retry.some(field => field.fieldKey === "rootRequestId")).toBe(false);
  });
});
