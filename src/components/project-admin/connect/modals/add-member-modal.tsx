"use client";

import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { ProjectUser } from "@/types/project-admin";
import { MemberUserPicker } from "../room/member-user-picker";
import { MembershipRuleBuilder } from "../room/membership-rule-builder";
import type { MembershipRuleInput, MembershipRuleOptions } from "@/lib/api/connect-room-service";
import { BaseModal } from "./base-modal";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (users: ProjectUser[]) => void | Promise<void>;
  eligibleUsers?: ProjectUser[];
  existingMemberIds?: string[];
  memberCount?: number;
  roomName?: string;
  membershipType?: "fixed" | "rule";
  projectId?: string;
  ruleOptions?: MembershipRuleOptions | null;
  onAddByFilter?: (rule: MembershipRuleInput) => void | Promise<void>;
}

export function AddMemberModal({
  isOpen,
  onClose,
  onSubmit,
  eligibleUsers = [],
  existingMemberIds = [],
  memberCount = 0,
  roomName = "this room",
  membershipType = "fixed",
  projectId,
  ruleOptions,
  onAddByFilter,
}: AddMemberModalProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mode, setMode] = useState<"pick" | "filter">("pick");
  const [rule, setRule] = useState<MembershipRuleInput>({ filters: [], reportingManagerIds: [], reportingScope: "direct", includeReportingManagers: false, addedByHandUserIds: [] });
  const remainingSlots = Math.max(0, 1000 - memberCount);

  useEffect(() => {
    if (isOpen) {
      setSelectedUserIds([]);
      setSubmitError(null);
      setMode("pick");
      setRule({ filters: [], reportingManagerIds: [], reportingScope: "direct", includeReportingManagers: false, addedByHandUserIds: [] });
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

  async function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!onAddByFilter) return;
    setIsSubmitting(true); setSubmitError(null);
    try { await onAddByFilter(rule); onClose(); }
    catch (error) { setSubmitError(error instanceof Error ? error.message : "Could not add matching people."); }
    finally { setIsSubmitting(false); }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      ariaLabelledBy="add-room-members-title"
      isSubmitting={isSubmitting}
      header={
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <h3 id="add-room-members-title" className="text-lg font-bold text-slate-900">
            Add members to {roomName}
          </h3>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50" aria-label="Close dialog">
            <X className="w-5 h-5" />
          </button>
        </div>
      }
      rawContent={true}
    >
      {/* Form Container */}
      <form onSubmit={mode === "filter" ? handleFilterSubmit : handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {membershipType === "fixed" && (
            <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              <button type="button" onClick={() => setMode("pick")} className={`rounded-md px-3 py-2 cursor-pointer ${mode === "pick" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}>Pick people</button>
              <button type="button" onClick={() => setMode("filter")} className={`rounded-md px-3 py-2 cursor-pointer ${mode === "filter" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}>Add by filter</button>
            </div>
          )}

          {mode === "filter" ? (
            <MembershipRuleBuilder projectId={projectId} options={ruleOptions} users={eligibleUsers} value={rule} onChange={setRule} currentMemberIds={existingMemberIds} />
          ) : (
            <div>
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
          )}

          {submitError && <p role="alert" className="text-xs font-medium text-red-600">{submitError}</p>}
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500">{Math.min(memberCount, 1000)} of 1,000 max</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={(mode === "pick" && !selectedUserIds.length) || remainingSlots === 0 || isSubmitting || (mode === "filter" && !rule.filters.some((filter) => filter.values.length) && !rule.reportingManagerIds.length)} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0b4ea2] hover:bg-[#093e82] disabled:bg-slate-200 disabled:text-slate-400 rounded-lg transition-colors cursor-pointer">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === "filter" ? "Add matching people" : `Add ${selectedUserIds.length} ${selectedUserIds.length === 1 ? "member" : "members"}`}
            </button>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}
