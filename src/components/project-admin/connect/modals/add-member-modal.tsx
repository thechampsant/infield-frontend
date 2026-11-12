"use client";

import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { ProjectUser } from "@/types/project-admin";
import { MemberUserPicker } from "../room/member-user-picker";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (users: ProjectUser[]) => void | Promise<void>;
  eligibleUsers?: ProjectUser[];
  existingMemberIds?: string[];
  memberCount?: number;
  roomName?: string;
}

export function AddMemberModal({
  isOpen,
  onClose,
  onSubmit,
  eligibleUsers = [],
  existingMemberIds = [],
  memberCount = 0,
  roomName = "this room",
}: AddMemberModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const remainingSlots = Math.max(0, 250 - memberCount);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds([]);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const selected = new Set(selectedUserIds);
    const users = eligibleUsers.filter((user) => selected.has(user.backendId || user.id));
    if (!users.length) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(users);
      setSelectedUserIds([]);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not add members to this room.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-room-members-title"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(event) => { if (!isSubmitting && event.target === event.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-start justify-between pb-3">
          <h3 id="add-room-members-title" className="text-lg font-bold text-slate-900">
            Add members to {roomName}
          </h3>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50" aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mt-3">
            <label className="block text-[10px] font-bold tracking-[0.18em] text-slate-700 mb-2">MEMBERS</label>
            <MemberUserPicker
              users={eligibleUsers}
              selectedUserIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
              selectionLimit={remainingSlots}
              excludedUserIds={existingMemberIds}
              disabled={isSubmitting}
            />
          </div>
          {submitError && <p role="alert" className="mt-3 text-xs font-medium text-red-600">{submitError}</p>}
          <div className="mt-5 -mx-6 -mb-6 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{Math.min(memberCount, 250)} of 250 max</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={!selectedUserIds.length || remainingSlots === 0 || isSubmitting} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors cursor-pointer">
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Add {selectedUserIds.length} {selectedUserIds.length === 1 ? "member" : "members"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
