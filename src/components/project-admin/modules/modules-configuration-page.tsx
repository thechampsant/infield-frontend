"use client";

import { useCallback, useEffect, useState } from "react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ModuleCard } from "@/components/project-admin/modules/module-card";
import { formatApiError } from "@/lib/api";
import {
  featureConfigService,
  type ProjectModuleState,
} from "@/lib/api/feature-config-service";
import { leaveConfigService } from "@/lib/api/leave-config-service";
import { salesConfigService } from "@/lib/api/sales-config-service";
import { projectAdminBase } from "@/lib/nav/nav";
import { useProjectContext } from "@/lib/project-admin/project-context";

export function ModulesConfigurationPage() {
  const { projectId, accountCode, projectCode, loading: ctxLoading } =
    useProjectContext();

    
  const base = projectAdminBase(accountCode, projectCode);

  const [modules, setModules] = useState<ProjectModuleState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await featureConfigService.getByProject(projectId);
      setModules(list);
    } catch (err) {
      setError(formatApiError(err, "Failed to load module configuration"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (ctxLoading || !projectId) return;
    load();
  }, [ctxLoading, projectId, load]);

  /** Modules with dedicated activation endpoints (wizard-gated). */
  const WIZARD_GATED_MODULES = new Set(["leave", "sales"]);

  async function handleToggle(moduleId: string, enabled: boolean) {
    let moduleName = "Module";
    const previous = modules.find((m) => m.definition.id === moduleId)?.enabled;
    setModules((prev) =>
      prev.map((m) => {
        if (m.definition.id === moduleId) {
          moduleName = m.definition.name;
          return { ...m, enabled };
        }
        return m;
      }),
    );

    try {
      if (!projectId) throw new Error("Project not found");
      setSavingModuleId(moduleId);

      if (moduleId === "leave") {
        if (enabled) {
          await leaveConfigService.activate(projectId);
        } else {
          await leaveConfigService.deactivate(projectId);
        }
      } else if (moduleId === "sales") {
        if (enabled) {
          await salesConfigService.activate(projectId);
        } else {
          await salesConfigService.deactivate(projectId);
        }
      } else {
        // All other modules (resources, notifications, custom-view, etc.)
        // use the generic feature-config toggle endpoint.
        await featureConfigService.updateModuleStatus(projectId, moduleId, enabled);
      }

      const name = moduleName;
      setToast({
        type: "success",
        message: enabled
          ? `${name} enabled. Changes take effect immediately.`
          : `${name} disabled. Changes take effect immediately.`,
      });
    } catch (err) {
      if (typeof previous === "boolean") {
        setModules((prev) =>
          prev.map((m) =>
            m.definition.id === moduleId ? { ...m, enabled: previous } : m,
          ),
        );
      }
      setToast({
        type: "error",
        message: formatApiError(
          err,
          enabled
            ? `${moduleName} could not be activated. Complete configuration first.`
            : `${moduleName} could not be deactivated.`,
        ),
      });
    } finally {
      setSavingModuleId(null);
    }
  }

  function handleConfigUnavailable(name: string) {
    setToast({
      type: "success",
      message: `${name} configuration is coming soon.`,
    });
  }

  if (ctxLoading || (loading && !modules.length)) {
    return <div className="pa-loading">Loading modules…</div>;
  }

  if (error) {
    return (
      <div
        className="pa-info-banner"
        style={{
          color: "var(--red)",
          background: "var(--red-light)",
          borderColor: "var(--red-mid)",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="pa-page-header">
        <div>
          <div className="pa-eyebrow">Setup</div>
          <div className="pa-page-title">Module Configuration</div>
          <div className="pa-page-desc">
            Enable or disable modules for this project
          </div>
        </div>
      </div>

      <div className="pa-info-banner">
        Changes take effect immediately.
      </div>

      <div className="pa-mod-grid">
        {modules.map((mod) => {
          const path =
            mod.definition.id === "visits"
              ? "modules/visit"
              : mod.definition.configPath;
          const alwaysShowConfig =
            mod.definition.id === "leave" || mod.definition.id === "sales";
          const configHref =
            path && (mod.enabled || alwaysShowConfig)
              ? `${base}/${path}`
              : undefined;
          return (
            <ModuleCard
              key={mod.definition.id}
              module={mod}
              configHref={configHref}
              alwaysShowConfig={alwaysShowConfig}
              onToggle={(enabled) =>
                handleToggle(mod.definition.id, enabled)
              }
              onConfigUnavailable={() =>
                handleConfigUnavailable(mod.definition.name)
              }
            />
          );
        })}
      </div>

      {savingModuleId && (
        <div className="pa-info-banner" style={{ marginTop: 14 }}>
          Updating module status…
        </div>
      )}

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
