"use client";

import { useCallback } from "react";
import type {
  ReportDataSource,
  ReportFieldMetadata,
  ReportJoinConfig,
  ReportDataScope,
} from "@/lib/api/report-config-service";

interface SectionBaseDatasetProps {
  dataSources: ReportDataSource[];
  primarySourceKey: string;
  secondaryEnabled: boolean;
  secondarySourceKey: string;
  joinConfig: ReportJoinConfig | null;
  dataScope: ReportDataScope;
  primaryFields: ReportFieldMetadata[];
  secondaryFields: ReportFieldMetadata[];
  onPrimarySourceChange: (sourceKey: string, collectionName: string) => void;
  onSecondaryToggle: (enabled: boolean) => void;
  onSecondarySourceChange: (sourceKey: string, collectionName: string) => void;
  onJoinConfigChange: (config: ReportJoinConfig | null) => void;
  onDataScopeChange: (scope: ReportDataScope) => void;
  errors?: Record<string, string>;
}

export function SectionBaseDataset({
  dataSources,
  primarySourceKey,
  secondaryEnabled,
  secondarySourceKey,
  joinConfig,
  dataScope,
  primaryFields,
  secondaryFields,
  onPrimarySourceChange,
  onSecondaryToggle,
  onSecondarySourceChange,
  onJoinConfigChange,
  onDataScopeChange,
  errors = {},
}: SectionBaseDatasetProps) {
  const secondaryOptions = dataSources.filter(
    (ds) => ds.sourceKey !== primarySourceKey,
  );

  const handlePrimaryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const source = dataSources.find((ds) => ds.sourceKey === e.target.value);
      if (source) {
        onPrimarySourceChange(source.sourceKey, source.collectionName);
      }
    },
    [dataSources, onPrimarySourceChange],
  );

  const handleSecondaryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const source = dataSources.find((ds) => ds.sourceKey === e.target.value);
      if (source) {
        onSecondarySourceChange(source.sourceKey, source.collectionName);
      }
    },
    [dataSources, onSecondarySourceChange],
  );

  const handleJoinTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onJoinConfigChange({
        joinType: e.target.value as "left" | "right" | "inner",
        primaryKeyField: joinConfig?.primaryKeyField || "",
        secondaryKeyField: joinConfig?.secondaryKeyField || "",
      });
    },
    [joinConfig, onJoinConfigChange],
  );

  const handlePrimaryKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onJoinConfigChange({
        joinType: joinConfig?.joinType || "left",
        primaryKeyField: e.target.value,
        secondaryKeyField: joinConfig?.secondaryKeyField || "",
      });
    },
    [joinConfig, onJoinConfigChange],
  );

  const handleSecondaryKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onJoinConfigChange({
        joinType: joinConfig?.joinType || "left",
        primaryKeyField: joinConfig?.primaryKeyField || "",
        secondaryKeyField: e.target.value,
      });
    },
    [joinConfig, onJoinConfigChange],
  );

  return (
    <div className="space-y-5">
      {/* Primary Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Primary Source Base <span className="text-red-500">*</span>
        </label>
        <select
          value={primarySourceKey}
          onChange={handlePrimaryChange}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            errors.primarySource ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="">Select a data source...</option>
          {dataSources.map((ds) => (
            <option key={ds.sourceKey} value={ds.sourceKey}>
              {ds.displayName}
            </option>
          ))}
        </select>
        {errors.primarySource && (
          <p className="text-xs text-red-500 mt-1">{errors.primarySource}</p>
        )}
      </div>

      {/* Secondary Source Toggle */}
      <div className="border-t border-gray-100 pt-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              secondaryEnabled ? "bg-blue-600" : "bg-gray-300"
            }`}
            onClick={() => onSecondaryToggle(!secondaryEnabled)}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                secondaryEnabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            Enable Secondary Source Base
          </span>
        </label>
      </div>

      {/* Secondary Source Configuration */}
      {secondaryEnabled && (
        <div className="pl-4 border-l-2 border-blue-100 space-y-4">
          {/* Secondary Source Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Source Base
            </label>
            <select
              value={secondarySourceKey}
              onChange={handleSecondaryChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select secondary source...</option>
              {secondaryOptions.map((ds) => (
                <option key={ds.sourceKey} value={ds.sourceKey}>
                  {ds.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Join Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Join Type
            </label>
            <select
              value={joinConfig?.joinType || "left"}
              onChange={handleJoinTypeChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="left">Left Join</option>
              <option value="right">Right Join</option>
              <option value="inner">Inner Join</option>
            </select>
          </div>

          {/* Join Key Mapping */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Key Field
              </label>
              <select
                value={joinConfig?.primaryKeyField || ""}
                onChange={handlePrimaryKeyChange}
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  errors.joinKey ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">Select field...</option>
                {primaryFields.map((f) => (
                  <option key={f.fieldKey} value={f.fieldKey}>
                    {f.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Key Field
              </label>
              <select
                value={joinConfig?.secondaryKeyField || ""}
                onChange={handleSecondaryKeyChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select field...</option>
                {secondaryFields.map((f) => (
                  <option key={f.fieldKey} value={f.fieldKey}>
                    {f.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {errors.joinKey && (
            <p className="text-xs text-red-500">{errors.joinKey}</p>
          )}
        </div>
      )}

      {/* Data Scope */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Data Scope</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "activeUsers", label: "Active Users" },
            { key: "inactiveUsers", label: "Inactive Users" },
            { key: "activeStores", label: "Active Stores" },
            { key: "inactiveStores", label: "Inactive Stores" },
          ].map((scope) => (
            <label key={scope.key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  Array.isArray(
                    dataScope[scope.key as keyof ReportDataScope],
                  ) &&
                  (dataScope[scope.key as keyof ReportDataScope] as string[])
                    .length >= 0
                    ? true
                    : false
                }
                onChange={(e) => {
                  const next = { ...dataScope };
                  if (e.target.checked) {
                    (next as Record<string, string[]>)[scope.key] = [];
                  } else {
                    delete (next as Record<string, string[] | undefined>)[
                      scope.key
                    ];
                  }
                  onDataScopeChange(next);
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{scope.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
