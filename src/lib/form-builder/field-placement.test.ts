import { describe, expect, it } from "vitest";
import { formBuilderReducer as reduce, initialFormBuilderState } from "./form-builder-reducer";
import { mapFieldsToSaveSchemaPayload, mapUdfFieldToFrontend } from "./form-builder-mapper";
import { MOCK_CONFIGURATIONS } from "./mock-data";
import type { ComponentType, FormBuilderState } from "./types";

function editor() {
  let state = reduce(initialFormBuilderState, {
    type: "LOAD_CONFIG", config: { ...MOCK_CONFIGURATIONS[0], fields: [] },
  });
  const fields = () => state.configurations[0].fields;
  return {
    fields,
    siblings: (parentId: string | null = null) => fields().filter((f) => f.parentId === parentId).map((f) => f.id),
    add(componentType: ComponentType, atIndex?: number, parentId?: string) {
      state = reduce(state, { type: "ADD_FIELD", componentType, atIndex, parentId });
      return state.selectedFieldId!;
    },
    move(fieldId: string, toIndex: number, toParentId: string | null = null) {
      state = reduce(state, { type: "MOVE_FIELD", fieldId, toIndex, toParentId });
    },
    action(type: "UNDO" | "REDO") { state = reduce(state, { type }); },
    state: (): FormBuilderState => state,
    remove(fieldId: string) { state = reduce(state, { type: "DELETE_FIELD", fieldId }); },
  };
}

describe("form canvas placement", () => {
  it("inserts at a gap, moves both directions and ignores adjacent no-op drops", () => {
    const e = editor();
    const a = e.add("short-text");
    const c = e.add("toggle");
    const b = e.add("number", 1);
    expect(e.siblings()).toEqual([a, b, c]);
    e.move(c, 0);
    expect(e.siblings()).toEqual([c, a, b]);
    e.move(c, 3);
    expect(e.siblings()).toEqual([a, b, c]);
    const before = e.state();
    e.move(b, 2);
    expect(e.state()).toBe(before);
  });

  it("moves children between containers and back to root, with undo and redo", () => {
    const e = editor();
    const section = e.add("section-group");
    const block = e.add("add-more-block");
    const a = e.add("number", 0, section);
    const b = e.add("short-text", 0, block);
    e.move(a, 0, block);
    expect(e.siblings(section)).toEqual([]);
    expect(e.siblings(block)).toEqual([a, b]);
    const loaded = mapFieldsToSaveSchemaPayload(e.fields()).map(mapUdfFieldToFrontend);
    expect(loaded.filter((f) => f.parentId === block).map((f) => f.id)).toEqual([a, b]);
    e.move(a, 1);
    expect(e.siblings()).toEqual([section, a, block]);
    e.action("UNDO");
    expect(e.siblings(block)).toEqual([a, b]);
    e.action("REDO");
    expect(e.siblings()).toEqual([section, a, block]);
  });

  it("keeps subtrees together and rejects cycles, same-type nesting and excess depth", () => {
    const e = editor();
    const section = e.add("section-group");
    const block = e.add("add-more-block");
    const child = e.add("number", 0, block);
    e.move(block, 0, section);
    expect(e.siblings(section)).toEqual([block]);
    expect(e.siblings(block)).toEqual([child]);
    const before = e.state();
    e.move(section, 0, block);
    e.move(block, 0, block);
    e.add("section-group", 0, section);
    e.add("section-group", 0, block);
    expect(e.state()).toBe(before);
    e.remove(section);
    expect(e.fields()).toEqual([]);
  });
});
