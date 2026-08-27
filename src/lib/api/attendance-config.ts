/**
 * Attendance configuration service (INF2-1536).
 *
 * Backend supports legacy project-level configs and designation-scoped configs:
 *   GET    /api/v1/attendance-config/get/{projectId}
 *   GET    /api/v1/attendance-config/list/{projectId}
 *   GET    /api/v1/attendance-config/{configId}
 *   POST   /api/v1/attendance-config/create
 *   PUT    /api/v1/attendance-config/update/{projectId}
 *   PUT    /api/v1/attendance-config/{configId}
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
  isImageRecognitionEnabled?: boolean;
  isRandomAttendanceEnabled?: boolean;
}

export interface GeoFencingConfigDto {
  isEnabled: boolean;
  radius?: number;
  bypassWhenStoreUnavailable?: boolean;
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
  enableTimerLimit?: boolean;
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

export interface RegularizationReasonOptionDto {
  key: string;
  label: string;
  isActive?: boolean;
  displayOrder?: number;
  requiresRemarks?: boolean;
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
  reasonOptions?: RegularizationReasonOptionDto[];
  autoRejectRules?: string | AutoRejectRulesDto;
  autoApprovalRules?: AutoApprovalRulesDto;
}

export interface LeaveModuleConfigDto {
  autoWeekOff: boolean;
}

export type ShiftAssignmentMode = "USER_MASTER" | "STORE_MASTER";

export interface ShiftManagementConfigDto {
  isEnabled: boolean;
  assignmentMode: ShiftAssignmentMode;
  zeroHoursBypassEnabled: boolean;
  bypassAttendanceTypes: string[];
}

export interface ImageRecognitionConfigDto {
  isEnabled: boolean;
}

export interface RandomAttendanceConfigDto {
  isEnabled: boolean;
  fromTime: string | null;
  tillTime: string | null;
  maxNotificationsPerDay: number;
  responseWindowMinutes: number;
  expiredWindowMessage: string;
}

/** Body shared by create/update (create also carries `projectId`). */
export interface AttendanceConfigDto {
  name?: string;
  applicableDesignations?: string[];
  isModuleEnabled: boolean;
  requireCheckInToAccessModules?: boolean;
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
  shiftManagement: ShiftManagementConfigDto;
  imageRecognition: ImageRecognitionConfigDto;
  randomAttendance: RandomAttendanceConfigDto;
}

export interface CreateAttendanceConfigDto extends AttendanceConfigDto {
  projectId: string;
}

/** Stored document returned by GET — all fields optional for defensive reads. */
export type AttendanceConfigDoc = Partial<CreateAttendanceConfigDto> & {
  _id?: string;
  id?: string;
  name?: string;
  applicableDesignations?: string[];
  isActive?: boolean;
  checkInFormSchemaKey?: string;
  checkOutFormSchemaKey?: string;
  createdAt?: string;
  updatedAt?: string;
};

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
  imageRecognitionEnabled: boolean;
  randomAttendanceEnabled: boolean;
}

export interface ApprovalLevelForm {
  /** Designation ObjectId — sent to the backend */
  designationId: string;
  /** Human-readable designation name — display only */
  designationName: string;
}

export interface RegularizationReasonOptionForm extends RegularizationReasonOptionDto {
  /** Present only after loading a saved row, used for inline key-change caution. */
  originalKey?: string;
}

export interface AttendanceConfigForm {
  id?: string;
  name: string;
  applicableDesignations: string[];

  isModuleEnabled: boolean;
  requireCheckInToAccessModules: boolean;

  checkInEnabled: boolean;
  checkInLabel: string;
  checkOutEnabled: boolean;
  checkOutLabel: string;
  showDateField: boolean;

  types: AttendanceTypeForm[];

  geoFenceRadius: number;
  geoFenceBypassWhenStoreUnavailable: boolean;

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
  shiftManagementEnabled: boolean;
  shiftAssignmentMode: ShiftAssignmentMode;
  zeroHoursBypassEnabled: boolean;
  shiftBypassAttendanceTypes: string[];
  maxWorkingHoursTimerLimitEnabled: boolean;
  imageRecognitionEnabled: boolean;
  randomAttendanceEnabled: boolean;
  randomAttendanceFromTime: string;
  randomAttendanceTillTime: string;
  randomAttendanceMaxNotificationsPerDay: number;
  randomAttendanceResponseWindowMinutes: number;
  randomAttendanceExpiredWindowMessage: string;

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
  regReasonOptions: RegularizationReasonOptionForm[];
  autoApprovalEnabled: boolean;
  autoApprovalAfterDays: number;
  autoApprovalAllLevels: boolean;
  autoRejectEnabled: boolean;
  autoRejectAfterDays: number;

  autoWeekOffEnabled: boolean;
}

const DEFAULT_TYPE_COLOUR = "#3377ff";
export const DEFAULT_RANDOM_ATTENDANCE_EXPIRED_MESSAGE =
  "Your window to mark attendance has closed. Please contact your manager for regularization.";

function normalizeTypeColour(value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  return DEFAULT_TYPE_COLOUR;
}

/** Seven default attendance types per AC4. */
export const DEFAULT_ATTENDANCE_TYPES: AttendanceTypeForm[] = [
  { name: "Present", isCustom: false, active: true, geoTagged: true, geoFenced: true, photoRequired: true, colour: DEFAULT_TYPE_COLOUR, imageRecognitionEnabled: false, randomAttendanceEnabled: false },
  { name: "Holiday", isCustom: false, active: true, geoTagged: false, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR, imageRecognitionEnabled: false, randomAttendanceEnabled: false },
  { name: "Leave", isCustom: false, active: true, geoTagged: false, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR, imageRecognitionEnabled: false, randomAttendanceEnabled: false },
  { name: "Training", isCustom: false, active: true, geoTagged: true, geoFenced: false, photoRequired: true, colour: DEFAULT_TYPE_COLOUR, imageRecognitionEnabled: false, randomAttendanceEnabled: false },
  { name: "Meeting", isCustom: false, active: true, geoTagged: true, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR, imageRecognitionEnabled: false, randomAttendanceEnabled: false },
  { name: "Weekly Off", isCustom: false, active: true, geoTagged: false, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR, imageRecognitionEnabled: false, randomAttendanceEnabled: false },
  { name: "Comp Off", isCustom: false, active: false, geoTagged: false, geoFenced: false, photoRequired: false, colour: DEFAULT_TYPE_COLOUR, imageRecognitionEnabled: false, randomAttendanceEnabled: false },
];

export const DEFAULT_REGULARIZATION_REASON_OPTIONS: RegularizationReasonOptionForm[] = [
  { key: "forgot_to_punch", label: "Forgot to Punch", isActive: true, displayOrder: 1, requiresRemarks: false },
  { key: "system_biometric_error", label: "System / Biometric Error", isActive: true, displayOrder: 2, requiresRemarks: false },
  { key: "client_visit_offsite", label: "Client Visit / Offsite", isActive: true, displayOrder: 3, requiresRemarks: false },
  { key: "work_from_home", label: "Work From Home", isActive: true, displayOrder: 4, requiresRemarks: false },
  { key: "on_duty_field_work", label: "On Duty - Field Work", isActive: true, displayOrder: 5, requiresRemarks: false },
  { key: "emergency_medical", label: "Emergency / Medical", isActive: true, displayOrder: 6, requiresRemarks: false },
  { key: "transport_issue", label: "Transport Issue", isActive: true, displayOrder: 7, requiresRemarks: false },
  { key: "other", label: "Other", isActive: true, displayOrder: 99, requiresRemarks: true },
];

export const DEFAULT_CONFIG_FORM: AttendanceConfigForm = {
  id: undefined,
  name: "",
  applicableDesignations: [],

  isModuleEnabled: false,
  requireCheckInToAccessModules: false,

  checkInEnabled: true,
  checkInLabel: "",
  checkOutEnabled: true,
  checkOutLabel: "",
  showDateField: false,

  types: DEFAULT_ATTENDANCE_TYPES.map((t) => ({ ...t })),

  geoFenceRadius: 100,
  geoFenceBypassWhenStoreUnavailable: false,

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
  shiftManagementEnabled: false,
  shiftAssignmentMode: "USER_MASTER",
  zeroHoursBypassEnabled: true,
  shiftBypassAttendanceTypes: [],
  maxWorkingHoursTimerLimitEnabled: false,
  imageRecognitionEnabled: false,
  randomAttendanceEnabled: false,
  randomAttendanceFromTime: "10:00",
  randomAttendanceTillTime: "18:00",
  randomAttendanceMaxNotificationsPerDay: 1,
  randomAttendanceResponseWindowMinutes: 15,
  randomAttendanceExpiredWindowMessage: DEFAULT_RANDOM_ATTENDANCE_EXPIRED_MESSAGE,

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
  regReasonOptions: [],
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
  const rootIrEnabled = Boolean(doc.imageRecognition?.isEnabled);
  const rootRandomEnabled = Boolean(doc.randomAttendance?.isEnabled);

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
          imageRecognitionEnabled: rootIrEnabled && Boolean(t.isImageRecognitionEnabled),
          randomAttendanceEnabled:
            rootRandomEnabled && Boolean(t.isActive) && Boolean(t.isRandomAttendanceEnabled),
        }))
      : DEFAULT_ATTENDANCE_TYPES.map((t) => ({ ...t }));

  return {
    id: doc._id ?? doc.id,
    name: doc.name ?? "",
    applicableDesignations: Array.isArray(doc.applicableDesignations)
      ? doc.applicableDesignations.filter(Boolean)
      : [],

    isModuleEnabled: Boolean(doc.isModuleEnabled),
    requireCheckInToAccessModules: Boolean(doc.requireCheckInToAccessModules),

    checkInEnabled: doc.checkInLabel?.isEnabled ?? true,
    checkInLabel: doc.checkInLabel?.label ?? "",
    checkOutEnabled: doc.checkOutLabel?.isEnabled ?? true,
    checkOutLabel: doc.checkOutLabel?.label ?? "",
    showDateField: Boolean(doc.showDateField),

    types,

    geoFenceRadius: doc.geoFencing?.radius ?? DEFAULT_CONFIG_FORM.geoFenceRadius,
    geoFenceBypassWhenStoreUnavailable: Boolean(doc.geoFencing?.bypassWhenStoreUnavailable),

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
    shiftManagementEnabled: Boolean(doc.shiftManagement?.isEnabled),
    shiftAssignmentMode: doc.shiftManagement?.assignmentMode ?? DEFAULT_CONFIG_FORM.shiftAssignmentMode,
    zeroHoursBypassEnabled:
      doc.shiftManagement?.zeroHoursBypassEnabled ??
      DEFAULT_CONFIG_FORM.zeroHoursBypassEnabled,
    shiftBypassAttendanceTypes: Array.isArray(doc.shiftManagement?.bypassAttendanceTypes)
      ? doc.shiftManagement.bypassAttendanceTypes.filter(Boolean)
      : [],
    maxWorkingHoursTimerLimitEnabled: Boolean(wh?.enableTimerLimit),
    imageRecognitionEnabled: rootIrEnabled,
    randomAttendanceEnabled: rootRandomEnabled,
    randomAttendanceFromTime:
      doc.randomAttendance?.fromTime ?? DEFAULT_CONFIG_FORM.randomAttendanceFromTime,
    randomAttendanceTillTime:
      doc.randomAttendance?.tillTime ?? DEFAULT_CONFIG_FORM.randomAttendanceTillTime,
    randomAttendanceMaxNotificationsPerDay:
      doc.randomAttendance?.maxNotificationsPerDay ??
      DEFAULT_CONFIG_FORM.randomAttendanceMaxNotificationsPerDay,
    randomAttendanceResponseWindowMinutes:
      doc.randomAttendance?.responseWindowMinutes ??
      DEFAULT_CONFIG_FORM.randomAttendanceResponseWindowMinutes,
    randomAttendanceExpiredWindowMessage:
      doc.randomAttendance?.expiredWindowMessage ??
      DEFAULT_CONFIG_FORM.randomAttendanceExpiredWindowMessage,

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
    regReasonOptions: Array.isArray(reg?.reasonOptions)
      ? reg.reasonOptions.map((option) => ({
          key: option.key ?? "",
          label: option.label ?? "",
          isActive: option.isActive ?? true,
          displayOrder: option.displayOrder,
          requiresRemarks: Boolean(option.requiresRemarks),
          originalKey: option.key ?? "",
        }))
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
  const activeTypeNames = new Set(
    form.types.filter((t) => t.active).map((t) => t.name.trim()).filter(Boolean),
  );

  return {
    name: form.name.trim() || undefined,
    applicableDesignations: form.applicableDesignations,
    isModuleEnabled: form.isModuleEnabled,
    requireCheckInToAccessModules: form.requireCheckInToAccessModules,
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
      isImageRecognitionEnabled:
        form.imageRecognitionEnabled && t.active && t.photoRequired && t.imageRecognitionEnabled,
      isRandomAttendanceEnabled:
        form.randomAttendanceEnabled && t.active && t.randomAttendanceEnabled,
    })),
    geoFencing: {
      isEnabled: anyGeoFenced,
      radius: form.geoFenceRadius,
      bypassWhenStoreUnavailable: form.geoFenceBypassWhenStoreUnavailable,
    },
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
      enableTimerLimit: form.maxWorkingHoursTimerLimitEnabled,
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
      reasonOptions: form.regReasonOptions.map((option) => ({
        key: option.key.trim(),
        label: option.label.trim(),
        isActive: option.isActive ?? true,
        displayOrder: Number.isFinite(Number(option.displayOrder))
          ? Number(option.displayOrder)
          : undefined,
        requiresRemarks: Boolean(option.requiresRemarks),
      })),
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
    shiftManagement: {
      isEnabled: form.shiftManagementEnabled,
      assignmentMode: form.shiftAssignmentMode,
      zeroHoursBypassEnabled: form.zeroHoursBypassEnabled,
      bypassAttendanceTypes: form.shiftBypassAttendanceTypes
        .map((name) => name.trim())
        .filter((name, index, names) => Boolean(name) && activeTypeNames.has(name) && names.indexOf(name) === index),
    },
    imageRecognition: { isEnabled: form.imageRecognitionEnabled },
    randomAttendance: {
      isEnabled: form.randomAttendanceEnabled,
      fromTime: form.randomAttendanceEnabled ? form.randomAttendanceFromTime : null,
      tillTime: form.randomAttendanceEnabled ? form.randomAttendanceTillTime : null,
      maxNotificationsPerDay: form.randomAttendanceMaxNotificationsPerDay,
      responseWindowMinutes: form.randomAttendanceResponseWindowMinutes,
      expiredWindowMessage: form.randomAttendanceExpiredWindowMessage,
    },
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
  async list(projectId: string): Promise<AttendanceConfigDoc[]> {
    if (USE_MOCK_API) {
      await delay(250);
      return Array.from(mockStore.values()).filter((doc) => doc.projectId === projectId);
    }
    const docs = await apiClient.get<AttendanceConfigDoc[]>(`${BASE}/list/${projectId}`);
    return Array.isArray(docs) ? docs : [];
  },

  async getById(configId: string): Promise<AttendanceConfigDoc | null> {
    if (USE_MOCK_API) {
      await delay(250);
      return mockStore.get(configId) ?? null;
    }
    try {
      const doc = await apiClient.get<AttendanceConfigDoc | null>(`${BASE}/${configId}`);
      return doc ?? null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async get(projectId: string): Promise<AttendanceConfigDoc | null> {
    if (USE_MOCK_API) {
      await delay(250);
      return Array.from(mockStore.values()).find((doc) => doc.projectId === projectId) ?? null;
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
      const id = `att-config-${mockStore.size + 1}`;
      const doc = { _id: id, ...body, isActive: true } as AttendanceConfigDoc;
      mockStore.set(id, doc);
      return doc;
    }
    return apiClient.post<AttendanceConfigDoc>(`${BASE}/create`, body);
  },

  async updateById(configId: string, form: AttendanceConfigForm): Promise<AttendanceConfigDoc> {
    const body = formToDto(form);
    if (USE_MOCK_API) {
      await delay();
      const current = mockStore.get(configId) ?? {};
      const doc = { ...current, ...body, _id: configId } as AttendanceConfigDoc;
      mockStore.set(configId, doc);
      return doc;
    }
    return apiClient.put<AttendanceConfigDoc>(`${BASE}/${configId}`, body);
  },

  async update(projectId: string, form: AttendanceConfigForm): Promise<AttendanceConfigDoc> {
    const body = formToDto(form);
    if (USE_MOCK_API) {
      await delay();
      const current =
        Array.from(mockStore.entries()).find(([, doc]) => doc.projectId === projectId) ??
        [`att-config-${mockStore.size + 1}`, {} as AttendanceConfigDoc];
      const [id, currentDoc] = current;
      const doc = { ...currentDoc, projectId, ...body, _id: id } as AttendanceConfigDoc;
      mockStore.set(id, doc);
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
