import React from "react";
import { History } from "lucide-react";
import type { AuditEntry } from "@/types/project-admin";

interface ConnectConfigurationAuditHistoryProps {
  auditHistory: AuditEntry[];
}

const ConnectConfigurationAuditHistory: React.FC<ConnectConfigurationAuditHistoryProps> = ({
  auditHistory,
}) => {
  return (
    <section
      aria-label="Configuration audit history"
      className="border border-slate-200 rounded-xl bg-white p-6 shadow-xs"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History size={16} className="text-slate-600" />
            <span>Configuration Audit History</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Every switch change records the administrator name and the time
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {auditHistory.length} {auditHistory.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {auditHistory.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No configuration changes recorded yet for this project.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
          {auditHistory.map((entry, idx) => (
            <div
              key={`${entry.changedAt}-${idx}`}
              className="py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-slate-900">{entry.field}</span>
                <span className="text-slate-400">·</span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {entry.oldValue}
                  </span>
                  <span>→</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      entry.newValue === "On"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {entry.newValue}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <span className="font-medium text-slate-700">{entry.changedBy}</span>
                <span>•</span>
                <span>{new Date(entry.changedAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ConnectConfigurationAuditHistory;
