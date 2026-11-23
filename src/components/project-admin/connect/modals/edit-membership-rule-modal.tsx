"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import type { ProjectUser } from "@/types/project-admin";
import { connectRoomService, type MembershipRuleInput, type MembershipRuleOptions } from "@/lib/api/connect-room-service";
import { MembershipRuleBuilder } from "../room/membership-rule-builder";

const emptyRule: MembershipRuleInput = { filters: [], reportingManagerIds: [], reportingScope: "direct", includeReportingManagers: false, addedByHandUserIds: [], keptOutByHandUserIds: [] };

export function EditMembershipRuleModal({
  isOpen, roomId, roomName, projectId, options, users, initialRule, currentMemberIds, onClose, onSave, onRemoveRule,
}: {
  isOpen: boolean; roomId: string; roomName: string; projectId?: string;
  options?: MembershipRuleOptions | null; users: ProjectUser[]; initialRule?: MembershipRuleInput | null;
  currentMemberIds: string[]; onClose: () => void; onSave: (rule: MembershipRuleInput) => Promise<void>;
  onRemoveRule?: () => Promise<void>;
}) {
  if (!isOpen) return null;
  return (
    <EditMembershipRuleModalContent
      key={`${roomId}-${initialRule ? "edit" : "new"}`}
      roomId={roomId}
      roomName={roomName}
      projectId={projectId}
      options={options}
      users={users}
      initialRule={initialRule}
      currentMemberIds={currentMemberIds}
      onClose={onClose}
      onSave={onSave}
      onRemoveRule={onRemoveRule}
    />
  );
}

function EditMembershipRuleModalContent({
  roomId, roomName, projectId, options, users, initialRule, currentMemberIds, onClose, onSave, onRemoveRule,
}: {
  roomId: string; roomName: string; projectId?: string;
  options?: MembershipRuleOptions | null; users: ProjectUser[]; initialRule?: MembershipRuleInput | null;
  currentMemberIds: string[]; onClose: () => void; onSave: (rule: MembershipRuleInput) => Promise<void>;
  onRemoveRule?: () => Promise<void>;
}) {
  const [rule, setRule] = useState<MembershipRuleInput>(initialRule || emptyRule);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="edit-rule-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-hidden">
      <div className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div><h3 id="edit-rule-title" className="text-base font-bold text-slate-900">{initialRule ? "Edit membership rule" : "Add membership rule"}</h3><p className="mt-0.5 text-xs text-slate-500">{roomName}</p></div>
          <button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="cursor-pointer text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          <MembershipRuleBuilder projectId={projectId} options={options} users={users} value={rule} onChange={setRule} disabled={busy} currentMemberIds={currentMemberIds} showManualAdditions={false} />
          {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{error}</p>}
        </div>
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 shrink-0">
          {initialRule ? <button type="button" onClick={async () => { setBusy(true); setError(null); try { if (onRemoveRule) await onRemoveRule(); else await connectRoomService.removeMembershipRule(roomId); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Could not remove the rule."); } finally { setBusy(false); } }} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 cursor-pointer">Remove rule</button> : <span />}
          <div className="flex gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button><button type="button" disabled={busy} onClick={async () => { setBusy(true); setError(null); try { await onSave(rule); onClose(); } catch (e) { setError(e instanceof Error ? e.message : "Could not save this rule."); } finally { setBusy(false); } }} className="inline-flex items-center gap-2 rounded-lg bg-[#0b4ea2] hover:bg-[#093e82] px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save rule</button></div>
        </footer>
      </div>
    </div>
  );
}
