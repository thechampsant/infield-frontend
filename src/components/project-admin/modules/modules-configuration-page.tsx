"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info, Search, X } from "lucide-react";
import { If2Toast, type ToastState } from "@/components/accounts/if2-toast";
import { ModuleCard } from "@/components/project-admin/modules/module-card";
import { formatApiError } from "@/lib/api";
import {
  featureConfigService,
  type ProjectModuleState,
} from "@/lib/api/feature-config-service";
import { leaveConfigService } from "@/lib/api/leave-config-service";
import {
  salesConfigModuleKey,
  salesConfigService,
} from "@/lib/api/sales-config-service";
import { stockConfigService } from "@/lib/api/stock-config-service";
import {
  storeProfileConfigModuleKey,
  storeProfileConfigService,
} from "@/lib/api/store-profile-config-service";
import {
  targetVsAchievementConfigModuleKey,
  targetVsAchievementService,
} from "@/lib/api/target-vs-achievement-service";
import { projectAdminBase } from "@/lib/nav/nav";
import { useProjectContext } from "@/lib/project-admin/project-context";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageModules } from "@/lib/auth/permissions";

export function ModulesConfigurationPage() {
  const { projectId, accountCode, projectCode, loading: ctxLoading } =
    useProjectContext();
  const { user } = useAuth();
  const manageModules = canManageModules(user);

  const base = projectAdminBase(accountCode, projectCode);

  const [modules, setModules] = useState<ProjectModuleState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [list, rawConfig, salesConfigs, stockConfigs, targetConfigs, storeProfileConfigs] =
        await Promise.all([
          featureConfigService.getByProject(projectId),
          featureConfigService.getRawByProject(projectId),
          salesConfigService.list(projectId).catch(() => []),
          stockConfigService.list(projectId).catch(() => []),
          targetVsAchievementService.list(projectId).catch(() => []),
          storeProfileConfigService.list(projectId).catch(() => []),
        ]);
      const activeKeys = new Set(
        rawConfig.modules
          .filter((module) => module.isActive)
          .map((module) => module.key),
      );
      const hasActiveSalesConfig = salesConfigs.some((config) =>
        activeKeys.has(salesConfigModuleKey(config.id)),
      );
      const hasActiveStockConfig = stockConfigs.some((config) => config.isActive);
      const hasActiveTargetConfig = targetConfigs.some((config) =>
        activeKeys.has(targetVsAchievementConfigModuleKey(config.id)),
      );
      const hasActiveStoreProfileConfig = storeProfileConfigs.some((config) =>
        activeKeys.has(storeProfileConfigModuleKey(config.id)),
      );
      const hasLiveFormBuilderModule = rawConfig.modules.some(
        (module) => module.isActive && module.key.startsWith("form_builder_"),
      );
      setModules(
        list.map((module) => {
          if (module.definition.id === "sales") {
            return { ...module, enabled: hasActiveSalesConfig };
          }
          if (module.definition.id === "stock") {
            return { ...module, enabled: hasActiveStockConfig };
          }
          if (module.definition.id === "target-vs-achievement") {
            return { ...module, enabled: hasActiveTargetConfig };
          }
          if (module.definition.id === "store-profile") {
            return { ...module, enabled: hasActiveStoreProfileConfig };
          }
          if (module.definition.id === "form-builder") {
            return { ...module, enabled: hasLiveFormBuilderModule };
          }
          return module;
        }),
      );
    } catch (err) {
      setError(formatApiError(err, "Failed to load module configuration"));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (ctxLoading || !projectId) return;
    void Promise.resolve().then(load);
  }, [ctxLoading, projectId, load]);

  async function handleToggle(moduleId: string, enabled: boolean) {
    if (!manageModules) {
      setToast({
        type: "error",
        message: "You do not have permission to change module configuration.",
      });
      return;
    }
    let moduleName = "Module";
    const previous = modules.find((m) => m.definition.id === moduleId)?.enabled;

    if (moduleId === "sales") {
      setToast({
        type: "success",
        message:
          "Enable or disable individual Sales configurations from Sales Configurations.",
      });
      return;
    }

    if (moduleId === "store-profile") {
      // Like Sales/Stock/TvA, the real switch is per configuration — the AC ties
      // the toggle to a designation, which is per-config by definition.
      setToast({
        type: "success",
        message:
          "Enable or disable individual Store Profile configurations from Store Profile.",
      });
      return;
    }

    if (moduleId === "stock") {
      setToast({
        type: "success",
        message:
          "Activate individual Stock configurations from Stock Configurations so setup requirements can be checked.",
      });
      return;
    }

    if (moduleId === "target-vs-achievement") {
      setToast({
        type: "success",
        message:
          "Activate individual Target vs Achievement widgets from Target vs Achievement Configurations.",
      });
      return;
    }

    if (moduleId === "form-builder") {
      setToast({
        type: "success",
        message:
          "Publish each form in Form Builder to show it on mobile. There is no separate Form Builder enable switch.",
      });
      return;
    }

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

  const totalCount = modules.length;
  const enabledCount = useMemo(
    () => modules.filter((m) => m.enabled).length,
    [modules],
  );
  const disabledCount = totalCount - enabledCount;

  const filteredModules = useMemo(() => {
    return modules.filter((mod) => {
      if (statusFilter === "enabled" && !mod.enabled) return false;
      if (statusFilter === "disabled" && mod.enabled) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = mod.definition.name.toLowerCase().includes(q);
        const matchesDesc = mod.definition.description.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [modules, statusFilter, search]);

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
    <div className="pa-modules-page">
      <div className="pa-modules-header">
        <div className="pa-modules-header-main">
          <div className="pa-eyebrow">Setup</div>
          <h1 className="pa-page-title">Module Configuration</h1>
          <p className="pa-page-desc">
            Configure each module first, then activate it for this project
          </p>
        </div>

        <div className="pa-modules-stats">
          <div className="pa-modules-stat-chip">
            <span className="pa-modules-stat-val">{totalCount}</span>
            <span className="pa-modules-stat-lbl">Total Modules</span>
          </div>
          <div className="pa-modules-stat-chip pa-modules-stat-chip--active">
            <span className="pa-modules-stat-val">{enabledCount}</span>
            <span className="pa-modules-stat-lbl">Active</span>
          </div>
          <div className="pa-modules-stat-chip">
            <span className="pa-modules-stat-val">{disabledCount}</span>
            <span className="pa-modules-stat-lbl">Disabled</span>
          </div>
        </div>
      </div>

      <div className="pa-modules-notice-banner">
        <Info size={16} className="pa-modules-notice-icon" />
        <div className="pa-modules-notice-text">
          {manageModules
            ? "Modules stay disabled until their required configuration is complete. Toggle switches update status in real-time."
            : "You do not have permission to change module configuration. Ask an admin for module-config:update."}
        </div>
      </div>

      <div className="pa-modules-toolbar">
        <div className="pa-modules-search-wrap">
          <Search size={15} className="pa-modules-search-icon" />
          <input
            type="text"
            placeholder="Search modules by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pa-modules-search-input"
            aria-label="Search modules"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="pa-modules-search-clear"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="pa-modules-filter-tabs" role="tablist" aria-label="Filter modules">
          <button
            type="button"
            className={`pa-modules-filter-tab${statusFilter === "all" ? " is-active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`pa-modules-filter-tab${statusFilter === "enabled" ? " is-active" : ""}`}
            onClick={() => setStatusFilter("enabled")}
          >
            Active ({enabledCount})
          </button>
          <button
            type="button"
            className={`pa-modules-filter-tab${statusFilter === "disabled" ? " is-active" : ""}`}
            onClick={() => setStatusFilter("disabled")}
          >
            Disabled ({disabledCount})
          </button>
        </div>
      </div>

      {filteredModules.length > 0 ? (
        <div className="pa-mod-grid">
          {filteredModules.map((mod) => {
            const path =
              mod.definition.id === "visits"
                ? "modules/visit"
                : mod.definition.configPath;
            const alwaysShowConfig = Boolean(path);
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
                readOnly={!manageModules}
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
      ) : (
        <div className="pa-modules-empty">
          <p className="pa-modules-empty-text">No modules match your current filter or search criteria.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {savingModuleId && (
        <div className="pa-info-banner" style={{ marginTop: 14 }}>
          Updating module status…
        </div>
      )}

      <If2Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
