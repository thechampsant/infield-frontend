"use client";

import { useEffect, useState, useCallback } from "react";
import {
  connectConfigService,
  type ConnectSettings,
} from "@/lib/api/connect-config-service";
import type { AuditEntry } from "@/types/project-admin";
import { formatApiError } from "@/lib/api";

export type ConnectSwitchKey = "connect" | "wall" | "rooms";
export type ConnectFieldLabel = "Connect" | "Wall" | "Chat Rooms";

export interface UseConnectSettingsOptions {
  onSuccess?: (field: ConnectFieldLabel, enabled: boolean) => void;
  onError?: (errorMessage: string, field: ConnectFieldLabel) => void;
}

export interface UseConnectSettingsReturn {
  settings: ConnectSettings;
  auditHistory: AuditEntry[];
  saving: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  toggleConnect: () => Promise<boolean>;
  toggleWall: () => Promise<boolean>;
  toggleChatRooms: () => Promise<boolean>;
  toggleSwitch: (key: ConnectSwitchKey) => Promise<boolean>;
  setSettings: React.Dispatch<React.SetStateAction<ConnectSettings>>;
}

/**
 * Reusable hook / helper to manage Connect, Wall, and Chat Rooms switches,
 * configuration audit history, and reactive updates for a project.
 */
export function useConnectSettings(
  projectId: string | undefined,
  currentUserName: string = "Project Admin",
  options?: UseConnectSettingsOptions,
): UseConnectSettingsReturn {
  const [settings, setSettings] = useState<ConnectSettings>(() =>
    connectConfigService.getSettingsSync(projectId || ""),
  );
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>(() =>
    connectConfigService.getAuditHistory(projectId || ""),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize settings when projectId changes or reactive events fire
  useEffect(() => {
    let cancelled = false;

    if (!projectId) {
      return;
    }

    connectConfigService
      .getSettings(projectId)
      .then((data) => {
        if (!cancelled) {
          setSettings(data);
          setAuditHistory(connectConfigService.getAuditHistory(projectId));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatApiError(err, "Failed to load Connect configuration."));
        }
      });

    const handleSettingsChanged = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          projectId?: string;
          settings?: ConnectSettings;
        }>
      ).detail;
      if (!detail?.projectId || detail.projectId === projectId) {
        if (detail?.settings) {
          setSettings(detail.settings);
        }
        if (projectId) {
          setAuditHistory(connectConfigService.getAuditHistory(projectId));
        }
      }
    };

    const handleAuditChanged = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          projectId?: string;
        }>
      ).detail;
      if (!detail?.projectId || detail.projectId === projectId) {
        if (projectId) {
          setAuditHistory(connectConfigService.getAuditHistory(projectId));
        }
      }
    };

    window.addEventListener("connect-settings:changed", handleSettingsChanged);
    window.addEventListener("connect-audit:changed", handleAuditChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("connect-settings:changed", handleSettingsChanged);
      window.removeEventListener("connect-audit:changed", handleAuditChanged);
    };
  }, [projectId]);

  /**
   * Unified toggle method for any of the three switches.
   */
  const toggleSwitch = useCallback(
    async (key: ConnectSwitchKey): Promise<boolean> => {
      if (!projectId || saving) return false;

      // Wall and Chat Rooms are disabled while Connect is Off
      if ((key === "wall" || key === "rooms") && !settings.connect) {
        return false;
      }

      const fieldLabel: ConnectFieldLabel =
        key === "connect" ? "Connect" : key === "wall" ? "Wall" : "Chat Rooms";
      const nextVal = !settings[key];

      setSaving(true);
      setError(null);

      try {
        const updated = await connectConfigService.updateSetting(
          projectId,
          key,
          nextVal,
          currentUserName,
        );
        setSettings(updated);
        setAuditHistory(connectConfigService.getAuditHistory(projectId));
        options?.onSuccess?.(fieldLabel, nextVal);
        return true;
      } catch (err) {
        const msg = formatApiError(err, `Unable to update ${fieldLabel} setting.`);
        setError(msg);
        options?.onError?.(msg, fieldLabel);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [projectId, saving, settings, currentUserName, options],
  );

  const toggleConnect = useCallback(() => toggleSwitch("connect"), [toggleSwitch]);
  const toggleWall = useCallback(() => toggleSwitch("wall"), [toggleSwitch]);
  const toggleChatRooms = useCallback(() => toggleSwitch("rooms"), [toggleSwitch]);

  return {
    settings,
    auditHistory,
    saving,
    error,
    setError,
    toggleConnect,
    toggleWall,
    toggleChatRooms,
    toggleSwitch,
    setSettings,
  };
}
