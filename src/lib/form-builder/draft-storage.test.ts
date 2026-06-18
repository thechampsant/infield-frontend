import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  createDebouncedSave,
} from "./draft-storage";
import { FormField } from "./types";

function makeField(id: string): FormField {
  return {
    id,
    type: "short-text",
    label: `Field ${id}`,
    helpText: "",
    parentId: null,
    order: 0,
    visibility: "always",
    visibilityRules: [],
    readOnly: false,
    prefillSource: null,
    prefillField: "",
    prefillCustomValue: "",
    required: "no",
    requiredRules: [],
    typeConfig: {},
    optionsSource: null,
    manualOptions: [],
    excelOptionsCount: 0,
    masterEntity: "",
    masterField: "",
    mappingParentField: "",
    dataSource: null,
    formula: "",
    formulaResultFormat: "number",
    sectionLabel: "",
    addMoreLabel: "",
    addMoreMin: 0,
    addMoreMax: 0,
    toggleOnLabel: "",
    toggleOffLabel: "",
    conditionAction: "show",
    conditionRules: [],
  };
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("draft-storage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("saveDraft", () => {
    it("saves fields to localStorage with correct key", () => {
      const fields = [makeField("1")];
      saveDraft("config-abc", fields);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "form-builder-draft-config-abc",
        JSON.stringify(fields)
      );
    });

    it("handles localStorage errors gracefully", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("QuotaExceededError");
      });
      expect(() => saveDraft("config-1", [makeField("1")])).not.toThrow();
    });
  });

  describe("loadDraft", () => {
    it("returns parsed fields from localStorage", () => {
      const fields = [makeField("1")];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(fields));
      const result = loadDraft("config-abc");
      expect(result).toEqual(fields);
    });

    it("returns null when key not found", () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      expect(loadDraft("nonexistent")).toBeNull();
    });

    it("returns null for corrupted JSON", () => {
      localStorageMock.getItem.mockReturnValueOnce("{invalid json");
      expect(loadDraft("config-1")).toBeNull();
    });

    it("returns null for non-array data", () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ not: "an array" }));
      expect(loadDraft("config-1")).toBeNull();
    });

    it("handles localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error("SecurityError");
      });
      expect(loadDraft("config-1")).toBeNull();
    });
  });

  describe("clearDraft", () => {
    it("removes the draft from localStorage", () => {
      clearDraft("config-abc");
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "form-builder-draft-config-abc"
      );
    });

    it("handles localStorage errors gracefully", () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error("SecurityError");
      });
      expect(() => clearDraft("config-1")).not.toThrow();
    });
  });

  describe("createDebouncedSave", () => {
    it("debounces calls and saves after delay", () => {
      const debouncedSave = createDebouncedSave("config-1", 2000);
      const fields = [makeField("1")];

      debouncedSave(fields);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "form-builder-draft-config-1",
        JSON.stringify(fields)
      );
    });

    it("resets timer on subsequent calls", () => {
      const debouncedSave = createDebouncedSave("config-1", 2000);
      const fields1 = [makeField("1")];
      const fields2 = [makeField("2")];

      debouncedSave(fields1);
      vi.advanceTimersByTime(1000);
      debouncedSave(fields2);
      vi.advanceTimersByTime(1000);

      // First call should not have fired yet (timer was reset)
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      // Now only the second call's data should be saved
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "form-builder-draft-config-1",
        JSON.stringify(fields2)
      );
    });

    it("uses default delay of 2000ms", () => {
      const debouncedSave = createDebouncedSave("config-1");
      const fields = [makeField("1")];

      debouncedSave(fields);
      vi.advanceTimersByTime(1999);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});
