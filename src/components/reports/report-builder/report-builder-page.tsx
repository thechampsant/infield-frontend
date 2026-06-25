"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-sm font-semibold text-white">{number}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
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
      setErrors({ selectedColumns: "At least one column must be selected before previewing." });
      return;
    }
    // Preview would typically open a modal with sample data
    // For now, we just trigger the API
    setIsPreviewing(true);
    try {
      if (reportId) {
        await reportConfigService.previewReport({ reportId });
      }
    } catch {
      // Preview is best-effort
    } finally {
      setIsPreviewing(false);
    }
  }, [selectedColumns, reportId]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => router.push(baseUrl)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
    <div className="pb-20">
      {/* Page Header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push(baseUrl)}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
          Report Builder
        </p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={handleSaveReport}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Save Report
            </button>
          </div>
        </div>
      </div>

      {/* Save error */}
      {errors._save && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
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
    </div>
  );
}
