"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { BaseModal } from "./base-modal";

interface WallDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  body?: string;
  isDeleting?: boolean;
}

export function WallDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete this post?",
  body = "It disappears from the Wall for everyone. The deletion is recorded in the audit log.",
  isDeleting = false,
}: WallDeleteModalProps) {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      ariaLabelledBy="delete-modal-title"
      isSubmitting={isDeleting}
      header={
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 id="delete-modal-title" className="text-base font-bold text-slate-900">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      }
      bodyClassName="px-6 py-4"
      footer={
        <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {isDeleting ? "Deleting..." : "Delete post"}
          </button>
        </div>
      }
    >
      <p className="text-xs text-slate-600 leading-relaxed">
        {body}
      </p>
    </BaseModal>
  );
}

