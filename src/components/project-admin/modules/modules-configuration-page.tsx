"use client";

import { useCallback, useEffect, useState } from "react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ModuleCard } from "@/components/project-admin/modules/module-card";
import { formatApiError } from "@/lib/api";
import {
  featureConfigService,
  type ProjectModuleState,
} from "@/lib/api/feature-config-service";
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

  function handleToggle(moduleId: string, enabled: boolean) {
    let moduleName = "Module";
    setModules((prev) =>
      prev.map((m) => {
        if (m.definition.id === moduleId) {
          moduleName = m.definition.name;
          return { ...m, enabled };
        }
        return m;
      }),
    );
    const name = moduleName;
    setToast({
      type: "success",
      message: enabled
        ? `${name} enabled. Changes take effect immediately.`
        : `${name} disabled. Changes take effect immediately.`,
    });
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
          const path = mod.definition.configPath;
          const configHref =
            path && mod.enabled ? `${base}/${path}` : undefined;
          return (
            <ModuleCard
              key={mod.definition.id}
              module={mod}
              configHref={configHref}
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

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
