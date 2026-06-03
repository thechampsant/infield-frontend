"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  inboxService,
  type AttachmentItem,
  type DisplayField,
  type InboxItemDetails,
  type RaisedByMeItem,
} from "@/lib/api/inbox-service";
import { DetailFields } from "./detail-fields";
import { formatDate, formatDateTime, statusClass, statusLabel, timeAgo } from "./inbox-format";

const RAISED_COLSPAN = 5;

function DecisionRow({ item }: { item: RaisedByMeItem }) {
  if (item.currentStatus === "Pending_Approval") {
    return (
      <div className="ibx-decision pending">
        Awaiting approval from {item.assignedTo?.displayName ?? "approver"}
      </div>
    );
  }

  const lastAction = item.approvalHistorySummary?.[item.approvalHistorySummary.length - 1];

  if (item.currentStatus === "Approved") {
    return (
      <div className="ibx-decision approved">
        Approved by {lastAction?.approverName ?? "approver"}
        {lastAction?.actionDate ? ` · ${formatDateTime(lastAction.actionDate)}` : ""}
      </div>
    );
  }

  if (item.currentStatus === "Rejected") {
    return (
      <div className="ibx-decision rejected">
        Rejected by {lastAction?.approverName ?? "approver"}
        {lastAction?.actionDate ? ` · ${formatDateTime(lastAction.actionDate)}` : ""}
        {item.rejectionReason && (
          <div className="ibx-reject-reason">Reason: {item.rejectionReason}</div>
        )}
      </div>
    );
  }

  if (item.currentStatus === "Sent_Back") {
    return (
      <div className="ibx-decision pending">
        Sent back for revision
        {item.sendBackRemarks && (
          <div className="ibx-reject-reason">Remarks: {item.sendBackRemarks}</div>
        )}
      </div>
    );
  }

  return null;
}

export function RaisedRow({
  item,
  expanded,
  onToggleExpand,
  onOpenAttachment,
}: {
  item: RaisedByMeItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenAttachment: (attachment: AttachmentItem) => void;
}) {
  const [details, setDetails] = useState<InboxItemDetails | null>(null);
  const [loading, setLoading] = useState(false);
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

  // "Assigned To" leads the read-only detail for raised requests.
  const fields: DisplayField[] = [
    ...(item.assignedTo
      ? [{ label: "Assigned To", value: item.assignedTo.displayName } as DisplayField]
      : []),
    ...(meta.fields ?? []),
  ];

  return (
    <>
      <tr
        className={cn("inbox-row", expanded && "expanded")}
        onClick={onToggleExpand}
      >
        <td>
          <div className="ibx-emp">
            <span className="ibx-avatar">ME</span>
            <span>
              <span className="ibx-emp-name" style={{ display: "block" }}>
                My Request
              </span>
              <span className="ibx-age">{timeAgo(item.submittedDate)}</span>
            </span>
          </div>
        </td>
        <td>
          <span className="ibx-type">{meta.typeLabel ?? item.requestType}</span>
        </td>
        <td className="ibx-muted">{formatDate(item.submittedDate)}</td>
        <td>
          <span className={`ibx-status ${statusClass(item.currentStatus)}`}>
            {statusLabel(item.currentStatus)}
          </span>
        </td>
        <td onClick={(e) => e.stopPropagation()}>
          <div className="ibx-actions">
            <span className="ibx-age">{timeAgo(item.submittedDate)}</span>
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
          <td colSpan={RAISED_COLSPAN}>
            {loading && !details ? (
              <div className="ibx-detail-loading">
                <span className="if2-spinner sm" />
                Loading details…
              </div>
            ) : (
              <DetailFields
                fields={fields}
                attachments={details?.attachments}
                onOpenAttachment={onOpenAttachment}
                footer={<DecisionRow item={item} />}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}
