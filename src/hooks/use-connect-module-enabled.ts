"use client";

import { useEffect, useState } from "react";
import { connectConfigService } from "@/lib/api/connect-config-service";

const CONNECT_MODULE_KEY = "connect";

/**
 * Custom hook to check whether the Connect module is active for a project.
 * Uses connectConfigService and listens to reactive updates.
 */
export function useConnectModuleEnabled(projectId: string | undefined): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (!projectId) return false;
    return connectConfigService.getSettingsSync(projectId).connect;
  });

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    // Load asynchronous status
    connectConfigService
      .getSettings(projectId)
      .then((settings) => {
        if (!cancelled) setEnabled(settings.connect);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });

    const handleConnectChange = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          projectId?: string;
          key?: string;
          value?: boolean;
          settings?: { connect: boolean };
        }>
      ).detail;
      if (!detail || !detail.projectId || detail.projectId === projectId) {
        if (detail?.key === "connect" && typeof detail.value === "boolean") {
          setEnabled(detail.value);
        } else if (detail?.settings) {
          setEnabled(detail.settings.connect);
        }
      }
    };

    const handleFeatureConfigChange = (e: Event) => {
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
          setEnabled(detail.enabled);
        }
      }
    };

    window.addEventListener("connect-settings:changed", handleConnectChange);
    window.addEventListener("feature-config:changed", handleFeatureConfigChange);
    return () => {
      cancelled = true;
      window.removeEventListener("connect-settings:changed", handleConnectChange);
      window.removeEventListener("feature-config:changed", handleFeatureConfigChange);
    };
  }, [projectId]);

  return enabled;
}
