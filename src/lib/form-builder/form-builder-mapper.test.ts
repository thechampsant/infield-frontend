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
