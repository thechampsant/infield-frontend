import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG_FORM,
  docToForm,
  formToDto,
  normalizeTakeOver,
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

describe("regularization per-level auto actions", () => {
  const doc = (regularization: Record<string, unknown>) =>
    ({ _id: "c1", attendanceTypes: [], regularization } as unknown as AttendanceConfigDoc);
  const actions = (form: AttendanceConfigForm) =>
    form.approvalLevels.map((level) => [level.autoAction, level.autoActionDays]);

  describe("docToForm", () => {
    it("reads per-level actions, defaulting a level without an entry to no action", () => {
      const form = docToForm(doc({
        approvalHierarchy: ["d1", "d2", "d3"],
        approvalLevelAutoActions: [
          { level: 1, autoAction: "AutoApprove", autoActionDays: 3 },
          { level: 2, autoAction: "AutoReject", autoActionDays: 4 },
        ],
      }));

      expect(actions(form)).toEqual([["AutoApprove", 3], ["AutoReject", 4], ["None", 0]]);
      expect(form.regAutoActionsFromLegacy).toBe(false);
    });

    it("maps a legacy auto-approval rule onto every level", () => {
      const form = docToForm(doc({
        approvalHierarchy: ["d1", "d2"],
        autoApprovalRules: { isEnabled: true, afterDays: 3, approveAllLevels: false },
      }));

      expect(actions(form)).toEqual([["AutoApprove", 3], ["AutoApprove", 3]]);
      expect(form.regAutoActionsFromLegacy).toBe(true);
    });

    it("gives every level the full days for approve-all-levels, so the Project Admin keeps them too", () => {
      const form = docToForm(doc({
        approvalHierarchy: ["d1", "d2", "d3"],
        autoApprovalRules: { isEnabled: true, afterDays: 3, approveAllLevels: true },
      }));

      expect(actions(form)).toEqual([["AutoApprove", 3], ["AutoApprove", 3], ["AutoApprove", 3]]);
      expect(form.regAutoActionsFromLegacy).toBe(true);
    });

    it("uses the legacy rule that fired first: reject when it has fewer days, approve on a tie", () => {
      const rejectFirst = docToForm(doc({
        approvalHierarchy: ["d1", "d2"],
        autoApprovalRules: { isEnabled: true, afterDays: 5 },
        autoRejectRules: { isEnabled: true, afterDays: 2 },
      }));
      const tie = docToForm(doc({
        approvalHierarchy: ["d1"],
        autoApprovalRules: { isEnabled: true, afterDays: 3 },
        autoRejectRules: { isEnabled: true, afterDays: 3 },
      }));

      expect(actions(rejectFirst)).toEqual([["AutoReject", 2], ["AutoReject", 2]]);
      expect(actions(tie)).toEqual([["AutoApprove", 3]]);
    });

    it("treats disabled or free-text legacy rules as no action", () => {
      const form = docToForm(doc({
        approvalHierarchy: ["d1"],
        autoApprovalRules: { isEnabled: false, afterDays: 3 },
        autoRejectRules: "Reject after 3 days",
      }));

      expect(actions(form)).toEqual([["None", 0]]);
      expect(form.regAutoActionsFromLegacy).toBe(false);
    });
  });

  describe("formToDto", () => {
    it("sends per-level actions numbered after dropping empty levels, with the legacy rules disabled", () => {
      const dto = formToDto({
        ...DEFAULT_CONFIG_FORM,
        approvalLevels: [
          { designationId: "d1", designationName: "", autoAction: "AutoApprove", autoActionDays: 3 },
          { designationId: " ", designationName: "", autoAction: "AutoReject", autoActionDays: 9 },
          { designationId: "d2", designationName: "", autoAction: "AutoReject", autoActionDays: 4 },
          { designationId: "d3", designationName: "", autoAction: "None", autoActionDays: 7 },
        ],
      });

      expect(dto.regularization.approvalHierarchy).toEqual(["d1", "d2", "d3"]);
      expect(dto.regularization.approvalLevelAutoActions).toEqual([
        { level: 1, autoAction: "AutoApprove", autoActionDays: 3 },
        { level: 2, autoAction: "AutoReject", autoActionDays: 4 },
        { level: 3, autoAction: "None", autoActionDays: 0 },
      ]);
      expect(dto.regularization.autoApprovalRules).toEqual({ isEnabled: false, afterDays: 0, approveAllLevels: false });
      expect(dto.regularization.autoRejectRules).toEqual({ isEnabled: false, afterDays: 0 });
    });

    it("round-trips per-level actions through docToForm -> formToDto", () => {
      const levels = [
        { level: 1, autoAction: "AutoApprove", autoActionDays: 3 },
        { level: 2, autoAction: "AutoReject", autoActionDays: 4 },
      ];
      const dto = formToDto(docToForm(doc({ approvalHierarchy: ["d1", "d2"], approvalLevelAutoActions: levels })));

      expect(dto.regularization.approvalLevelAutoActions).toEqual(levels);
    });
  });

  describe("level take-over", () => {
    const level = (autoAction: "None" | "AutoApprove" | "AutoReject", autoActionDays: number, takeOver = false) => ({
      designationId: "d",
      designationName: "",
      autoAction,
      autoActionDays,
      takeOverFromPreviousLevel: takeOver,
    });

    it("reads the flag and keeps the previous level's days as its wait", () => {
      const form = docToForm(doc({
        approvalHierarchy: ["d1", "d2"],
        approvalLevelAutoActions: [
          { level: 1, autoAction: "None", autoActionDays: 3 },
          { level: 2, autoAction: "AutoReject", autoActionDays: 2, takeOverFromPreviousLevel: true },
        ],
      }));

      expect(actions(form)).toEqual([["None", 3], ["AutoReject", 2]]);
      expect(form.approvalLevels.map((l) => l.takeOverFromPreviousLevel)).toEqual([false, true]);
    });

    it("sends the flag only when it is on, with the previous level's days", () => {
      const dto = formToDto({
        ...DEFAULT_CONFIG_FORM,
        approvalLevels: [
          { ...level("None", 3), designationId: "d1" },
          { ...level("AutoReject", 2, true), designationId: "d2" },
          { ...level("None", 5), designationId: "d3" },
        ],
      });

      expect(dto.regularization.approvalLevelAutoActions).toEqual([
        { level: 1, autoAction: "None", autoActionDays: 3 },
        { level: 2, autoAction: "AutoReject", autoActionDays: 2, takeOverFromPreviousLevel: true },
        { level: 3, autoAction: "None", autoActionDays: 0 },
      ]);
    });

    it("round-trips a take-over through docToForm -> formToDto", () => {
      const levels = [
        { level: 1, autoAction: "None", autoActionDays: 3 },
        { level: 2, autoAction: "None", autoActionDays: 4, takeOverFromPreviousLevel: true },
        { level: 3, autoAction: "AutoApprove", autoActionDays: 1, takeOverFromPreviousLevel: true },
      ];
      const dto = formToDto(docToForm(doc({ approvalHierarchy: ["d1", "d2", "d3"], approvalLevelAutoActions: levels })));

      expect(dto.regularization.approvalLevelAutoActions).toEqual(levels);
    });

    it("drops a flag on the first level or after a level with an auto action, and zeroes days nobody waits on", () => {
      expect(normalizeTakeOver([
        level("None", 3, true),
        level("AutoApprove", 2),
        level("None", 4, true),
      ])).toEqual([
        level("None", 0),
        level("AutoApprove", 2),
        level("None", 0),
      ]);
    });

    it("clears a flag when a removed level leaves an auto action before it", () => {
      const remaining = [level("AutoReject", 2), level("None", 0, true)];

      expect(normalizeTakeOver(remaining).map((l) => l.takeOverFromPreviousLevel)).toEqual([false, false]);
    });
  });
});
