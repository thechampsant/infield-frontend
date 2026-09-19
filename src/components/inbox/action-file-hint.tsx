import { ACTION_FILE_HINT } from "@/lib/inbox-action-file";

/** Shown under the Attachment label on approve/reject dialogs (single and bulk). */
export function ActionFileHint() {
  return (
    <div className="ibx-action-file-hint">{ACTION_FILE_HINT}</div>
  );
}
