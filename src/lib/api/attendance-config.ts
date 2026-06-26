/**
 * Attendance configuration service (INF2-1536).
 *
 * Backend exposes a single config per project:
 *   GET    /api/v1/attendance-config/get/{projectId}
 *   POST   /api/v1/attendance-config/create
 *   PUT    /api/v1/attendance-config/update/{projectId}
 *   PUT    /api/v1/attendance-config/activate/{projectId}
 *
 * The UI works against a flat `AttendanceConfigForm`; mappers translate to and
 * from the nested backend DTO shape.
 */

import { ApiError, apiClient } from "./api-client";

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
const BASE = "/api/v1/attendance-config";

// ─────────────────────────────────────────────────────────────
// Backend DTO types (matching Swagger schemas)
// ─────────────────────────────────────────────────────────────

export interface LabelConfigDto {
  isEnabled: boolean;
  label: string;
}

export interface AttendanceTypeDto {
  name: string;
  isActive: boolean;
  isGeoTagged: boolean;
  isGeoFenced: boolean;
  isPhotoRequired: boolean;
  isCustom: boolean;
  colour?: string;
  color?: string;
}

export interface GeoFencingConfigDto {
  isEnabled: boolean;
  radius?: number;
}

export type PhotoDirection = "Front" | "Back" | "Both";
export type PhotoSource = "Camera" | "Gallery" | "Both";

export interface PhotoCaptureConfigDto {
  direction: PhotoDirection;
  source: PhotoSource;
}

export interface RemarksConfigDto {
  isEnabled: boolean;
  isMandatory: boolean;
}

export interface CutOffTimeConfigDto {
  isEnabled: boolean;
  time?: string;
}

export interface InAppAlertConfigDto {
  isEnabled: boolean;
  alertFrom?: string;
  alertTill?: string;
}

export interface LogicThresholdDto {
  isEnabled: boolean;
  hours: number;
}

export interface HalfDayLogicDto {
  isEnabled: boolean;
  minHours: number;
  maxHours: number;
}

export interface WorkingHoursConfigDto {
  isEnabled: boolean;
  presentLogic: LogicThresholdDto;
  absentLogic: LogicThresholdDto;
  halfDayLogic: HalfDayLogicDto;
  enableSinglePunchLogic: boolean;
}

export type RegWindowType = "Days" | "Date Range";

export interface AutoRejectRulesDto {
  isEnabled: boolean;
  afterDays: number;
}

export interface AutoApprovalRulesDto {
  isEnabled: boolean;
  afterDays: number;
  approveAllLevels?: boolean;
}

export interface RegularizationConfigDto {
  isEnabled: boolean;
  windowType: RegWindowType;
  timeWindowDays: number;
  startDayOfMonth?: number;
  endDayOfMonth?: number;
  isMaxRequestsEnabled: boolean;
  maxRequestsLimit?: number;
  isApprovalFlowEnabled: boolean;
  approvalHierarchy: string[];
  autoRejectRules?: string | AutoRejectRulesDto;
  autoApprovalRules?: AutoApprovalRulesDto;
}

export interface LeaveModuleConfigDto {
  autoWeekOff: boolean;
}

/** Body shared by create/update (create also carries `projectId`). */
export interface AttendanceConfigDto {
  isModuleEnabled: boolean;
  checkInLabel: LabelConfigDto;
  checkOutLabel: LabelConfigDto;
  showDateField: boolean;
  attendanceTypes: AttendanceTypeDto[];
  geoFencing: GeoFencingConfigDto;
  photoCapture: PhotoCaptureConfigDto;
  remarks: RemarksConfigDto;
  checkInCutOff: CutOffTimeConfigDto;
  inAppAlert: InAppAlertConfigDto;
  useLocationWiseTimings: boolean;
  workingHours: WorkingHoursConfigDto;
  isAutoCheckOutEnabled: boolean;
  autoCheckOutTime: string;
  regularization: RegularizationConfigDto;
  leaveModule: LeaveModuleConfigDto;
}

export interface CreateAttendanceConfigDto extends AttendanceConfigDto {
  projectId: string;
}

/** Stored document returned by GET — all fields optional for defensive reads. */
export type AttendanceConfigDoc = Partial<CreateAttendanceConfigDto>;

// ─────────────────────────────────────────────────────────────
// UI form model (flat, used by the editor)
// ─────────────────────────────────────────────────────────────

export interface AttendanceTypeForm {
  name: string;
  isCustom: boolean;
  active: boolean;
  geoTagged: boolean;
  geoFenced: boolean;
  photoRequired: boolean;
  colour: string;
}

export interface ApprovalLevelForm {
  /** Designation ObjectId — sent to the backend */
  designationId: string;
  /** Human-readable designation name — display only */
  designationName: string;
}

export interface AttendanceConfigForm {
  isModuleEnabled: boolean;

  checkInEnabled: boolean;
  checkInLabel: string;
  checkOutEnabled: boolean;
  checkOutLabel: string;
  showDateField: boolean;

  types: AttendanceTypeForm[];

  geoFenceRadius: number;

  photoDirection: PhotoDirection;
  photoSource: PhotoSource;

  remarksEnabled: boolean;
  remarksMandatory: boolean;

  cutoffEnabled: boolean;
  cutoffTime: string;
  alertEnabled: boolean;
  alertFrom: string;
  alertTill: string;

  workingHoursEnabled: boolean;
  presentThresholdHrs: number;
  absentThresholdHrs: number;
  halfDayMinHrs: number;
  halfDayMaxHrs: number;
  singlePunchFullDay: boolean;

  autoCheckoutEnabled: boolean;
  autoCheckoutTime: string;

  locationTimingsEnabled: boolean;

  regularizationEnabled: boolean;
  regWindowType: RegWindowType;
  regTminusDays: number;
  regDateFrom: number;
  regDateTo: number;
  regMaxRequestsEnabled: boolean;
  regMaxRequestCount: number;
  regApprovalEnabled: boolean;
  approvalLevels: ApprovalLevelForm[];
  autoApprovalEnabled: boolean;
  autoApprovalAfterDays: number;
  autoApprovalAllLevels: boolean;
  autoRejectEnabled: boolean;
  autoRejectAfterDays: number;

  autoWeekOffEnabled: boolean;
}

const DEFAULT_TYPE_COLOUR = "#3377ff";

function normalizeTypeColour(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  return DEFAULT_TYPE_COLOUR;
}

/** Seven default attendance types per AC4. */
export const DEFAULT_ATTENDANCE_TYPES: AttendanceTypeForm[] = [
  { name: "Present", isCustom: false, active: true, geoTagged: true, geoFenced: true, photoRequired: true, colour: DEFAULT_TYPE_COLOUR },
  { name: "Holiday", isCustom: false, active: true, geoTagged: false, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR },
  { name: "Leave", isCustom: false, active: true, geoTagged: false, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR },
  { name: "Training", isCustom: false, active: true, geoTagged: true, geoFenced: false, photoRequired: true, colour: DEFAULT_TYPE_COLOUR },
  { name: "Meeting", isCustom: false, active: true, geoTagged: true, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR },
  { name: "Weekly Off", isCustom: false, active: true, geoTagged: false, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR },
  { name: "Comp Off", isCustom: false, active: false, geoTagged: false, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR },
];

export const DEFAULT_CONFIG_FORM: AttendanceConfigForm = {
  isModuleEnabled: false,

  checkInEnabled: true,
  checkInLabel: "",
  checkOutEnabled: true,
  checkOutLabel: "",
  showDateField: false,

  types: DEFAULT_ATTENDANCE_TYPES.map((t) => ({ ...t })),

  geoFenceRadius: 100,

  photoDirection: "Both",
  photoSource: "Both",

  remarksEnabled: true,
  remarksMandatory: false,

  cutoffEnabled: false,
  cutoffTime: "10:00",
  alertEnabled: false,
  alertFrom: "09:00",
  alertTill: "10:00",

  workingHoursEnabled: true,
  presentThresholdHrs: 9,
  absentThresholdHrs: 4.5,
  halfDayMinHrs: 4.5,
  halfDayMaxHrs: 9,
  singlePunchFullDay: false,

  autoCheckoutEnabled: false,
  autoCheckoutTime: "23:00",

  locationTimingsEnabled: false,

  regularizationEnabled: false,
  regWindowType: "Days",
  regTminusDays: 7,
  regDateFrom: 16,
  regDateTo: 16,
  regMaxRequestsEnabled: false,
  regMaxRequestCount: 5,
  regApprovalEnabled: true,
  approvalLevels: [],
  autoApprovalEnabled: false,
  autoApprovalAfterDays: 3,
  autoApprovalAllLevels: false,
  autoRejectEnabled: false,
  autoRejectAfterDays: 3,

  autoWeekOffEnabled: false,
};

function parseLegacyRuleDays(rule: unknown, fallback: number): number {
  if (rule && typeof rule === "object" && "afterDays" in rule) {
    const days = Number((rule as { afterDays?: unknown }).afterDays);
    return Number.isFinite(days) ? days : fallback;
  }

  if (typeof rule === "string") {
    const match = rule.match(/\d+/);
    if (match) {
      const days = Number(match[0]);
      return Number.isFinite(days) ? days : fallback;
    }
  }

  return fallback;
}

function isStructuredRuleEnabled(rule: unknown): boolean {
  return Boolean(rule && typeof rule === "object" && (rule as { isEnabled?: unknown }).isEnabled === true);
}

// ─────────────────────────────────────────────────────────────
// Mappers: backend doc → UI form
// ─────────────────────────────────────────────────────────────

export function docToForm(doc: AttendanceConfigDoc | null): AttendanceConfigForm {
  if (!doc) return { ...DEFAULT_CONFIG_FORM, types: DEFAULT_ATTENDANCE_TYPES.map((t) => ({ ...t })) };

  const wh = doc.workingHours;
  const reg = doc.regularization;

  const types: AttendanceTypeForm[] =
    Array.isArray(doc.attendanceTypes) && doc.attendanceTypes.length
      ? doc.attendanceTypes.map((t) => ({
          name: t.name,
          isCustom: Boolean(t.isCustom),
          active: Boolean(t.isActive),
          geoTagged: Boolean(t.isGeoTagged),
          geoFenced: Boolean(t.isGeoFenced),
          photoRequired: Boolean(t.isPhotoRequired),
          colour: normalizeTypeColour(t.colour ?? t.color),
        }))
      : DEFAULT_ATTENDANCE_TYPES.map((t) => ({ ...t }));

  return {
    isModuleEnabled: Boolean(doc.isModuleEnabled),

    checkInEnabled: doc.checkInLabel?.isEnabled ?? true,
    checkInLabel: doc.checkInLabel?.label ?? "",
    checkOutEnabled: doc.checkOutLabel?.isEnabled ?? true,
    checkOutLabel: doc.checkOutLabel?.label ?? "",
    showDateField: Boolean(doc.showDateField),

    types,

    geoFenceRadius: doc.geoFencing?.radius ?? DEFAULT_CONFIG_FORM.geoFenceRadius,

    photoDirection: doc.photoCapture?.direction ?? DEFAULT_CONFIG_FORM.photoDirection,
    photoSource: doc.photoCapture?.source ?? DEFAULT_CONFIG_FORM.photoSource,

    remarksEnabled: doc.remarks?.isEnabled ?? DEFAULT_CONFIG_FORM.remarksEnabled,
    remarksMandatory: Boolean(doc.remarks?.isMandatory),

    cutoffEnabled: Boolean(doc.checkInCutOff?.isEnabled),
    cutoffTime: doc.checkInCutOff?.time ?? DEFAULT_CONFIG_FORM.cutoffTime,
    alertEnabled: Boolean(doc.inAppAlert?.isEnabled),
    alertFrom: doc.inAppAlert?.alertFrom ?? DEFAULT_CONFIG_FORM.alertFrom,
    alertTill: doc.inAppAlert?.alertTill ?? DEFAULT_CONFIG_FORM.alertTill,

    workingHoursEnabled: wh?.isEnabled ?? DEFAULT_CONFIG_FORM.workingHoursEnabled,
    presentThresholdHrs: wh?.presentLogic?.hours ?? DEFAULT_CONFIG_FORM.presentThresholdHrs,
    absentThresholdHrs: wh?.absentLogic?.hours ?? DEFAULT_CONFIG_FORM.absentThresholdHrs,
    halfDayMinHrs: wh?.halfDayLogic?.minHours ?? DEFAULT_CONFIG_FORM.halfDayMinHrs,
    halfDayMaxHrs: wh?.halfDayLogic?.maxHours ?? DEFAULT_CONFIG_FORM.halfDayMaxHrs,
    singlePunchFullDay: Boolean(wh?.enableSinglePunchLogic),

    autoCheckoutEnabled: Boolean(doc.isAutoCheckOutEnabled),
    autoCheckoutTime: doc.autoCheckOutTime ?? DEFAULT_CONFIG_FORM.autoCheckoutTime,

    locationTimingsEnabled: Boolean(doc.useLocationWiseTimings),

    regularizationEnabled: Boolean(reg?.isEnabled),
    regWindowType: reg?.windowType ?? DEFAULT_CONFIG_FORM.regWindowType,
    regTminusDays: reg?.timeWindowDays ?? DEFAULT_CONFIG_FORM.regTminusDays,
    regDateFrom: reg?.startDayOfMonth ?? DEFAULT_CONFIG_FORM.regDateFrom,
    regDateTo: reg?.endDayOfMonth ?? DEFAULT_CONFIG_FORM.regDateTo,
    regMaxRequestsEnabled: Boolean(reg?.isMaxRequestsEnabled),
    regMaxRequestCount: reg?.maxRequestsLimit ?? DEFAULT_CONFIG_FORM.regMaxRequestCount,
    regApprovalEnabled: reg?.isApprovalFlowEnabled ?? DEFAULT_CONFIG_FORM.regApprovalEnabled,
    approvalLevels:
      Array.isArray(reg?.approvalHierarchy) && reg.approvalHierarchy.length
        ? reg.approvalHierarchy.map((id) => ({ designationId: id, designationName: '' }))
        : [],
    autoApprovalEnabled: Boolean(reg?.autoApprovalRules?.isEnabled),
    autoApprovalAfterDays: reg?.autoApprovalRules?.afterDays ?? DEFAULT_CONFIG_FORM.autoApprovalAfterDays,
    autoApprovalAllLevels: Boolean(reg?.autoApprovalRules?.approveAllLevels),
    autoRejectEnabled: isStructuredRuleEnabled(reg?.autoRejectRules),
    autoRejectAfterDays: parseLegacyRuleDays(reg?.autoRejectRules, DEFAULT_CONFIG_FORM.autoRejectAfterDays),

    autoWeekOffEnabled: Boolean(doc.leaveModule?.autoWeekOff),
  };
}

// ─────────────────────────────────────────────────────────────
// Mappers: UI form → backend body
// ─────────────────────────────────────────────────────────────

function label(value: string, fallback: string): LabelConfigDto {
  const trimmed = value.trim();
  return { isEnabled: true, label: trimmed || fallback };
}

export function formToDto(form: AttendanceConfigForm): AttendanceConfigDto {
  const anyGeoFenced = form.types.some((t) => t.geoFenced);

  return {
    isModuleEnabled: form.isModuleEnabled,
    checkInLabel: { ...label(form.checkInLabel, "Check-In"), isEnabled: form.checkInEnabled },
    checkOutLabel: {
      ...label(form.checkOutLabel, "Check-Out"),
      isEnabled: form.checkOutEnabled,
    },
    showDateField: form.showDateField,
    attendanceTypes: form.types.map((t) => ({
      name: t.name,
      isActive: t.active,
      isGeoTagged: t.geoTagged,
      isGeoFenced: t.geoFenced,
      isPhotoRequired: t.photoRequired,
      isCustom: t.isCustom,
      colour: normalizeTypeColour(t.colour),
    })),
    geoFencing: { isEnabled: anyGeoFenced, radius: form.geoFenceRadius },
    photoCapture: { direction: form.photoDirection, source: form.photoSource },
    remarks: { isEnabled: form.remarksEnabled, isMandatory: form.remarksMandatory },
    checkInCutOff: { isEnabled: form.cutoffEnabled, time: form.cutoffTime },
    inAppAlert: {
      isEnabled: form.alertEnabled,
      alertFrom: form.alertFrom,
      alertTill: form.alertTill,
    },
    useLocationWiseTimings: form.locationTimingsEnabled,
    workingHours: {
      isEnabled: form.workingHoursEnabled,
      presentLogic: { isEnabled: form.workingHoursEnabled, hours: form.presentThresholdHrs },
      absentLogic: { isEnabled: form.workingHoursEnabled, hours: form.absentThresholdHrs },
      halfDayLogic: {
        isEnabled: form.workingHoursEnabled,
        minHours: form.halfDayMinHrs,
        maxHours: form.halfDayMaxHrs,
      },
      enableSinglePunchLogic: form.singlePunchFullDay,
    },
    isAutoCheckOutEnabled: form.autoCheckoutEnabled,
    autoCheckOutTime: form.autoCheckoutTime,
    regularization: {
      isEnabled: form.regularizationEnabled,
      windowType: form.regWindowType,
      timeWindowDays: form.regTminusDays,
      startDayOfMonth: form.regDateFrom,
      endDayOfMonth: form.regDateTo,
      isMaxRequestsEnabled: form.regMaxRequestsEnabled,
      maxRequestsLimit: form.regMaxRequestCount,
      isApprovalFlowEnabled: form.regApprovalEnabled,
      approvalHierarchy: form.approvalLevels
        .map((a) => a.designationId.trim())
        .filter(Boolean),
      autoApprovalRules: {
        isEnabled: form.autoApprovalEnabled,
        afterDays: form.autoApprovalAfterDays,
        approveAllLevels: form.autoApprovalAllLevels,
      },
      autoRejectRules: {
        isEnabled: form.autoRejectEnabled,
        afterDays: form.autoRejectAfterDays,
      },
    },
    leaveModule: { autoWeekOff: form.autoWeekOffEnabled },
  };
}

// ─────────────────────────────────────────────────────────────
// Mock implementation (in-memory, keyed by projectId)
// ─────────────────────────────────────────────────────────────

const mockStore = new Map<string, AttendanceConfigDoc>();

function delay(ms = 400): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

export const attendanceConfigService = {
  async get(projectId: string): Promise<AttendanceConfigDoc | null> {
    if (USE_MOCK_API) {
      await delay(250);
      return mockStore.get(projectId) ?? null;
    }
    try {
      const doc = await apiClient.get<AttendanceConfigDoc | null>(
        `${BASE}/get/${projectId}`,
      );
      return doc ?? null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async create(projectId: string, form: AttendanceConfigForm): Promise<AttendanceConfigDoc> {
    const body: CreateAttendanceConfigDto = { projectId, ...formToDto(form) };
    if (USE_MOCK_API) {
      await delay();
      const doc = body as AttendanceConfigDoc;
      mockStore.set(projectId, doc);
      return doc;
    }
    return apiClient.post<AttendanceConfigDoc>(`${BASE}/create`, body);
  },

  async update(projectId: string, form: AttendanceConfigForm): Promise<AttendanceConfigDoc> {
    const body = formToDto(form);
    if (USE_MOCK_API) {
      await delay();
      const doc = { projectId, ...body } as AttendanceConfigDoc;
      mockStore.set(projectId, doc);
      return doc;
    }
    return apiClient.put<AttendanceConfigDoc>(`${BASE}/update/${projectId}`, body);
  },

  async activate(projectId: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay(150);
      return;
    }
    await apiClient.put<void>(`${BASE}/activate/${projectId}`, {});
  },
};
