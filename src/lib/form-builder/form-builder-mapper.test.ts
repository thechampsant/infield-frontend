import { newDataSource } from "./advanced-fields";
import { describe, it, expect } from "vitest";
import type { ApiUdfField } from "./form-builder-api";
import { mapFieldsToSaveSchemaPayload, mapUdfFieldToFrontend } from "./form-builder-mapper";
import { formBuilderReducer, initialFormBuilderState } from "./form-builder-reducer";
import type { FormBuilderState, FormField } from "./types";

function makeField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: "docs",
    type: "file-upload",
    label: "Supporting Documents",
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
    addMoreMin: 1,
    addMoreMax: 5,
    toggleOnLabel: "Yes",
    toggleOffLabel: "No",
    conditionAction: "show",
    conditionRules: [],
    ...overrides,
  };
}

function saveOne(field: FormField) {
  return mapFieldsToSaveSchemaPayload([field])[0];
}

function toApi(saved: ReturnType<typeof saveOne>): ApiUdfField {
  return { ...saved, status: true } as ApiUdfField;
}

describe("File Upload save mapping", () => {
  it("saves a new File Upload field with the canonical single-file config", () => {
    const saved = saveOne(makeField());

    expect(saved.type).toBe("FILE");
    expect(saved.config).toEqual({
      componentType: "FILE_UPLOAD",
      visibilityMode: "always",
      isReadOnly: false,
      validation: { requiredMode: "never" },
      multiple: false,
      maxCount: 1,
      maxFileSizeMB: 10,
      allowedExtensions: [],
    });
  });

  it("saves configured settings at the top level, not under validation", () => {
    const saved = saveOne(
      makeField({
        required: "always",
        typeConfig: {
          multiple: true,
          maxCount: 3,
          maxFileSizeMB: 10,
          allowedExtensions: ["pdf", "jpg", "png", "docx"],
          accept: [],
        },
      }),
    );

    expect(saved.required).toBe(true);
    expect(saved.config).toMatchObject({
      validation: { requiredMode: "always" },
      multiple: true,
      maxCount: 3,
      maxFileSizeMB: 10,
      allowedExtensions: ["pdf", "jpg", "png", "docx"],
    });
    expect(saved.config).not.toHaveProperty("accept");
    expect(saved.config.validation).toEqual({ requiredMode: "always" });
  });

  it("clamps out-of-range values and normalises extensions", () => {
    const saved = saveOne(
      makeField({
        typeConfig: {
          multiple: true,
          maxCount: 25,
          maxFileSizeMB: 80,
          allowedExtensions: ["PDF", ".png", "pdf"],
          accept: ["application/pdf"],
        },
      }),
    );

    expect(saved.config).toMatchObject({
      multiple: true,
      maxCount: 10,
      maxFileSizeMB: 50,
      allowedExtensions: ["pdf", "png"],
      accept: ["application/pdf"],
    });
  });
});

describe("File Upload load mapping", () => {
  it("converts legacy nested validation keys into canonical typeConfig", () => {
    const field = mapUdfFieldToFrontend({
      fieldKey: "permit",
      label: "Trade Permit",
      type: "FILE",
      required: false,
      order: 0,
      status: true,
      config: {
        componentType: "FILE_UPLOAD",
        validation: {
          requiredMode: "never",
          allowedExtensions: ["pdf", "jpg"],
          allowedMimeTypes: ["application/pdf"],
          maxFileSizeMB: 8,
          maxFileCount: 4,
        },
      },
    });

    expect(field.type).toBe("file-upload");
    expect(field.typeConfig).toEqual({
      multiple: true,
      maxCount: 4,
      maxFileSizeMB: 8,
      allowedExtensions: ["pdf", "jpg"],
      accept: ["application/pdf"],
    });
  });

  it("round-trips save → load → save without drift", () => {
    const original = makeField({
      required: "always",
      typeConfig: { multiple: true, maxCount: 3, maxFileSizeMB: 5, allowedExtensions: ["pdf", "docx"] },
    });

    const firstSave = saveOne(original);
    const loaded = mapUdfFieldToFrontend(toApi(firstSave));
    const secondSave = saveOne(loaded);

    expect(loaded.typeConfig).toEqual({
      multiple: true,
      maxCount: 3,
      maxFileSizeMB: 5,
      allowedExtensions: ["pdf", "docx"],
    });
    expect(secondSave).toEqual(firstSave);
  });

  it("does not resurrect a removed extension from a stale nested list", () => {
    const loaded = mapUdfFieldToFrontend({
      fieldKey: "docs",
      label: "Docs",
      type: "FILE",
      required: false,
      order: 0,
      status: true,
      config: {
        componentType: "FILE_UPLOAD",
        allowedExtensions: ["pdf", "png"],
        validation: { requiredMode: "never", allowedExtensions: ["pdf", "png"] },
      },
    });
    const edited = { ...loaded, typeConfig: { ...loaded.typeConfig, allowedExtensions: ["pdf"] } };

    const reloaded = mapUdfFieldToFrontend(toApi(saveOne(edited)));

    expect(reloaded.typeConfig.allowedExtensions).toEqual(["pdf"]);
  });
});

describe("other field types are unchanged", () => {
  it("keeps the dropdown multiple flag on save and load", () => {
    const saved = saveOne(
      makeField({ id: "pick", type: "multi-select", typeConfig: { multiple: true }, manualOptions: ["A", "B"], optionsSource: "manual" }),
    );
    expect(saved.type).toBe("SELECT");
    expect(saved.config.multiple).toBe(true);
    expect(saved.config.validation).toEqual({ multiple: true, requiredMode: "never" });

    const loaded = mapUdfFieldToFrontend(toApi(saved));
    expect(loaded.typeConfig.multiple).toBe(true);
  });

  it("keeps the image-capture source and count mapping", () => {
    const saved = saveOne(
      makeField({ id: "photo", type: "image-capture", typeConfig: { captureMode: "gallery", maxPhotos: 3 } }),
    );

    expect(saved.type).toBe("IMAGE");
    expect(saved.config).toMatchObject({ source: "Gallery", multiple: true, maxCount: 3 });
    expect(saved.config).not.toHaveProperty("allowedExtensions");
  });
});

describe("new File Upload field default", () => {
  it("starts as a single file with any extension", () => {
    const state: FormBuilderState = {
      ...initialFormBuilderState,
      activeConfigId: "c1",
      configurations: [
        {
          id: "c1",
          name: "Store Audit",
          designations: [],
          editPermission: "editable",
          editWindow: "custom-hours",
          editWindowHours: 0,
          fields: [],
          status: "draft",
          createdAt: "",
          updatedAt: "",
        },
      ],
    };

    const next = formBuilderReducer(state, { type: "ADD_FIELD", componentType: "file-upload" });
    const field = next.configurations[0].fields[0];

    expect(field.typeConfig).toEqual({ multiple: false, maxCount: 1, maxFileSizeMB: 10, allowedExtensions: [] });
    expect(saveOne(field).config).toMatchObject({ multiple: false, maxCount: 1, allowedExtensions: [] });
  });
});

describe("Form Builder conditional requirements and store pre-fill", () => {
  it.each(["image-capture", "file-upload"] as const)("keeps a %s conditional after publish and reopen", (type) => {
    const rule = { id: "require-photo", sourceFieldId: "compliant", operator: "equals" as const, value: "false" };
    const saved = saveOne(makeField({ type, required: "conditional", requiredRules: [rule] }));
    expect(saved.required).toBe(false);
    expect(saved.config.validation.requiredRules).toEqual([rule]);
    const restored = mapUdfFieldToFrontend(toApi(saved));
    expect(restored).toMatchObject({ required: "conditional", requiredRules: [rule], visibility: "always" });
    const cleared = saveOne({ ...restored, required: "no" });
    expect(cleared.config.validation).not.toHaveProperty("requiredRules");
  });

  it("restores the assigned store code and read-only setting independently", () => {
    const saved = saveOne(makeField({
      type: "alphanumeric", prefillSource: "store-mapping", prefillField: "storeCode", readOnly: true,
    }));
    expect(saved.config.preFill).toEqual({ sourceType: "store-mapping", sourceField: "storeCode" });
    expect(mapUdfFieldToFrontend(toApi(saved))).toMatchObject({
      prefillSource: "store-mapping", prefillField: "storeCode", readOnly: true,
    });
  });
});

describe("advanced field settings", () => {
  it("keeps imported options and their source across publish and reopen", () => {
    const field = makeField({ type: "dropdown", optionsSource: "excel", excelOptions: ["A", "B"], manualOptions: ["old"] });
    const saved = saveOne(field);
    expect(saved.config.options).toEqual(["A", "B"]);
    expect(mapUdfFieldToFrontend(toApi(saved))).toMatchObject({ optionsSource: "excel", excelOptionsCount: 2, excelOptions: ["A", "B"] });
  });

  it.each(["from-master", "from-mapping"] as const)("persists the ordered display columns for %s", (optionsSource) => {
    const field = makeField({ type: "checkbox", optionsSource, masterEntity: "STORE", displayColumns: ["storeCode", "storeName"] });
    const saved = saveOne(field);
    expect(saved).toMatchObject({ type: "API_SELECT", config: { dataSource: "STORE", multiple: true, labelField: "storeCode" } });
    expect(saved.config.filters?.mode).toBe(optionsSource === "from-mapping" ? "direct_store" : undefined);
    expect(mapUdfFieldToFrontend(toApi(saved))).toMatchObject({ optionsSource, displayColumns: field.displayColumns });
  });

  it("compiles a custom hierarchy and keeps repeated cities under distinct parents", () => {
    const source = { ...newDataSource("hierarchy", "custom"), customName: "Geography",
      chainLevels: ["Region", "City", "Store"], customHeaders: ["Store", "City", "Region"],
      customRows: [["A", "Springfield", "North"], ["B", "Springfield", "South"]] };
    const field = makeField({ type: "dependent-dropdown", dataSource: source });
    const saved = mapFieldsToSaveSchemaPayload([field]);
    expect(saved.map((item) => item.type)).toEqual(["DROPDOWN", "CASCADING_SELECT", "CASCADING_SELECT"]);
    expect(saved[1].config.dependsOn).toBe(saved[0].fieldKey);
    expect(saved[2].config.dependsOn).toBe(saved[1].fieldKey);
    expect(saved[2].config.options.map((item: { parentValue: string }) => item.parentValue)).toEqual(saved[1].config.options.map((item: { value: string }) => item.value));
    expect(saved[2].config.options[0].parentValue).not.toBe(saved[2].config.options[1].parentValue);
    expect(mapUdfFieldToFrontend(toApi(saved[2])).dataSource).toEqual(source);
  });

  it("uses dynamic source fields for a master hierarchy", () => {
    const dataSource = { ...newDataSource("hierarchy"), chainLevels: ["category", "productName"] };
    const saved = mapFieldsToSaveSchemaPayload([makeField({ type: "dependent-dropdown", dataSource })]);
    expect(saved[0].config).toMatchObject({ dataSource: "PRODUCT", valueField: "category" });
    expect(saved[1].config).toMatchObject({ dependsOn: saved[0].fieldKey, parentField: "category", valueField: "productName" });
  });

  it("preserves an existing single lookup until explicitly converted", () => {
    const existing = toApi({ fieldKey: "pick", label: "Pick", type: "API_SELECT", order: 0, required: false,
      config: { componentType: "LIST_VIEW", dataSource: "PRODUCT", labelField: "productName", valueField: "_id" } });
    const saved = saveOne(mapUdfFieldToFrontend(existing));
    expect(saved).toMatchObject({ type: "API_SELECT", config: existing.config });
  });

  it("publishes a table with column rules and restores its filter order", () => {
    const source = { ...newDataSource("table"), filterColumns: ["category"], readOnlyColumns: ["productName"],
      editableColumns: [{ name: "Quantity", type: "number" as const, required: true, min: 0, max: 100 }] };
    const saved = saveOne(makeField({ type: "list-view", dataSource: source }));
    expect(saved).toMatchObject({ type: "REPEATABLE_GROUP", view_type: "table",
      config: { fields: [{ required: false, config: { isReadOnly: true } }, { type: "NUMBER", required: true, config: { validation: { minValue: 0, maxValue: 100 } } }] } });
    expect(mapUdfFieldToFrontend(toApi(saved)).dataSource).toEqual(source);
  });

  it("compiles an arithmetic formula and rejects invalid references or syntax", () => {
    const quantity = makeField({ type: "number", id: "qty" });
    const total = makeField({ type: "calculation", formula: "({qty} + 1) × 50", formulaResultFormat: "currency" });
    const saved = mapFieldsToSaveSchemaPayload([quantity, total])[1];
    expect(saved.type).toBe("FORMULA");
    expect(saved.config.expression).toContainEqual({ type: "field", fieldKey: "qty" });
    expect(saved.config.expression).toContainEqual({ type: "operator", operator: "MULTIPLY" });
    expect(mapUdfFieldToFrontend(toApi(saved))).toMatchObject({ formula: total.formula, formulaResultFormat: "currency" });
    expect(() => mapFieldsToSaveSchemaPayload([total])).toThrow(/missing/);
    expect(() => mapFieldsToSaveSchemaPayload([quantity, { ...total, formula: "(1 +" }])).toThrow(/parenthesis/);
  });
});
