"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  canApprove,
  canReject,
  inboxService,
  isPending,
  type AttachmentItem,
  type InboxItemDetails,
  type InboxItemWithMetadata,
} from "@/lib/api/inbox-service";
import { DetailFields } from "./detail-fields";
import { TriCheckbox } from "./tri-checkbox";
import { formatDate, initials, statusClass, statusLabel, timeAgo } from "./inbox-format";

const ASSIGNED_COLSPAN = 10;

export function AssignedRow({
  item,
  selected,
  onToggleSelect,
  expanded,
  onToggleExpand,
  onApprove,
  onReject,
  onOpenAttachment,
}: {
  item: InboxItemWithMetadata;
  selected: boolean;
  onToggleSelect: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  onOpenAttachment: (attachment: AttachmentItem) => void;
}) {
  const [details, setDetails] = useState<InboxItemDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = isPending(item.currentStatus);
  const meta = item.displayMetadata;

  useEffect(() => {
    if (!expanded || details) return;
    let cancelled = false;
    async function loadDetails() {
      setLoading(true);
      try {
        const d = await inboxService.getDetails(item.inboxItemId);
        if (!cancelled) setDetails(d);
      } catch {
        // Detail fetch failure shouldn't break the row; fields still render.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [expanded, details, item.inboxItemId]);

  const showApprove = pending && canApprove(item);
  const showReject = pending && canReject(item);

  return (
    <>
      <tr
        className={cn(
          "inbox-row",
          selected && "selected",
          expanded && "expanded",
        )}
        onClick={onToggleExpand}
      >
        <td onClick={(e) => e.stopPropagation()}>
          {pending && (
            <TriCheckbox
              state={selected ? "checked" : "unchecked"}
              onToggle={onToggleSelect}
              label={`Select request from ${item.submittedBy.displayName}`}
            />
          )}
        </td>
        <td>
          <div className="ibx-emp">
            <span className="ibx-avatar">{initials(item.submittedBy.displayName)}</span>
            <span className="ibx-emp-name">{item.submittedBy.displayName}</span>
          </div>
        </td>
        <td className="ibx-muted">{meta.employeeCode ?? "—"}</td>
        <td className="ibx-muted">{item.submittedBy.designation ?? "—"}</td>
        <td className="ibx-muted">{meta.location ?? "—"}</td>
        <td>
          <span className="ibx-type">{meta.typeLabel ?? item.requestType}</span>
        </td>
        <td className="ibx-muted">{formatDate(item.submittedDate)}</td>
        <td>
          <span className={`ibx-status ${statusClass(item.currentStatus)}`}>
            {statusLabel(item.currentStatus)}
          </span>
        </td>
        <td className="ibx-age">{timeAgo(item.submittedDate)}</td>
        <td onClick={(e) => e.stopPropagation()}>
          <div className="ibx-actions">
            {showApprove && (
              <button
                type="button"
                className="ibx-act-btn ibx-act-approve"
                onClick={onApprove}
              >
                Approve
              </button>
            )}
            {showReject && (
              <button
                type="button"
                className="ibx-act-btn ibx-act-reject"
                onClick={onReject}
              >
                Reject
              </button>
            )}
            <button
              type="button"
              className={cn("ibx-chevron", expanded && "open")}
              onClick={onToggleExpand}
              aria-label={expanded ? "Collapse details" : "Expand details"}
              aria-expanded={expanded}
            >
              <ChevronDown aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="inbox-detail-row">
          <td colSpan={ASSIGNED_COLSPAN}>
            {loading && !details ? (
              <div className="ibx-detail-loading">
                <span className="if2-spinner sm" />
                Loading details…
              </div>
            ) : (
              <DetailFields
                fields={meta.fields ?? []}
                attachments={details?.attachments}
                onOpenAttachment={onOpenAttachment}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}
