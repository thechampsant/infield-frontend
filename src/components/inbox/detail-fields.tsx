"use client";

import type { ReactNode } from "react";
import { Paperclip } from "lucide-react";
import type { AttachmentItem, DisplayField } from "@/lib/api/inbox-service";

/**
 * Config-driven detail renderer. Fields come from the request type's
 * `displayMetadata.fields` — no hardcoded field list. The attachment block is
 * rendered only when the request type has attachments configured.
 */
export function DetailFields({
  fields,
  attachments,
  attachmentSubtitle,
  onOpenAttachment,
  footer,
}: {
  fields: DisplayField[];
  attachments?: AttachmentItem[];
  attachmentSubtitle?: string;
  onOpenAttachment?: (attachment: AttachmentItem) => void;
  footer?: ReactNode;
}) {
  return (
    <div className="ibx-detail">
      <div className="ibx-detail-grid">
        {fields.map((field, idx) => (
          <div
            key={`${field.label}-${idx}`}
            className={field.fullWidth ? "ibx-field full" : "ibx-field"}
          >
            <span className="ibx-field-label">{field.label}</span>
            <span className={`ibx-field-value ${field.tone ?? ""}`}>
              {field.value}
            </span>
          </div>
        ))}
      </div>

      {attachments && attachments.length > 0 && (
        <div className="ibx-field full" style={{ marginTop: "var(--if2-sp-8)" }}>
          <span className="ibx-field-label">Attachment</span>
          {attachments.map((att) => (
            <button
              key={att.url}
              type="button"
              className="ibx-attach"
              onClick={() => onOpenAttachment?.(att)}
            >
              <Paperclip aria-hidden="true" />
              <span>
                <span className="ibx-attach-name" style={{ display: "block" }}>
                  {att.fileName}
                </span>
                <span className="ibx-attach-sub">
                  {attachmentSubtitle ??
                    (att.renderer === "geo-map"
                      ? "Geo-tagged · Click to view"
                      : "Click to view")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {footer}
    </div>
  );
}
