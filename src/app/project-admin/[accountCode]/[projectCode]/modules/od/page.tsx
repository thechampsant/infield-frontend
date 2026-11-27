"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleAlert, ClipboardList, MapPin, Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { designationService, formatApiError } from "@/lib/api";
import type { Designation } from "@/lib/api/designation-service";
import { odConfigService, type OdConfiguration, type OdTemplate, type OdTemplateInput } from "@/lib/api/od-config-service";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageModules } from "@/lib/auth/permissions";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { OdCityMaster } from "./od-city-master";
import { OdTemplateEditor } from "./od-template-editor";
import styles from "./od-configuration.module.css";

const newTemplate: OdTemplateInput = {
  name: "",
  designationIds: [],
  approverDesignationId: "",
  isActive: true,
  affectsAttendance: false,
  requiresOdForStoreVisits: false,
  dailyVisitLimit: 10,
};

function templateInput(template?: OdTemplate): OdTemplateInput {
  if (!template) return newTemplate;
  const { name, designationIds, approverDesignationId, isActive, affectsAttendance, requiresOdForStoreVisits, dailyVisitLimit } = template;
  return { name, designationIds, approverDesignationId, isActive, affectsAttendance, requiresOdForStoreVisits, dailyVisitLimit };
}

type Section = "templates" | "cities";
type Notice = { kind: "success" | "error"; message: string };

function OdConfigurationPage({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const canEdit = canManageModules(user);
  const [config, setConfig] = useState<OdConfiguration | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [section, setSection] = useState<Section>("templates");
  const [draft, setDraft] = useState<OdTemplateInput>(newTemplate);
  const [selectedId, setSelectedId] = useState<string>();
  const [pending, setPending] = useState<"save" | "activation">();
  const [notice, setNotice] = useState<Notice>();

  useEffect(() => {
    let disposed = false;
    Promise.all([odConfigService.get(projectId), designationService.listByProject(projectId)])
      .then(([settings, options]) => {
        if (disposed) return;
        setConfig(settings);
        setDesignations([...options].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedId(settings.templates[0]?.id);
        setDraft(templateInput(settings.templates[0]));
      })
      .catch((reason: unknown) => {
        if (!disposed) setNotice({ kind: "error", message: formatApiError(reason, "Could not load OD configuration.") });
      });
    return () => { disposed = true; };
  }, [projectId]);

  const selected = config?.templates.find((template) => template.id === selectedId);
  const dirty = JSON.stringify(templateInput(selected)) !== JSON.stringify(draft);
  const needsTemplate = config && !config.isActive && !config.templates.some(({ isActive }) => isActive);

  function select(template?: OdTemplate) {
    setSelectedId(template?.id);
    setDraft(templateInput(template));
    setNotice(undefined);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || pending || !config || !dirty) return;
    setNotice(undefined);
    if (draft.designationIds.length === 0) {
      setNotice({ kind: "error", message: "Select at least one eligible designation." });
      return;
    }
    setPending("save");
    try {
      const saved = await odConfigService.save(projectId, { ...draft, name: draft.name.trim() }, selectedId);
      const templates = selectedId
        ? config.templates.map((template) => template.id === selectedId ? saved : template)
        : [...config.templates, saved];
      setConfig({ ...config, templates: templates.sort((a, b) => a.name.localeCompare(b.name)) });
      select(saved);
      setNotice({ kind: "success", message: "OD template saved." });
    } catch (reason) {
      setNotice({ kind: "error", message: formatApiError(reason, "Could not save the OD template.") });
    } finally {
      setPending(undefined);
    }
  }

  async function activate() {
    if (!canEdit || pending || !config || needsTemplate) return;
    setNotice(undefined);
    setPending("activation");
    try {
      const updated = await odConfigService.activate(projectId, !config.isActive);
      setConfig(updated);
      setNotice({ kind: "success", message: updated.isActive ? "OD enabled." : "OD disabled." });
    } catch (reason) {
      setNotice({ kind: "error", message: formatApiError(reason, "Could not change OD activation.") });
    } finally {
      setPending(undefined);
    }
  }

  return (
    <>
      {config && (
        <div className={styles.modulePanel}>
          <div>
            <h2>Module status</h2>
            <p>{needsTemplate ? "Save an active template to enable OD." : "Control access to OD for this project."}</p>
          </div>
          <div className={styles.moduleActions}>
            <span className={styles.status} data-active={config.isActive}>
              {config.isActive ? "Enabled" : "Disabled"}
            </span>
            {canEdit && (
              <button
                type="button"
                className={config.isActive ? styles.secondaryButton : styles.primaryButton}
                disabled={Boolean(pending || needsTemplate)}
                onClick={() => void activate()}
              >
                {pending === "activation" ? "Updating…" : config.isActive ? "Disable OD" : "Enable OD"}
              </button>
            )}
          </div>
        </div>
      )}
      {notice && (
        <div className={styles.notice} data-kind={notice.kind} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.kind === "error" ? <CircleAlert size={17} aria-hidden /> : <CheckCircle2 size={17} aria-hidden />}
          <span>{notice.message}</span>
        </div>
      )}
      {!config && !notice && <OdLoading />}
      {config && (
        <>
          <nav className={styles.sectionNav} aria-label="OD configuration sections">
            <button type="button" aria-pressed={section === "templates"} aria-controls="od-templates-panel" onClick={() => setSection("templates")}>
              <ClipboardList size={17} aria-hidden /> Templates
            </button>
            <button type="button" aria-pressed={section === "cities"} aria-controls="od-city-panel" onClick={() => setSection("cities")}>
              <MapPin size={17} aria-hidden /> City Master
            </button>
          </nav>
          <div id="od-templates-panel" hidden={section !== "templates"}>
            <div className={styles.workspace}>
              <aside className={styles.card} aria-labelledby="od-template-list">
                <div className={styles.cardHeader}>
                  <h2 id="od-template-list">OD templates</h2>
                  {canEdit && <button type="button" className={styles.textButton} disabled={Boolean(pending)} onClick={() => select()}>
                    <Plus size={16} aria-hidden /> New template
                  </button>}
                </div>
                <div className={styles.templateList}>
                  {config.templates.length === 0 && (
                    <div className={styles.emptyState}>
                      <ClipboardList size={24} aria-hidden />
                      <strong>No templates yet</strong>
                      {canEdit && <p>Set up a template to assign designations and approval rules.</p>}
                    </div>
                  )}
                  {config.templates.map((template) => (
                    <button
                      className={styles.templateItem}
                      key={template.id}
                      type="button"
                      aria-pressed={selectedId === template.id}
                      disabled={Boolean(pending)}
                      onClick={() => select(template)}
                    >
                      <span className={styles.templateName}>{template.name}</span>
                      <span className={styles.templateMeta}>
                        <span>{template.designationIds.length} {template.designationIds.length === 1 ? "designation" : "designations"}</span>
                        <span className={styles.status} data-active={template.isActive}>{template.isActive ? "Active" : "Inactive"}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>
              {(selected || canEdit) && (
                <OdTemplateEditor
                  key={selectedId ?? "new"}
                  template={selected}
                  draft={draft}
                  designations={designations}
                  canEdit={canEdit}
                  saving={pending === "save"}
                  busy={Boolean(pending)}
                  dirty={dirty}
                  onChange={setDraft}
                  onReset={() => select(selected)}
                  onSubmit={save}
                />
              )}
            </div>
          </div>
          <div id="od-city-panel" hidden={section !== "cities"}>
            <OdCityMaster projectId={projectId} cityMasterCount={config.cityMasterCount} canEdit={canEdit} />
          </div>
        </>
      )}
    </>
  );
}

function OdLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.srOnly}>Loading OD configuration…</span>
      <div /><div />
    </div>
  );
}

export default function OdModulePage() {
  const { accountCode, projectCode, projectName, projectId, loading, error } = useProjectContext();
  const modulesPath = `/project-admin/${encodeURIComponent(accountCode)}/${encodeURIComponent(projectCode)}/modules`;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.backLink} href={modulesPath}><ArrowLeft size={16} aria-hidden /> Back to Modules</Link>
        <header className={styles.pageHeader}>
          <div className={styles.pageIcon}><CalendarDays size={25} aria-hidden /></div>
          <div>
            <h1>OD Configuration</h1>
            <p>Manage OD templates, approvals, and City Master{projectName ? ` for ${projectName}` : ""}.</p>
          </div>
        </header>
        {loading ? <OdLoading /> : error || !projectId ? (
          <div className={styles.notice} data-kind="error" role="alert"><CircleAlert size={17} aria-hidden /> {error ?? "Project not found."}</div>
        ) : <OdConfigurationPage key={projectId} projectId={projectId} />}
      </div>
    </div>
  );
}
