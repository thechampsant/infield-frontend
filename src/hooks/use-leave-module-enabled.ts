"use client";

import { useEffect, useState } from "react";
import { featureConfigService } from "@/lib/api/feature-config-service";

const LEAVE_MODULE_KEY = "leave";

/**
 * Whether the project's Leave module is active. `null` while loading (or with no project),
 * `false` if the feature config can't be loaded.
 */
export function useLeaveModuleEnabled(projectId: string | undefined): boolean | null {
  const [loaded, setLoaded] = useState<{ projectId: string; enabled: boolean } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    featureConfigService
      .getRawByProject(projectId)
      .then((config) => {
        if (cancelled) return;
        const leaveModule = config.modules.find((module) => module.key === LEAVE_MODULE_KEY);
        setLoaded({ projectId, enabled: Boolean(leaveModule?.isActive) });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ projectId, enabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return projectId && loaded?.projectId === projectId ? loaded.enabled : null;
}
