"use client";

import { useEffect, useState } from "react";
import { featureConfigService } from "@/lib/api/feature-config-service";

const CONNECT_MODULE_KEY = "connect";

/**
 * Custom hook to check whether the Connect module is active for a project.
 * Uses /feature-config/:projectId endpoint and listens to reactive updates.
 */
export function useConnectModuleEnabled(projectId: string | undefined): boolean {
  const [loaded, setLoaded] = useState<{ projectId: string; enabled: boolean } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const checkConnectModule = () => {
      featureConfigService
        .getRawByProject(projectId)
        .then((config) => {
          if (cancelled) return;
          const isConnectActive = Boolean(
            config?.modules?.some(
              (m) =>
                m.key?.toLowerCase() === CONNECT_MODULE_KEY &&
                Boolean(m.isActive ?? m.active),
            ),
          );
          setLoaded({ projectId, enabled: isConnectActive });
        })
        .catch((err) => {
          console.error("Unable to check feature config for Connect module", err);
          if (!cancelled) setLoaded({ projectId, enabled: false });
        });
    };

    checkConnectModule();

    const handleConfigChange = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          projectId?: string;
          moduleId?: string;
          enabled?: boolean;
        }>
      ).detail;
      if (!detail || !detail.projectId || detail.projectId === projectId) {
        if (
          detail?.moduleId?.toLowerCase() === CONNECT_MODULE_KEY &&
          typeof detail.enabled === "boolean"
        ) {
          setLoaded({ projectId, enabled: detail.enabled });
        } else {
          checkConnectModule();
        }
      }
    };

    window.addEventListener("feature-config:changed", handleConfigChange);
    return () => {
      cancelled = true;
      window.removeEventListener("feature-config:changed", handleConfigChange);
    };
  }, [projectId]);

  return Boolean(projectId && loaded?.projectId === projectId ? loaded.enabled : false);
}
