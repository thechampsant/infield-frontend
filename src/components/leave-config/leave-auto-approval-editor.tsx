"use client";

import { useRef } from "react";
import { CalendarDays, Download, FileUp, X } from "lucide-react";
import type { LeaveTypeConfig } from "@/lib/api/leave-config-service";
import { SectionHeader, ToggleRow } from "./leave-config-controls";

export function LeaveAutoApprovalEditor({ leaveType, onChange, onAction }: {
  leaveType: LeaveTypeConfig;
  onChange: (value: LeaveTypeConfig) => void;
  onAction: (action: "upload" | "template" | "remove", value?: File | string) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rules = leaveType.autoApprovalRules ?? { enabled: false, monthlyThresholdDays: 1, bypassDates: [] };
  const patch = (value: Partial<typeof rules>) => onChange({ ...leaveType, autoApprovalRules: { ...rules, ...value } });
  const configured = leaveType.approvalWorkflow.isApprovalRequired && leaveType.approvalWorkflow.levels.length > 0;
  return (
    <section className="leave-section">
      <SectionHeader
        title="Monthly Auto-Approval"
        description="Requests within the monthly allowance are auto-approved. Bypass dates and excess days follow the approval workflow."
        action={rules.enabled ? (
          <div className="leave-section-actions">
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" aria-label="Upload bypass dates" hidden
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void onAction("upload", file);
              }} />
            <button type="button" className="leave-secondary-btn small" onClick={() => void onAction("template")}>
              <Download size={14} /> Download Template
            </button>
            <button type="button" className="leave-secondary-btn small" onClick={() => fileInputRef.current?.click()}>
              <FileUp size={14} /> Upload Dates
            </button>
          </div>
        ) : undefined}
      />
      <div className="leave-setting-list">
        <ToggleRow
          title={`Enable for ${leaveType.name}`}
          description={configured
            ? "Evaluate the monthly allowance and bypass dates for this leave type."
            : "Enable Approval Required and add an approval level before enabling this rule."}
          checked={rules.enabled}
          disabled={!configured && !rules.enabled}
          onChange={(enabled) => patch({ enabled })}
        />
        {rules.enabled && <>
          <label className="leave-field compact">
            <span>Auto-Approval Days per Calendar Month</span>
            <input type="number" min={0} max={31} step={1} value={rules.monthlyThresholdDays}
              onChange={(event) => patch({ monthlyThresholdDays: Number(event.target.value) })} />
          </label>
          <div className="leave-setup-note">
            Approved and pending days count separately for each leave type, excluding bypass-date requests. Set zero to require approval for every request.
          </div>
        </>}
      </div>
      {rules.enabled && <>
        <div className="leave-setting-list">
          <div className="leave-toggle-row">
            <span>
              <strong>Bypass Dates</strong>
              <small>These dates always require approval and do not use the monthly allowance. Upload a Date column as YYYY-MM-DD text; format Excel cells as Text before entering dates.</small>
              <small>Uploads save your current configuration first. Duplicate dates are skipped; invalid rows change nothing.</small>
            </span>
            <CalendarDays size={18} aria-hidden />
          </div>
        </div>
        <div className="leave-table-wrap">
          <table className="leave-table">
            <thead><tr><th>Date</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rules.bypassDates.map((date) => <tr key={date}>
                <td>{date}</td>
                <td><button type="button" className="leave-table-remove" aria-label={`Remove bypass date ${date}`}
                  onClick={() => void onAction("remove", date)}><X size={14} /></button></td>
              </tr>)}
              {rules.bypassDates.length === 0 && <tr><td colSpan={2}>
                <div className="leave-empty-inline">No bypass dates configured. Upload a file to add dates.</div>
              </td></tr>}
            </tbody>
          </table>
        </div>
      </>}
    </section>
  );
}
