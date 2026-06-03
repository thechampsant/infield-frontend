"use client";

import { Inbox } from "lucide-react";

export function InboxEmpty({
  message = "No requests found",
  hint = "Try adjusting your filters",
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <div className="empty-state">
      <Inbox aria-hidden="true" />
      <div className="empty-state-title">{message}</div>
      <div className="empty-state-sub">{hint}</div>
    </div>
  );
}
