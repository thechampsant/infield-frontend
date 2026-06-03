"use client";

import { TriCheckbox, type CheckState } from "./tri-checkbox";

export function BulkActionBar({
  selectAllState,
  onToggleSelectAll,
  selectedCount,
  totalSelectable,
  onApprove,
  onReject,
}: {
  selectAllState: CheckState;
  onToggleSelectAll: () => void;
  selectedCount: number;
  totalSelectable: number;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="inbox-bulk-bar">
      <TriCheckbox
        state={selectAllState}
        onToggle={onToggleSelectAll}
        label="Select all pending requests"
      />
      <span className="inbox-bulk-info">
        {selectedCount} of {totalSelectable} selected
      </span>
      <div className="inbox-bulk-spacer" />
      <button type="button" className="ibx-btn ibx-btn-primary" onClick={onApprove}>
        Approve Selected
      </button>
      <button type="button" className="ibx-btn ibx-btn-danger" onClick={onReject}>
        Reject Selected
      </button>
    </div>
  );
}
