"use client";

import type { ReportOutputSettings } from "@/lib/api/report-config-service";

interface SectionOutputSettingsProps {
  outputSettings: ReportOutputSettings;
  onChange: (settings: ReportOutputSettings) => void;
}

export function SectionOutputSettings({
  outputSettings,
  onChange,
}: SectionOutputSettingsProps) {
  return (
    <div className="space-y-6">
      {/* File Format */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">File Format</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...outputSettings, fileFormat: "xls" })}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
              outputSettings.fileFormat === "xls"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-2xl mb-1">📊</span>
            <span className="text-sm font-medium text-gray-800">XLS</span>
            <span className="text-xs text-gray-500">.xlsx format</span>
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...outputSettings, fileFormat: "csv" })}
            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
              outputSettings.fileFormat === "csv"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-2xl mb-1">📄</span>
            <span className="text-sm font-medium text-gray-800">CSV</span>
            <span className="text-xs text-gray-500">.csv format</span>
          </button>
        </div>
      </div>

      {/* Export Behaviour */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Export Behaviour</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({ ...outputSettings, exportBehaviour: "load-then-export" })
            }
            className={`flex flex-col items-start p-4 rounded-lg border-2 transition-colors ${
              outputSettings.exportBehaviour === "load-then-export"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-sm font-medium text-gray-800">Load then Export</span>
            <span className="text-xs text-gray-500 mt-1">
              Load data into table first, then export
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ ...outputSettings, exportBehaviour: "direct" })
            }
            className={`flex flex-col items-start p-4 rounded-lg border-2 transition-colors ${
              outputSettings.exportBehaviour === "direct"
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="text-sm font-medium text-gray-800">Direct Export</span>
            <span className="text-xs text-gray-500 mt-1">
              Export immediately without loading table
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
