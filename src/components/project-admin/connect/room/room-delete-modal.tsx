"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { plural } from "./room-service";
import type { ChatRoom } from "@/components/project-admin/connect/types";

export interface RoomDeleteModalProps {
  isOpen: boolean;
  room: ChatRoom;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
}

export function RoomDeleteModal({
  isOpen,
  room,
  onClose,
  onConfirm,
  isDeleting = false,
}: RoomDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-room-dialog-title"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 border border-red-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="delete-room-dialog-title"
              className="text-base font-bold text-slate-900"
            >
              Delete this room?
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              All {plural(room.memberCount, "member")} lose the room and its
              messages. The messages stay in the audit log for the retention
              period.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Delete room</span>
          </button>
        </div>
      </div>
    </div>
  );
}

