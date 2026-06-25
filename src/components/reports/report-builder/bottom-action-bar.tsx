"use client";

import { Loader2 } from "lucide-react";

export type AutoSaveStatus = "saved" | "saving" | "unsaved";

interface BottomActionBarProps {
  autoSaveStatus: AutoSaveStatus;
  onCancel: () => void;
  onPreview: () => void;
  onSaveDraft: () => void;
  onSaveReport: () => void;
  isSaving: boolean;
  isPreviewing: boolean;
}

export function BottomActionBar({
  autoSaveStatus,
  onCancel,
  onPreview,
  onSaveDraft,
  onSaveReport,
  isSaving,
  isPreviewing,
}: BottomActionBarProps) {
  const statusText = {
    saved: "All changes saved",
    saving: "Saving...",
    unsaved: "Unsaved changes",
  };

  const statusColor = {
    saved: "text-green-600",
    saving: "text-blue-600",
    unsaved: "text-amber-600",
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Auto-save indicator */}
        <div className="flex items-center gap-2">
          {autoSaveStatus === "saving" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
          )}
          <span className={`text-sm ${statusColor[autoSaveStatus]}`}>
            {statusText[autoSaveStatus]}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onPreview}
            disabled={isPreviewing}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {isPreviewing ? "Loading Preview..." : "Preview Report"}
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={onSaveReport}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
