import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG_FORM,
  docToForm,
  formToDto,
  type AttendanceConfigDoc,
  type AttendanceConfigForm,
  type AttendanceTypeForm,
} from "./attendance-config";

/** INF2-2569 — per-attendance-type Approval toggle. */
describe("attendance type Approval mapping", () => {
  const type = (overrides: Partial<AttendanceTypeForm> = {}): AttendanceTypeForm => ({
    name: "Training",
    isCustom: false,
    active: true,
    geoTagged: false,
    geoFenced: false,
    photoRequired: false,
    colour: "#3377ff",
    imageRecognitionEnabled: false,
    randomAttendanceEnabled: false,
    approvalRequired: false,
    isBypassed: false,
    bypassMessage: "",
    ...overrides,
  });

  const form = (types: AttendanceTypeForm[]): AttendanceConfigForm => ({
    ...DEFAULT_CONFIG_FORM,
    types,
  });

  describe("formToDto", () => {
    it("sends the flag for an active type", () => {
      const dto = formToDto(form([type({ approvalRequired: true })]));
      expect(dto.attendanceTypes[0].isApprovalRequired).toBe(true);
    });

    it("keeps the flag on a BYPASSED type — Training and Store Closed are the use case", () => {
      const dto = formToDto(form([type({ approvalRequired: true, isBypassed: true })]));
      expect(dto.attendanceTypes[0].isApprovalRequired).toBe(true);
      // the geo/photo flags are still cleared by bypass, as before
      expect(dto.attendanceTypes[0].isGeoTagged).toBe(false);
    });

    it("forces the flag off for an inactive type", () => {
      const dto = formToDto(form([type({ approvalRequired: true, active: false })]));
      expect(dto.attendanceTypes[0].isApprovalRequired).toBe(false);
    });
  });

  describe("docToForm", () => {
    const doc = (attendanceTypes: Record<string, unknown>[]) =>
      ({ _id: "c1", attendanceTypes } as unknown as AttendanceConfigDoc);

    it("round-trips the flag", () => {
      const result = docToForm(doc([{ name: "Training", isActive: true, isApprovalRequired: true }]));
      expect(result.types[0].approvalRequired).toBe(true);
    });

    it("preserves the flag for a bypassed type", () => {
      const result = docToForm(
        doc([{ name: "Store Closed", isActive: true, isBypassed: true, isApprovalRequired: true }]),
      );
      expect(result.types[0].approvalRequired).toBe(true);
    });

    it("clears the flag for an inactive type", () => {
      const result = docToForm(doc([{ name: "Old", isActive: false, isApprovalRequired: true }]));
      expect(result.types[0].approvalRequired).toBe(false);
    });

    it("defaults to off for a config saved before the feature existed", () => {
      const result = docToForm(doc([{ name: "Present", isActive: true }]));
      expect(result.types[0].approvalRequired).toBe(false);
    });
  });

  it("round-trips through docToForm -> formToDto unchanged", () => {
    const original = docToForm(
      doc1([{ name: "Training", isActive: true, isApprovalRequired: true }]),
    );
    const dto = formToDto(original);
    expect(dto.attendanceTypes[0].isApprovalRequired).toBe(true);
  });

  function doc1(attendanceTypes: Record<string, unknown>[]) {
    return { _id: "c1", attendanceTypes } as unknown as AttendanceConfigDoc;
  }
});
