import type { DisplayField } from "@/lib/api/inbox-service";

export function isVisibleInboxField(key: string, value: unknown): boolean {
  return key !== "resubmissionMetadataVersion" && key !== "rootRequestId" && (key !== "reApplied" || value === "Yes");
}

/** Workspace inbox uses resolved fields rather than module field definitions. */
export function inboxSubmissionFields(
  fields: DisplayField[],
  moduleData: Record<string, unknown>,
): DisplayField[] {
  const visible = fields.filter(field => {
    const label = field.label.replace(/[^a-z]/gi, "").toLowerCase();
    return label !== "resubmissionmetadataversion" && label !== "rootrequestid" && label !== "reapplied";
  });
  if (moduleData.reApplied === "Yes") visible.push({ label: "Re-Applied", value: "Yes" });
  return visible;
}
