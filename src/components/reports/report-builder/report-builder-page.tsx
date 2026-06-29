"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { reportConfigService } from "@/lib/api/report-config-service";
import { designationService } from "@/lib/api/designation-service";
import { useProjectContext } from "@/lib/project-admin/project-context";
import type {
  ReportConfigDocument,
  ReportDataSource,
  ReportFieldMetadata,
  ReportCalculatedField,
  ReportFilter,
  ReportJoinConfig,
  ReportDataScope,
  ReportOutputSettings,
  CreateReportConfigInput,
} from "@/lib/api/report-config-service";
import type { Designation } from "@/lib/api";
import { SectionReportDetails } from "./section-report-details";
import { SectionBaseDataset } from "./section-base-dataset";
import { SectionFieldsColumns } from "./section-fields-columns";
import { SectionCalculatedFields } from "./section-calculated-fields";
import { SectionFilters } from "./section-filters";
import { SectionOutputSettings } from "./section-output-settings";
import { SectionPlaceholder } from "./section-placeholder";
import { BottomActionBar, type AutoSaveStatus } from "./bottom-action-bar";
import type { SelectedField } from "./field-picker-panel";

// ─── Props ──────────────────────────────────────────────────────────────────

interface ReportBuilderPageProps {
  accountCode: string;
  projectCode: string;
  reportId?: string; // If provided, edit mode
}

// ─── Section Card Wrapper ───────────────────────────────────────────────────

function SectionCard({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#dde6f0] bg-white p-5 shadow-[0_2px_8px_rgba(30,95,168,0.08)]">
      <div className="flex items-start gap-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f0f6ff] text-[#1e5fa8]">
          <span className="text-sm font-bold">{number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#0c1929]">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-sm leading-6 text-[#3a5272]">{subtitle}</p>
          )}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReportBuilderPage({
  accountCode,
  projectCode,
  reportId,
}: ReportBuilderPageProps) {
  const router = useRouter();
  const { projectId } = useProjectContext();
  const isEditMode = !!reportId;
  const baseUrl = `/project-admin/${accountCode}/${projectCode}/reports`;

  // ─── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<ReportDataSource[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  // Form state
  const [reportName, setReportName] = useState("");
  const [description, setDescription] = useState("");
  const [accessRoles, setAccessRoles] = useState<string[]>([]);
  const [primarySourceKey, setPrimarySourceKey] = useState("");
  const [primaryCollectionName, setPrimaryCollectionName] = useState("");
  const [secondaryEnabled, setSecondaryEnabled] = useState(false);
  const [secondarySourceKey, setSecondarySourceKey] = useState("");
  const [secondaryCollectionName, setSecondaryCollectionName] = useState("");
  const [joinConfig, setJoinConfig] = useState<ReportJoinConfig | null>(null);
  const [dataScope, setDataScope] = useState<ReportDataScope>({});
  const [selectedColumns, setSelectedColumns] = useState<SelectedField[]>([]);
  const [calculatedFieldsEnabled, setCalculatedFieldsEnabled] = useState(false);
  const [calculatedFields, setCalculatedFields] = useState<ReportCalculatedField[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [outputSettings, setOutputSettings] = useState<ReportOutputSettings>({
    fileFormat: "xls",
    exportBehaviour: "load-then-export",
  });

  // Fields fetched from API
  const [primaryFields, setPrimaryFields] = useState<ReportFieldMetadata[]>([]);
  const [secondaryFields, setSecondaryFields] = useState<ReportFieldMetadata[]>([]);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("saved");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<{
    columns: { key: string; type: string }[];
    data: Record<string, unknown>[];
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ─── Load initial data ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!projectId) return;
      try {
        setLoading(true);
        const [sources, desigs] = await Promise.all([
          reportConfigService.getDataSources(projectId),
          designationService.listByProject(projectId),
        ]);

        if (!mounted) return;
        setDataSources(sources);
        setDesignations(desigs);

        // If edit mode, load existing config
        if (reportId) {
          const config = await reportConfigService.getConfig(reportId);
          if (!mounted) return;
          populateForm(config);
        }

        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load report data",
        );
        setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [reportId, projectId]);

  // ─── Fetch fields when source changes ─────────────────────────────────────
  useEffect(() => {
    if (!primarySourceKey) {
      setPrimaryFields([]);
      return;
    }
    reportConfigService
      .getSourceFields(primarySourceKey, projectId || '')
      .then(setPrimaryFields)
      .catch(() => setPrimaryFields([]));
  }, [primarySourceKey]);

  useEffect(() => {
    if (!secondaryEnabled || !secondarySourceKey) {
      setSecondaryFields([]);
      return;
    }
    reportConfigService
      .getSourceFields(secondarySourceKey, projectId || '')
      .then(setSecondaryFields)
      .catch(() => setSecondaryFields([]));
  }, [secondaryEnabled, secondarySourceKey]);

  // ─── Mark unsaved on changes ──────────────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      setAutoSaveStatus("unsaved");
    }
  }, [
    reportName,
    description,
    accessRoles,
    primarySourceKey,
    secondaryEnabled,
    secondarySourceKey,
    joinConfig,
    dataScope,
    selectedColumns,
    calculatedFields,
    filters,
    outputSettings,
  ]);

  // ─── Populate form from existing config ───────────────────────────────────
  const populateForm = useCallback((config: ReportConfigDocument) => {
    setReportName(config.reportName || "");
    setDescription(config.description || "");
    setAccessRoles(config.accessRoles || []);
    setPrimarySourceKey(config.primarySource?.sourceKey || "");
    setPrimaryCollectionName(config.primarySource?.collectionName || "");

    if (config.secondarySource) {
      setSecondaryEnabled(true);
      setSecondarySourceKey(config.secondarySource.sourceKey);
      setSecondaryCollectionName(config.secondarySource.collectionName);
    }

    setJoinConfig(config.joinConfig || null);
    setDataScope(config.dataScope || {});
    setSelectedColumns(
      (config.selectedColumns || []).map((col) => ({
        fieldKey: col.fieldKey,
        sourceKey: col.sourceKey,
        headerName: col.headerName,
        fieldType: col.fieldType,
        displayName: col.headerName,
      })),
    );

    if (config.calculatedFields && config.calculatedFields.length > 0) {
      setCalculatedFieldsEnabled(true);
      setCalculatedFields(config.calculatedFields);
    }

    setFilters(config.filters || []);
    setOutputSettings(
      config.outputSettings || {
        fileFormat: "xls",
        exportBehaviour: "load-then-export",
      },
    );

    setAutoSaveStatus("saved");
  }, []);

  // ─── Handle source change: clear orphaned fields ──────────────────────────
  const handlePrimarySourceChange = useCallback(
    (sourceKey: string, collectionName: string) => {
      setPrimarySourceKey(sourceKey);
      setPrimaryCollectionName(collectionName);
      // Remove columns/filters belonging to old primary source
      setSelectedColumns((prev) =>
        prev.filter((c) => c.sourceKey !== primarySourceKey),
      );
      setFilters((prev) =>
        prev.filter((f) => f.sourceKey !== primarySourceKey),
      );
    },
    [primarySourceKey],
  );

  const handleSecondaryToggle = useCallback(
    (enabled: boolean) => {
      setSecondaryEnabled(enabled);
      if (!enabled) {
        // Remove secondary-related data
        setSecondarySourceKey("");
        setSecondaryCollectionName("");
        setJoinConfig(null);
        setSelectedColumns((prev) =>
          prev.filter((c) => c.sourceKey !== secondarySourceKey),
        );
        setFilters((prev) =>
          prev.filter((f) => f.sourceKey !== secondarySourceKey),
        );
      }
    },
    [secondarySourceKey],
  );

  const handleSecondarySourceChange = useCallback(
    (sourceKey: string, collectionName: string) => {
      // Remove columns/filters from old secondary source
      setSelectedColumns((prev) =>
        prev.filter((c) => c.sourceKey !== secondarySourceKey),
      );
      setFilters((prev) =>
        prev.filter((f) => f.sourceKey !== secondarySourceKey),
      );
      setSecondarySourceKey(sourceKey);
      setSecondaryCollectionName(collectionName);
      setJoinConfig({ joinType: "left", primaryKeyField: "", secondaryKeyField: "" });
    },
    [secondarySourceKey],
  );

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = useCallback(
    (isDraft: boolean): boolean => {
      const newErrors: Record<string, string> = {};

      if (!isDraft) {
        if (!reportName.trim()) {
          newErrors.reportName = "Report name is required.";
        }
        if (accessRoles.length === 0) {
          newErrors.accessRoles = "At least one role/designation is required.";
        }
        if (!primarySourceKey) {
          newErrors.primarySource = "Primary source is required.";
        }
        if (selectedColumns.length === 0) {
          newErrors.selectedColumns = "At least one column must be selected.";
        }
        if (
          secondaryEnabled &&
          (!joinConfig?.primaryKeyField || !joinConfig?.secondaryKeyField)
        ) {
          newErrors.joinKey = "Both join key fields are required.";
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [reportName, accessRoles, primarySourceKey, selectedColumns, secondaryEnabled, joinConfig],
  );

  // ─── Build config payload ─────────────────────────────────────────────────
  const buildPayload = useCallback(
    (status: "draft" | "published"): CreateReportConfigInput => ({
      projectId: projectId || '',
      reportName: reportName.trim(),
      description: description.trim(),
      accessRoles,
      primarySource: {
        sourceKey: primarySourceKey,
        collectionName: primaryCollectionName,
      },
      secondarySource: secondaryEnabled
        ? { sourceKey: secondarySourceKey, collectionName: secondaryCollectionName }
        : null,
      joinConfig: secondaryEnabled ? joinConfig : null,
      dataScope,
      selectedColumns: selectedColumns.map((col, index) => ({
        fieldKey: col.fieldKey,
        sourceKey: col.sourceKey,
        headerName: col.headerName,
        order: index + 1,
        fieldType: col.fieldType,
      })),
      calculatedFields: calculatedFieldsEnabled ? calculatedFields : [],
      filters,
      outputSettings,
      status,
    }),
    [
      projectId,
      reportName,
      description,
      accessRoles,
      primarySourceKey,
      primaryCollectionName,
      secondaryEnabled,
      secondarySourceKey,
      secondaryCollectionName,
      joinConfig,
      dataScope,
      selectedColumns,
      calculatedFieldsEnabled,
      calculatedFields,
      filters,
      outputSettings,
    ],
  );

  // ─── Save handlers ────────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    if (!validate(true)) return;
    setIsSaving(true);
    try {
      const payload = buildPayload("draft");
      if (isEditMode && reportId) {
        await reportConfigService.updateConfig(reportId, payload);
      } else {
        await reportConfigService.createConfig(payload);
      }
      setAutoSaveStatus("saved");
      router.push(baseUrl);
    } catch (err) {
      setErrors({
        _save: err instanceof Error ? err.message : "Failed to save draft.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [validate, buildPayload, isEditMode, reportId, router, baseUrl]);

  const handleSaveReport = useCallback(async () => {
    if (!validate(false)) return;
    setIsSaving(true);
    try {
      const payload = buildPayload("published");
      if (isEditMode && reportId) {
        await reportConfigService.updateConfig(reportId, payload);
      } else {
        await reportConfigService.createConfig(payload);
      }
      setAutoSaveStatus("saved");
      router.push(baseUrl);
    } catch (err) {
      setErrors({
        _save: err instanceof Error ? err.message : "Failed to save report.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [validate, buildPayload, isEditMode, reportId, router, baseUrl]);

  const handleCancel = useCallback(() => {
    if (autoSaveStatus === "unsaved") {
      if (!window.confirm("You have unsaved changes. Discard and go back?")) {
        return;
      }
    }
    router.push(baseUrl);
  }, [autoSaveStatus, router, baseUrl]);

  const handlePreview = useCallback(async () => {
    if (selectedColumns.length === 0) {
      setErrors({ selectedColumns: "Select at least one column before previewing." });
      return;
    }

    setIsPreviewing(true);
    setErrors({});
    try {
      let activeReportId = reportId;

      // For new unsaved reports: silently save as draft first to get an ID
      if (!activeReportId) {
        const payload = buildPayload('draft');
        const saved = await reportConfigService.createConfig(payload);
        activeReportId = saved._id;
      }

      if (!activeReportId) return;

      const result = await reportConfigService.previewReport({
        reportId: activeReportId,
      });

      setPreviewData({
        columns: result.columns || [],
        data: result.data || [],
      });
      setPreviewOpen(true);
    } catch (err) {
      setErrors({
        _save: 'Preview failed: ' + (err instanceof Error ? err.message : 'Unknown error'),
      });
    } finally {
      setIsPreviewing(false);
    }
  }, [selectedColumns, reportId, buildPayload]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-[#ffd5d3] bg-[#fff0ef] p-8 text-center">
        <p className="mb-4 text-sm font-medium text-[#e8382d]">{error}</p>
        <button
          type="button"
          onClick={() => router.push(baseUrl)}
          className="rounded-lg bg-[#1e5fa8] px-4 py-2 text-sm font-bold text-white hover:bg-[#174d88]"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  const pageTitle = isEditMode
    ? reportName
      ? reportName.length > 60
        ? `${reportName.slice(0, 60)}...`
        : reportName
      : "Edit Report"
    : "New Report";

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push(baseUrl)}
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#3a5272] hover:text-[#1e5fa8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#1e5fa8]">
          Report Builder
        </p>
        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0c1929]">{pageTitle}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#3a5272]">
              Configure the dataset, columns, filters, and export behavior for this project report.
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="rounded-lg border border-[#c8d8eb] bg-white px-4 py-2 text-sm font-bold text-[#3a5272] hover:bg-[#f7fafd] disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleSaveReport}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1e5fa8] px-4 py-2 text-sm font-bold text-white hover:bg-[#174d88] disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save Report
            </button>
          </div>
        </div>
      </div>

      {/* Save error */}
      {errors._save && (
        <div className="mb-4 rounded-lg border border-[#ffd5d3] bg-[#fff0ef] p-3 text-sm font-medium text-[#e8382d]">
          {errors._save}
        </div>
      )}

      {/* Section Cards */}
      <div className="space-y-4">
        {/* Section 1: Report Details */}
        <SectionCard number={1} title="Report Details" subtitle="Name, description, and access roles">
          <SectionReportDetails
            reportName={reportName}
            description={description}
            accessRoles={accessRoles}
            designations={designations}
            onReportNameChange={setReportName}
            onDescriptionChange={setDescription}
            onAccessRolesChange={setAccessRoles}
            errors={errors}
          />
        </SectionCard>

        {/* Section 2: Base Dataset */}
        <SectionCard number={2} title="Base Dataset" subtitle="Select primary and secondary data sources">
          <SectionBaseDataset
            dataSources={dataSources}
            primarySourceKey={primarySourceKey}
            secondaryEnabled={secondaryEnabled}
            secondarySourceKey={secondarySourceKey}
            joinConfig={joinConfig}
            dataScope={dataScope}
            primaryFields={primaryFields}
            secondaryFields={secondaryFields}
            onPrimarySourceChange={handlePrimarySourceChange}
            onSecondaryToggle={handleSecondaryToggle}
            onSecondarySourceChange={handleSecondarySourceChange}
            onJoinConfigChange={setJoinConfig}
            onDataScopeChange={setDataScope}
            errors={errors}
          />
        </SectionCard>

        {/* Section 3: Fields & Columns */}
        <SectionCard number={3} title="Fields & Columns" subtitle="Choose and configure report columns">
          <SectionFieldsColumns
            primaryFields={primaryFields}
            primarySourceKey={primarySourceKey}
            secondaryFields={secondaryFields}
            secondarySourceKey={secondarySourceKey}
            selectedColumns={selectedColumns}
            onSelectionChange={setSelectedColumns}
            errors={errors}
          />
        </SectionCard>

        {/* Section 3b: Calculated Fields */}
        <SectionCard number={3} title="Calculated Fields" subtitle="Add derived fields using formulas">
          <SectionCalculatedFields
            enabled={calculatedFieldsEnabled}
            calculatedFields={calculatedFields}
            onToggle={setCalculatedFieldsEnabled}
            onFieldsChange={setCalculatedFields}
            availableFieldKeys={[
              ...primaryFields.map((f) => ({ fieldKey: f.fieldKey, displayName: f.displayName, fieldType: f.fieldType, sourceKey: primarySourceKey })),
              ...secondaryFields.map((f) => ({ fieldKey: f.fieldKey, displayName: f.displayName, fieldType: f.fieldType, sourceKey: secondarySourceKey })),
            ]}
          />
        </SectionCard>

        {/* Section 4: Filters */}
        <SectionCard number={4} title="Filters" subtitle="Configure runtime filter controls">
          <SectionFilters
            primaryFields={primaryFields}
            primarySourceKey={primarySourceKey}
            secondaryFields={secondaryFields}
            secondarySourceKey={secondarySourceKey}
            selectedFilters={filters}
            onFiltersChange={setFilters}
          />
        </SectionCard>

        {/* Section 5: Output Settings */}
        <SectionCard number={5} title="Output Settings" subtitle="File format and export behaviour">
          <SectionOutputSettings
            outputSettings={outputSettings}
            onChange={setOutputSettings}
          />
        </SectionCard>

        {/* Section 6: Schedule & Share (Placeholder) */}
        <SectionPlaceholder
          sectionNumber={6}
          title="Schedule & Share"
          description="Automate report generation and share with team members on a schedule."
        />

        {/* Section 7: AI Assist (Placeholder) */}
        <SectionPlaceholder
          sectionNumber={7}
          title="AI Assist"
          description="Get AI-powered suggestions for report configuration and data insights."
        />
      </div>

      {/* Bottom Action Bar */}
      <BottomActionBar
        autoSaveStatus={autoSaveStatus}
        onCancel={handleCancel}
        onPreview={handlePreview}
        onSaveDraft={handleSaveDraft}
        onSaveReport={handleSaveReport}
        isSaving={isSaving}
        isPreviewing={isPreviewing}
      />

      {/* Preview slide-over */}
      {previewOpen && previewData && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="flex w-[80vw] flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dde6f0] px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#0c1929]">Report Preview</h2>
                <p className="mt-0.5 text-sm text-[#3a5272]">
                  Showing up to 20 rows · {previewData.data.length} rows returned
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-md p-2 text-[#7a95b5] hover:bg-[#f7fafd]"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {previewData.data.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#3a5272]">
                  No data available for preview. Check your data source and filters.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[#dde6f0]">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-[#f7fafd]">
                      <tr>
                        {previewData.columns.map((col) => (
                          <th
                            key={col.key}
                            className="whitespace-nowrap px-3 py-2 text-left text-xs font-bold uppercase text-[#3a5272]"
                          >
                            {col.key}
                            {col.type === 'NUM' && (
                              <span className="ml-1 text-teal-500 font-normal normal-case">#</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#dde6f0] bg-white">
                      {previewData.data.map((row, i) => (
                        <tr key={i} className="hover:bg-[#f7fafd]">
                          {previewData.columns.map((col) => {
                            const val = row[col.key];
                            let display: string;
                            if (val === null || val === undefined || val === '') {
                              display = '-';
                            } else if (typeof val === 'object' && val !== null) {
                              const obj = val as Record<string, unknown>;
                              if (typeof obj.full_iso === 'string') display = obj.full_iso.split('T')[0];
                              else if (typeof obj.datejs === 'string') display = obj.datejs.split('T')[0];
                              else display = JSON.stringify(val).slice(0, 50);
                            } else if (typeof val === 'number' && col.type === 'NUM') {
                              display = (Math.round(val * 100) / 100).toString();
                            } else {
                              display = String(val);
                            }
                            return (
                              <td key={col.key} className="max-w-[200px] truncate whitespace-nowrap px-3 py-2 text-[#3a5272]">
                                {display || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
