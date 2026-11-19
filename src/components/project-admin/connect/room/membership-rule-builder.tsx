"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProjectUser } from "@/types/project-admin";
import { connectRoomService, type MembershipRuleInput, type MembershipRuleOptions } from "@/lib/api/connect-room-service";
import { MemberUserPicker } from "./member-user-picker";

const emptyRule = (): MembershipRuleInput => ({ filters: [], reportingManagerIds: [], reportingScope: "direct", includeReportingManagers: false, addedByHandUserIds: [] });

export function MembershipRuleBuilder({
  projectId,
  options,
  users,
  value,
  onChange,
  disabled = false,
  currentMemberIds = [],
  showManualAdditions = true,
}: {
  projectId?: string;
  options?: MembershipRuleOptions | null;
  users: ProjectUser[];
  value?: MembershipRuleInput;
  onChange: (rule: MembershipRuleInput) => void;
  disabled?: boolean;
  currentMemberIds?: string[];
  showManualAdditions?: boolean;
}) {
  const [preview, setPreview] = useState<{ count: number; userIds: string[]; users: Array<{ userId: string; name: string }> } | null>(null);
  const rule = useMemo(() => ({
    ...emptyRule(), ...value,
    filters: value?.filters || [],
    reportingManagerIds: value?.reportingManagerIds || [],
    addedByHandUserIds: value?.addedByHandUserIds || [],
    keptOutByHandUserIds: value?.keptOutByHandUserIds || [],
  }), [value]);
  const ruleKey = JSON.stringify(rule);
  const selected = useMemo(() => new Map(rule.filters.map((filter) => [`${filter.source}:${filter.fieldKey}`, new Set(filter.values)])), [rule.filters]);

  useEffect(() => {
    if (!projectId || (!rule.filters.some((filter) => filter.values.length) && rule.reportingManagerIds.length === 0)) {
      setPreview(null); return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      connectRoomService.previewMembershipRule(JSON.parse(ruleKey) as MembershipRuleInput).then((result) => { if (!cancelled) setPreview(result); }).catch(() => { if (!cancelled) setPreview(null); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [projectId, ruleKey]);

  function toggleValue(source: string, fieldKey: string, valueToToggle: string) {
    const next = rule.filters.map((filter) => ({ ...filter, values: [...filter.values] }));
    let filter = next.find((item) => item.source === source && item.fieldKey === fieldKey);
    if (!filter) { filter = { source: source as MembershipRuleInput["filters"][number]["source"], fieldKey, values: [] }; next.push(filter); }
    filter.values = filter.values.includes(valueToToggle) ? filter.values.filter((item) => item !== valueToToggle) : [...filter.values, valueToToggle];
    onChange({ ...rule, filters: next.filter((item) => item.values.length) });
  }
  function field(title: string, source: string, fieldKey: string, optionsList: Array<{ value: string; count: number }>) {
    const values = selected.get(`${source}:${fieldKey}`) || new Set<string>();
    return <section key={`${source}:${fieldKey}`} className="mb-4">
      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {optionsList.map((option) => <button key={option.value} type="button" disabled={disabled} aria-pressed={values.has(option.value)} onClick={() => toggleValue(source, fieldKey, option.value)} className={`rounded-full border px-3 py-1.5 text-[11px] transition-colors ${values.has(option.value) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50"}`}>
          {option.value}<span className={`ml-1.5 ${values.has(option.value) ? "text-blue-100" : "text-slate-400"}`}>{option.count}</span>
        </button>)}
      </div>
    </section>;
  }

  if (!options) return <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">Loading membership filters…</div>;
  return <div className="rounded-xl border border-slate-200 bg-white p-3.5">
    <p className="mb-4 text-[11px] text-slate-500">Values in one field widen the match (Mumbai or Pune). Different fields narrow it (Mumbai and Brand Ambassador).</p>
    {field(options.designation.label, "designation", options.designation.key, options.designation.options)}
    <section className="mb-4 border-t border-slate-200 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Reporting manager</h4>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-semibold">
          {(["direct", "subtree"] as const).map((scope) => <button key={scope} type="button" aria-pressed={rule.reportingScope === scope} onClick={() => onChange({ ...rule, reportingScope: scope })} className={`rounded-md px-2.5 py-1.5 ${rule.reportingScope === scope ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}`}>{scope === "direct" ? "Direct reports" : "Including sub-team"}</button>)}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">{options.managers.map((manager) => <button key={manager.userId} type="button" aria-pressed={rule.reportingManagerIds.includes(manager.userId)} onClick={() => onChange({ ...rule, reportingManagerIds: rule.reportingManagerIds.includes(manager.userId) ? rule.reportingManagerIds.filter((id) => id !== manager.userId) : [...rule.reportingManagerIds, manager.userId] })} className={`rounded-full border px-3 py-1.5 text-[11px] ${rule.reportingManagerIds.includes(manager.userId) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{manager.name}<span className="ml-1.5 opacity-70">{manager.count}</span>{manager.left && <span className="ml-1 text-red-600">left</span>}</button>)}</div>
      <p className="mt-2 text-[11px] text-slate-500">Managers match their reports. Choose “Also add their reporting managers” to include them too.</p>
    </section>
    {options.storeFields.length > 0 && <div className="border-t border-slate-200 pt-3"><p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Store fields · through each person’s mapped store</p>{options.storeFields.map((group) => field(group.label, "store", group.key, group.options))}<p className="mb-3 text-[11px] text-slate-500">People without a direct store mapping do not match store fields.</p></div>}
    {options.userFields.length > 0 && <div className="border-t border-slate-200 pt-3"><p className="mb-3 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">User fields · from the Users master</p>{options.userFields.map((group) => field(group.label, "user", group.key, group.options))}</div>}
    <label className="mt-1 flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={rule.includeReportingManagers} onChange={(event) => onChange({ ...rule, includeReportingManagers: event.target.checked })} />Also add their reporting managers</label>
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-slate-700">
      {preview ? <><strong>{preview.count} members after saving</strong>{currentMemberIds.length > 0 && <span> · {preview.userIds.filter((id) => !currentMemberIds.includes(id)).length} join · {currentMemberIds.filter((id) => !preview.userIds.includes(id)).length} leave</span>}{preview.users.length > 0 && <div className="mt-1 text-[11px]">{preview.users.map((user) => user.name).join(", ")}{preview.count > 3 ? "…" : ""}</div>}</> : "Pick at least one filter value."}
    </div>
    {showManualAdditions && <div className="mt-3 border-t border-slate-200 pt-3">
      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Also add by hand (optional)</h4>
      <MemberUserPicker
        users={users}
        selectedUserIds={rule.addedByHandUserIds}
        onSelectionChange={(ids) => onChange({ ...rule, addedByHandUserIds: ids })}
        disabled={disabled}
      />
      <p className="mt-2 text-[11px] text-slate-500">People added by hand stay even if they stop matching the rule.</p>
    </div>}
  </div>;
}
