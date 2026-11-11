import { featureConfigService } from "./feature-config-service";
import type { AuditEntry } from "@/types/project-admin";

export interface ConnectSettings {
  connect: boolean;
  wall: boolean;
  rooms: boolean;
}

export const CONNECT_MODULE_KEYS = {
  MAIN: "connect",
  WALL: "connect_wall",
  ROOMS: "connect_rooms",
} as const;

export const DEFAULT_CONNECT_SETTINGS: Readonly<ConnectSettings> = Object.freeze({
  connect: false, // Connect is Off by default
  wall: true, // Wall is On by default
  rooms: true, // Chat Rooms is On by default
});

const SETTINGS_STORAGE_PREFIX = "infield_connect_settings_";
const AUDIT_STORAGE_PREFIX = "infield_connect_audit_";

// Memory storage fallback so tests, SSR, and environments without localStorage work reliably
const memoryStore = new Map<string, string>();

function getStorageKey(prefix: string, projectId: string): string {
  return `${prefix}${projectId}`;
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Fall back to memory
  }
  return memoryStore.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore
  }
  memoryStore.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore
  }
  memoryStore.delete(key);
}

export const connectConfigService = {
  /**
   * Retrieves the current Connect settings for a specific project.
   * Scoped strictly by projectId so changes in one project never leak to another.
   * If nobody has changed them for this project, defaults to:
   * Connect: Off (false), Wall: On (true), Chat Rooms: On (true).
   */
  async getSettings(projectId: string): Promise<ConnectSettings> {
    if (!projectId) return { ...DEFAULT_CONNECT_SETTINGS };

    // 1. Try local project-scoped cache first
    const rawLocal = safeGetItem(getStorageKey(SETTINGS_STORAGE_PREFIX, projectId));
    if (rawLocal) {
      try {
        const parsed = JSON.parse(rawLocal);
        return {
          connect: typeof parsed.connect === "boolean" ? parsed.connect : DEFAULT_CONNECT_SETTINGS.connect,
          wall: typeof parsed.wall === "boolean" ? parsed.wall : DEFAULT_CONNECT_SETTINGS.wall,
          rooms: typeof parsed.rooms === "boolean" ? parsed.rooms : DEFAULT_CONNECT_SETTINGS.rooms,
        };
      } catch {
        // Fallback to defaults or API
      }
    }

    // 2. Query backend feature config
    try {
      const rawConfig = await featureConfigService.getRawByProject(projectId).catch(() => null);
      if (rawConfig?.modules) {
        const modules = rawConfig.modules;
        const mainModule = modules.find((m) => m.key?.toLowerCase() === CONNECT_MODULE_KEYS.MAIN);
        const wallModule = modules.find((m) => m.key?.toLowerCase() === CONNECT_MODULE_KEYS.WALL);
        const roomsModule = modules.find((m) => m.key?.toLowerCase() === CONNECT_MODULE_KEYS.ROOMS);

        const settings: ConnectSettings = {
          connect: mainModule !== undefined ? Boolean(mainModule.isActive ?? mainModule.active) : DEFAULT_CONNECT_SETTINGS.connect,
          wall: wallModule !== undefined ? Boolean(wallModule.isActive ?? wallModule.active) : DEFAULT_CONNECT_SETTINGS.wall,
          rooms: roomsModule !== undefined ? Boolean(roomsModule.isActive ?? roomsModule.active) : DEFAULT_CONNECT_SETTINGS.rooms,
        };

        safeSetItem(getStorageKey(SETTINGS_STORAGE_PREFIX, projectId), JSON.stringify(settings));
        return settings;
      }
    } catch {
      // Offline/sandbox fallback
    }

    return { ...DEFAULT_CONNECT_SETTINGS };
  },

  /**
   * Synchronously reads cached settings (or defaults) for immediate rendering.
   */
  getSettingsSync(projectId: string): ConnectSettings {
    if (!projectId) return { ...DEFAULT_CONNECT_SETTINGS };
    const rawLocal = safeGetItem(getStorageKey(SETTINGS_STORAGE_PREFIX, projectId));
    if (rawLocal) {
      try {
        const parsed = JSON.parse(rawLocal);
        return {
          connect: typeof parsed.connect === "boolean" ? parsed.connect : DEFAULT_CONNECT_SETTINGS.connect,
          wall: typeof parsed.wall === "boolean" ? parsed.wall : DEFAULT_CONNECT_SETTINGS.wall,
          rooms: typeof parsed.rooms === "boolean" ? parsed.rooms : DEFAULT_CONNECT_SETTINGS.rooms,
        };
      } catch {
        return { ...DEFAULT_CONNECT_SETTINGS };
      }
    }
    return { ...DEFAULT_CONNECT_SETTINGS };
  },

  /**
   * Updates any of the three switches: 'connect' | 'wall' | 'rooms'.
   * Applies immediately, updates feature config, writes to the configuration audit history,
   * and notifies listeners.
   */
  async updateSetting(
    projectId: string,
    key: "connect" | "wall" | "rooms",
    value: boolean,
    changedBy: string = "Project Admin",
  ): Promise<ConnectSettings> {
    if (!projectId) throw new Error("projectId is required to update Connect settings");

    const current = await this.getSettings(projectId);
    const oldValue = current[key];

    // If no change, return current
    if (oldValue === value) return current;

    const updated: ConnectSettings = {
      ...current,
      [key]: value,
    };

    // 1. Immediately persist locally for the specific project
    safeSetItem(getStorageKey(SETTINGS_STORAGE_PREFIX, projectId), JSON.stringify(updated));

    // 2. Record configuration audit history entry with user's name and current time
    const fieldLabel = key === "connect" ? "Connect" : key === "wall" ? "Wall" : "Chat Rooms";
    const auditEntry: AuditEntry = {
      field: fieldLabel,
      oldValue: oldValue ? "On" : "Off",
      newValue: value ? "On" : "Off",
      changedBy: changedBy || "Project Admin",
      changedAt: new Date().toISOString(),
    };
    this.addAuditEntry(projectId, auditEntry);

    // 3. Dispatch reactive events immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("connect-settings:changed", {
          detail: { projectId, key, value, settings: updated, auditEntry },
        }),
      );
      const moduleKey =
        key === "connect"
          ? CONNECT_MODULE_KEYS.MAIN
          : key === "wall"
            ? CONNECT_MODULE_KEYS.WALL
            : CONNECT_MODULE_KEYS.ROOMS;

      window.dispatchEvent(
        new CustomEvent("feature-config:changed", {
          detail: { projectId, moduleId: moduleKey, enabled: value },
        }),
      );
    }

    // 4. Try updating the backend feature config endpoint
    try {
      const moduleKey =
        key === "connect"
          ? CONNECT_MODULE_KEYS.MAIN
          : key === "wall"
            ? CONNECT_MODULE_KEYS.WALL
            : CONNECT_MODULE_KEYS.ROOMS;

      await featureConfigService.updateModuleStatus(projectId, moduleKey, value);
    } catch {
      // In development/offline/mock, error is suppressed since local state is already applied
    }

    return updated;
  },

  /**
   * Retrieves audit history for a project, sorted newest first.
   */
  getAuditHistory(projectId: string): AuditEntry[] {
    if (!projectId) return [];
    const raw = safeGetItem(getStorageKey(AUDIT_STORAGE_PREFIX, projectId));
    if (!raw) return [];
    try {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  /**
   * Appends an entry to the configuration audit history for this project.
   */
  addAuditEntry(projectId: string, entry: AuditEntry): void {
    if (!projectId) return;
    const current = this.getAuditHistory(projectId);
    const next = [entry, ...current];
    safeSetItem(getStorageKey(AUDIT_STORAGE_PREFIX, projectId), JSON.stringify(next));

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("connect-audit:changed", {
          detail: { projectId, entry, history: next },
        }),
      );
    }
  },

  /**
   * Clears configuration state and audit history for testing.
   */
  clearProjectSettings(projectId: string): void {
    if (!projectId) return;
    safeRemoveItem(getStorageKey(SETTINGS_STORAGE_PREFIX, projectId));
    safeRemoveItem(getStorageKey(AUDIT_STORAGE_PREFIX, projectId));
  },
};
