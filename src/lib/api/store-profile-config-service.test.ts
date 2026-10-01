import { describe, expect, it } from "vitest";
import {
  buildStoreProfilePayload,
  normalizeStoreProfileConfiguration,
  normalizeStoreProfileFieldOption,
  normalizeStoreProfileFields,
  storeProfileConfigModuleKey,
  type StoreProfileField,
} from "./store-profile-config-service";

/** INF2-2565 — Store Profile configuration mappers. */
describe("storeProfileConfigModuleKey", () => {
  it("builds the per-config feature key the module card reads", () => {
    expect(storeProfileConfigModuleKey("abc123")).toBe("store_profile_config_abc123");
  });
});

describe("normalizeStoreProfileFields", () => {
  it("sorts by order and re-indexes to a contiguous 1..n", () => {
    // Array position is authoritative in the UI; everything downstream (drag,
    // move buttons, save) depends on this invariant.
    const fields = normalizeStoreProfileFields([
      { fieldKey: "city", order: 7 },
      { fieldKey: "storeName", order: 2 },
      { fieldKey: "storeCode", order: 5 },
    ]);

    expect(fields.map((f) => [f.fieldKey, f.order])).toEqual([
      ["storeName", 1],
      ["storeCode", 2],
      ["city", 3],
    ]);
  });

  it("produces a contiguous result from duplicate order values", () => {
    const fields = normalizeStoreProfileFields([
      { fieldKey: "a", order: 1 },
      { fieldKey: "b", order: 1 },
      { fieldKey: "c", order: 1 },
    ]);

    expect(fields.map((f) => f.order)).toEqual([1, 2, 3]);
  });

  it("sorts fields with no order last, keeping them stable", () => {
    const fields = normalizeStoreProfileFields([
      { fieldKey: "noOrder" },
      { fieldKey: "second", order: 2 },
      { fieldKey: "first", order: 1 },
    ]);

    expect(fields.map((f) => f.fieldKey)).toEqual(["first", "second", "noOrder"]);
  });

  it("coerces a bare string[] of field keys", () => {
    const fields = normalizeStoreProfileFields(["storeName", "city"]);

    expect(fields).toEqual([
      expect.objectContaining({ fieldKey: "storeName", order: 1 }),
      expect.objectContaining({ fieldKey: "city", order: 2 }),
    ]);
  });

  it("accepts label/type aliases from a looser payload", () => {
    const fields = normalizeStoreProfileFields([
      { fieldKey: "city", label: "City", type: "API_SELECT", source: "udf", order: 1 },
    ]);

    expect(fields[0]).toEqual({
      fieldKey: "city", headerName: "City", fieldType: "API_SELECT", source: "UDF", order: 1,
    });
  });

  it("drops entries with no field key rather than emitting blanks", () => {
    expect(normalizeStoreProfileFields([{ order: 1 }, { fieldKey: "ok" }])).toHaveLength(1);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "nope"],
    ["an object", {}],
  ])("returns [] for %s without throwing", (_label, value) => {
    expect(normalizeStoreProfileFields(value)).toEqual([]);
  });
});

describe("normalizeStoreProfileConfiguration", () => {
  it("maps _id and id alike", () => {
    expect(normalizeStoreProfileConfiguration({ _id: "a" }).id).toBe("a");
    expect(normalizeStoreProfileConfiguration({ id: "b" }).id).toBe("b");
  });

  it("filters non-string designations", () => {
    const config = normalizeStoreProfileConfiguration({
      applicableDesignations: ["d1", null, 42, "d2"],
    });

    expect(config.applicableDesignations).toEqual(["d1", "42", "d2"]);
  });

  it("defaults isEnabled to false and isActive to true", () => {
    const config = normalizeStoreProfileConfiguration({});

    expect(config.isEnabled).toBe(false);
    expect(config.isActive).toBe(true);
  });

  it("never throws on a malformed payload", () => {
    expect(() => normalizeStoreProfileConfiguration(null)).not.toThrow();
    expect(normalizeStoreProfileConfiguration(null).selectedFields).toEqual([]);
  });
});

describe("normalizeStoreProfileFieldOption", () => {
  it("falls back to the field key when no label is given", () => {
    expect(normalizeStoreProfileFieldOption({ fieldKey: "store_type" }).label).toBe("store_type");
  });

  it("normalizes source casing, defaulting to STATIC", () => {
    expect(normalizeStoreProfileFieldOption({ fieldKey: "a", source: "udf" }).source).toBe("UDF");
    expect(normalizeStoreProfileFieldOption({ fieldKey: "a", source: "weird" }).source).toBe("STATIC");
  });
});

describe("buildStoreProfilePayload", () => {
  const field = (fieldKey: string, order: number): StoreProfileField => ({
    fieldKey, headerName: fieldKey, fieldType: "STRING", source: "STATIC", order,
  });

  it("derives order purely from array position, overriding whatever was passed", () => {
    const payload = buildStoreProfilePayload({
      name: "ISP",
      applicableDesignations: ["d1"],
      selectedFields: [field("a", 99), field("b", 3), field("c", 1)],
    });

    expect(payload.selectedFields).toEqual([
      { fieldKey: "a", order: 1 },
      { fieldKey: "b", order: 2 },
      { fieldKey: "c", order: 3 },
    ]);
  });

  it("trims the name and omits projectId when absent", () => {
    const payload = buildStoreProfilePayload({
      name: "  ISP  ",
      applicableDesignations: [],
      selectedFields: [field("a", 1)],
    });

    expect(payload.name).toBe("ISP");
    expect(payload).not.toHaveProperty("projectId");
  });

  it("survives a reorder round trip as a fixed point", () => {
    const server = {
      _id: "c1",
      selectedFields: [field("a", 1), field("b", 2), field("c", 3)],
    };
    const loaded = normalizeStoreProfileConfiguration(server);

    // Simulate dragging the last field to the front.
    const moved = [...loaded.selectedFields];
    const [last] = moved.splice(2, 1);
    moved.unshift(last);

    const payload = buildStoreProfilePayload({
      name: "x", applicableDesignations: [], selectedFields: moved,
    });
    const reloaded = normalizeStoreProfileConfiguration({
      _id: "c1",
      selectedFields: payload.selectedFields,
    });

    expect(reloaded.selectedFields.map((f) => f.fieldKey)).toEqual(["c", "a", "b"]);
    expect(reloaded.selectedFields.map((f) => f.order)).toEqual([1, 2, 3]);
  });
});
