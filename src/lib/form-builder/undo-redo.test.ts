import { describe, it, expect } from "vitest";
import {
  pushUndo,
  clearRedo,
  performUndo,
  performRedo,
  canUndo,
  canRedo,
} from "./undo-redo";
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

describe("undo-redo", () => {
  describe("pushUndo", () => {
    it("adds current fields to the undo stack", () => {
      const fields = [makeField("1")];
      const result = pushUndo([], fields);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(fields);
    });

    it("caps stack at 30 entries by trimming from front", () => {
      const stack: FormField[][] = Array.from({ length: 30 }, (_, i) => [
        makeField(String(i)),
      ]);
      const newFields = [makeField("new")];
      const result = pushUndo(stack, newFields);
      expect(result).toHaveLength(30);
      expect(result[0]).toEqual([makeField("1")]);
      expect(result[29]).toEqual(newFields);
    });

    it("does not mutate the original stack", () => {
      const stack = [[makeField("1")]];
      const result = pushUndo(stack, [makeField("2")]);
      expect(stack).toHaveLength(1);
      expect(result).toHaveLength(2);
    });
  });

  describe("clearRedo", () => {
    it("returns an empty array", () => {
      expect(clearRedo()).toEqual([]);
    });
  });

  describe("performUndo", () => {
    it("returns null when undoStack is empty", () => {
      const result = performUndo([], [], [makeField("1")]);
      expect(result).toBeNull();
    });

    it("pops last from undoStack and pushes current to redoStack", () => {
      const prev = [makeField("prev")];
      const current = [makeField("current")];
      const result = performUndo([prev], [], current);
      expect(result).not.toBeNull();
      expect(result!.undoStack).toHaveLength(0);
      expect(result!.redoStack).toHaveLength(1);
      expect(result!.redoStack[0]).toEqual(current);
      expect(result!.fields).toEqual(prev);
    });

    it("preserves existing redo entries", () => {
      const existing = [makeField("existing")];
      const prev = [makeField("prev")];
      const current = [makeField("current")];
      const result = performUndo([prev], [existing], current);
      expect(result!.redoStack).toHaveLength(2);
      expect(result!.redoStack[0]).toEqual(existing);
      expect(result!.redoStack[1]).toEqual(current);
    });
  });

  describe("performRedo", () => {
    it("returns null when redoStack is empty", () => {
      const result = performRedo([], [], [makeField("1")]);
      expect(result).toBeNull();
    });

    it("pops last from redoStack and pushes current to undoStack", () => {
      const next = [makeField("next")];
      const current = [makeField("current")];
      const result = performRedo([], [next], current);
      expect(result).not.toBeNull();
      expect(result!.redoStack).toHaveLength(0);
      expect(result!.undoStack).toHaveLength(1);
      expect(result!.undoStack[0]).toEqual(current);
      expect(result!.fields).toEqual(next);
    });

    it("preserves existing undo entries", () => {
      const existing = [makeField("existing")];
      const next = [makeField("next")];
      const current = [makeField("current")];
      const result = performRedo([existing], [next], current);
      expect(result!.undoStack).toHaveLength(2);
      expect(result!.undoStack[0]).toEqual(existing);
      expect(result!.undoStack[1]).toEqual(current);
    });
  });

  describe("canUndo", () => {
    it("returns false for empty stack", () => {
      expect(canUndo([])).toBe(false);
    });

    it("returns true for non-empty stack", () => {
      expect(canUndo([[makeField("1")]])).toBe(true);
    });
  });

  describe("canRedo", () => {
    it("returns false for empty stack", () => {
      expect(canRedo([])).toBe(false);
    });

    it("returns true for non-empty stack", () => {
      expect(canRedo([[makeField("1")]])).toBe(true);
    });
  });
});
