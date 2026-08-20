import { ApiError, apiClient } from "./api-client";

const BASE = "/api/v1/leave-config";
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
const MONGO_ID_PATTERN = /^[a-f\d]{24}$/i;

export type LeaveYear = "Calendar" | "Financial";
export type LeaveEntitlementType = "Annual" | "Monthly" | "OneTime";
export type LeaveCreditRuleType =
  | "LeaveYearStart"
  | "AttendanceCycleStart"
  | "FixedDateOfMonth";
export type LeaveHolidayType = "National" | "Regional" | "Optional";
export type LeaveAutoAction = "None" | "AutoApprove" | "AutoReject";
export type LeaveTypeMode = "Periodic" | "Maternity" | "Paternity" | "CompOff";
export type LeaveSpecialTemplate = "Maternity" | "Paternity" | "CompOff";
export type ParentalChildCategory = "FirstOrSecondChild" | "ThirdOrMoreChild";

export interface LeaveVisibility {
  showLeaveBalance: boolean;
  showTransactionHistory: boolean;
  showHolidayCalendar: boolean;
}

export interface LeaveHoliday {
  _id?: string;
  date: string;
  name: string;
  type: LeaveHolidayType;
}

export interface LeaveHolidayGroup {
  fieldValue: string;
  holidays: LeaveHoliday[];
}

export interface HolidayGroupingField {
  fieldKey: string;
  label: string;
  source: "STATIC" | "UDF";
  type: string;
  options?: string[];
}

export interface LeaveTypeConfig {
  [key: string]: unknown;
  _id?: string;
  name: string;
  shortCode: string;
  colour: string;
  isCustom: boolean;
  leaveTypeMode?: LeaveTypeMode;
  leaveYear: LeaveYear;
  attendanceCycle: {
    startDay: number;
    endDay: number;
  };
  entitlementType: LeaveEntitlementType;
  totalLeavesPerYear: number;
  creditRule: {
    type: LeaveCreditRuleType;
    fixedDate: number;
    minimumWorkingDays: number;
  };
  newJoinerRules: {
    proRateForNewJoiners: boolean;
    creditOnDoj: boolean;
    minimumTenureMonths: number;
  };
  carryForwardRule: {
    isAllowed: boolean;
    maxDays: number;
    expiresAtYearEnd: boolean;
  };
  applicationRules: {
    allowBackdated: boolean;
    maxBackdatedDays: number;
    allowFuture: boolean;
    maxFutureDays: number;
    maxRequestsPerMonth: number;
    applicationClosingDate: {
      isEnabled: boolean;
      day: number;
    };
    managerApprovalClosingDate: {
      isEnabled: boolean;
      day: number;
    };
  };
  reasons: string[];
  attachmentRules: {
    isRequired: boolean;
    mandatoryAfterDays: number;
    allowCameraCapture: boolean;
    allowGalleryUpload: boolean;
  };
  approvalWorkflow: {
    isApprovalRequired: boolean;
    levels: LeaveApprovalLevel[];
  };
  genderEligibility?: {
    fieldKey: "gender" | string;
    eligibleValues: string[];
  };
  maternityRules?: {
    childLimits: Array<{
      category: ParentalChildCategory | string;
      maxDays: number;
    }>;
    pregnancyIllnessExtension?: {
      isAllowed: boolean;
      durationWeeks: number;
    };
  };
  paternityRules?: {
    childLimits: Array<{
      category: ParentalChildCategory | string;
      maxDays: number;
    }>;
  };
  compOffRules?: {
    sourceAttendanceTypes: string[];
    lookbackDays: number;
  };
  clubbingRules?: {
    allowedLeaveTypeIds: string[];
  };
}

export interface LeaveApprovalLevel {
  level: number;
  approverRole: string;
  autoAction: LeaveAutoAction;
  autoActionDays: number;
}

export interface LeavePolicy {
  [key: string]: unknown;
  _id?: string;
  name: string;
  applicableDesignations: string[];
  visibility: LeaveVisibility;
  holidays: LeaveHoliday[];
  groupWiseHolidaysEnabled?: boolean;
  holidayGroupFieldKey?: string;
  holidayGroups?: LeaveHolidayGroup[];
  leaveTypes: LeaveTypeConfig[];
}

export interface LeaveConfigDocument {
  [key: string]: unknown;
  _id?: string;
  projectId: string;
  policies: LeavePolicy[];
}

export interface LeaveConfigResponse {
  config: LeaveConfigDocument;
  warnings: string[];
}

export interface HolidayUploadSummary {
  totalRows: number;
  added: number;
  skipped: number;
  invalid: number;
  invalidRows: Array<{ row: number; errors: string[] }>;
}

export interface HolidayUploadResponse extends LeaveConfigResponse {
  uploadSummary?: HolidayUploadSummary;
}

export interface LeaveCreditReconcileRequest {
  projectId: string;
  userId?: string;
  policyId?: string;
  leaveTypeId?: string;
  date?: string;
}

export interface LeaveCreditReconcileResponse {
  posted: number;
  existing: number;
  skipped: number;
  failed: number;
}

export interface AddSpecialLeaveTypeTemplateInput {
  template: LeaveSpecialTemplate;
  eligibleGenderValues?: string[];
}

type RawRecord = Record<string, unknown>;

const mockConfigs = new Map<string, LeaveConfigDocument>();
const mockActive = new Set<string>();
const DEFAULT_COMP_OFF_ATTENDANCE_TYPES = [
  "National / Compliance Holiday",
  "Festival / Optional Holiday",
  "Weekly Off",
];

function delay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function record(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

function enumText<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = text(value);
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function validMongoId(value: string | undefined): string | undefined {
  return value && MONGO_ID_PATTERN.test(value) ? value : undefined;
}

function normalizeHexColour(value: unknown, fallback = "#2196F3"): string {
  const raw = text(value).trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)
    ? raw.toUpperCase()
    : fallback;
}

function defaultVisibility(): LeaveVisibility {
  return {
    showLeaveBalance: true,
    showTransactionHistory: true,
    showHolidayCalendar: true,
  };
}

function createDefaultLeaveType(
  name: string,
  shortCode: string,
  totalLeavesPerYear: number,
  overrides: Partial<LeaveTypeConfig> = {},
): LeaveTypeConfig {
  const base: LeaveTypeConfig = {
    _id: makeId("leave_type"),
    name,
    shortCode,
    colour: "#2196F3",
    isCustom: false,
    leaveYear: "Calendar",
    attendanceCycle: {
      startDay: 1,
      endDay: 31,
    },
    entitlementType: "Monthly",
    totalLeavesPerYear,
    creditRule: {
      type: "AttendanceCycleStart",
      fixedDate: 1,
      minimumWorkingDays: 0,
    },
    newJoinerRules: {
      proRateForNewJoiners: true,
      creditOnDoj: false,
      minimumTenureMonths: 0,
    },
    carryForwardRule: {
      isAllowed: false,
      maxDays: 0,
      expiresAtYearEnd: true,
    },
    applicationRules: {
      allowBackdated: true,
      maxBackdatedDays: 3,
      allowFuture: true,
      maxFutureDays: 30,
      maxRequestsPerMonth: 0,
      applicationClosingDate: {
        isEnabled: false,
        day: 27,
      },
      managerApprovalClosingDate: {
        isEnabled: false,
        day: 29,
      },
    },
    reasons: ["Personal", "Medical", "Emergency"],
    attachmentRules: {
      isRequired: false,
      mandatoryAfterDays: 0,
      allowCameraCapture: true,
      allowGalleryUpload: true,
    },
    approvalWorkflow: {
      isApprovalRequired: true,
      levels: [
        {
          level: 1,
          approverRole: "MANAGER_1",
          autoAction: "None",
          autoActionDays: 0,
        },
      ],
    },
  };

  return { ...base, ...overrides };
}

function createSpecialLeaveType(
  template: LeaveSpecialTemplate,
  eligibleGenderValues: string[] = [],
): LeaveTypeConfig {
  if (template === "Maternity") {
    return createDefaultLeaveType("Maternity Leave", "ML", 182, {
      colour: "#E91E63",
      isCustom: false,
      leaveTypeMode: "Maternity",
      entitlementType: "OneTime",
      creditRule: {
        type: "LeaveYearStart",
        fixedDate: 1,
        minimumWorkingDays: 0,
      },
      reasons: ["Maternity", "Medical Extension"],
      genderEligibility: {
        fieldKey: "gender",
        eligibleValues: eligibleGenderValues,
      },
      maternityRules: {
        childLimits: [
          { category: "FirstOrSecondChild", maxDays: 182 },
          { category: "ThirdOrMoreChild", maxDays: 84 },
        ],
        pregnancyIllnessExtension: {
          isAllowed: false,
          durationWeeks: 6,
        },
      },
    });
  }

  if (template === "Paternity") {
    return createDefaultLeaveType("Paternity Leave", "PTL", 2, {
      colour: "#7E57C2",
      isCustom: false,
      leaveTypeMode: "Paternity",
      entitlementType: "OneTime",
      creditRule: {
        type: "LeaveYearStart",
        fixedDate: 1,
        minimumWorkingDays: 0,
      },
      reasons: ["Paternity"],
      genderEligibility: {
        fieldKey: "gender",
        eligibleValues: eligibleGenderValues,
      },
      paternityRules: {
        childLimits: [
          { category: "FirstOrSecondChild", maxDays: 2 },
          { category: "ThirdOrMoreChild", maxDays: 2 },
        ],
      },
    });
  }

  return createDefaultLeaveType("Compensatory Off", "CO", 5, {
    colour: "#FF9800",
    isCustom: false,
    leaveTypeMode: "CompOff",
    entitlementType: "Annual",
    creditRule: {
      type: "LeaveYearStart",
      fixedDate: 1,
      minimumWorkingDays: 0,
    },
    reasons: ["Comp Off"],
    compOffRules: {
      sourceAttendanceTypes: DEFAULT_COMP_OFF_ATTENDANCE_TYPES,
      lookbackDays: 30,
    },
  });
}

function createDefaultConfig(projectId: string): LeaveConfigDocument {
  return {
    _id: makeId("leave_config"),
    projectId,
    policies: [
      {
        _id: makeId("policy"),
        name: "Default Leave Policy",
        applicableDesignations: [],
        visibility: defaultVisibility(),
        holidays: [
          {
            _id: makeId("holiday"),
            date: "2026-01-26",
            name: "Republic Day",
            type: "National",
          },
        ],
        leaveTypes: [
          createDefaultLeaveType("Casual Leave", "CL", 12),
          createDefaultLeaveType("Privilege Leave", "PL", 15, {
            leaveYear: "Financial",
            carryForwardRule: {
              isAllowed: true,
              maxDays: 45,
              expiresAtYearEnd: true,
            },
            reasons: ["Planned Vacation", "Family Event", "Medical"],
          }),
        ],
      },
    ],
  };
}

function normalizeHoliday(value: unknown): LeaveHoliday {
  const raw = record(value);
  return {
    _id: text(raw._id) || text(raw.id) || undefined,
    date: text(raw.date),
    name: text(raw.name),
    type: enumText(raw.type, ["National", "Regional", "Optional"] as const, "National"),
  };
}

function normalizeHolidayGroup(value: unknown): LeaveHolidayGroup {
  const raw = record(value);
  return {
    fieldValue: text(raw.fieldValue),
    holidays: Array.isArray(raw.holidays)
      ? raw.holidays.map(normalizeHoliday)
      : [],
  };
}

function normalizeHolidayGroupingField(value: unknown): HolidayGroupingField {
  const raw = record(value);
  return {
    fieldKey: text(raw.fieldKey),
    label: text(raw.label) || text(raw.fieldKey),
    source: enumText(raw.source, ["STATIC", "UDF"] as const, "STATIC"),
    type: text(raw.type),
    options: Array.isArray(raw.options) ? stringArray(raw.options) : undefined,
  };
}

function normalizeLeaveType(value: unknown): LeaveTypeConfig {
  const raw = record(value);
  const cycle = record(raw.attendanceCycle);
  const creditRule = record(raw.creditRule);
  const newJoinerRules = record(raw.newJoinerRules);
  const carryForwardRule = record(raw.carryForwardRule);
  const applicationRules = record(raw.applicationRules);
  const appClosing = record(applicationRules.applicationClosingDate);
  const managerClosing = record(applicationRules.managerApprovalClosingDate);
  const attachmentRules = record(raw.attachmentRules);
  const approvalWorkflow = record(raw.approvalWorkflow);
  const levels = Array.isArray(approvalWorkflow.levels)
    ? approvalWorkflow.levels
    : [];
  const rawLeaveTypeMode = text(raw.leaveTypeMode);
  const leaveTypeMode = rawLeaveTypeMode
    ? enumText(
        raw.leaveTypeMode,
        ["Periodic", "Maternity", "Paternity", "CompOff"] as const,
        "Periodic",
      )
    : undefined;
  const entitlementType =
    leaveTypeMode === "Maternity" || leaveTypeMode === "Paternity"
      ? "OneTime"
      : enumText(
          raw.entitlementType,
          ["Annual", "Monthly", "OneTime"] as const,
          "Annual",
        );
  const maternityRules = record(raw.maternityRules);
  const maternityChildLimits = Array.isArray(maternityRules.childLimits)
    ? maternityRules.childLimits
    : [];
  const maternityExtension = record(maternityRules.pregnancyIllnessExtension);
  const paternityRules = record(raw.paternityRules);
  const paternityChildLimits = Array.isArray(paternityRules.childLimits)
    ? paternityRules.childLimits
    : [];
  const compOffRules = record(raw.compOffRules);
  const clubbingRules = record(raw.clubbingRules);

  return {
    ...raw,
    _id: text(raw._id) || text(raw.id) || undefined,
    name: text(raw.name) || "Leave Type",
    shortCode: text(raw.shortCode) || "LT",
    colour: normalizeHexColour(raw.colour),
    isCustom: bool(raw.isCustom),
    ...(leaveTypeMode ? { leaveTypeMode } : {}),
    leaveYear: enumText(raw.leaveYear, ["Calendar", "Financial"] as const, "Calendar"),
    attendanceCycle: {
      startDay: num(cycle.startDay, 1),
      endDay: num(cycle.endDay, 31),
    },
    entitlementType,
    totalLeavesPerYear: num(raw.totalLeavesPerYear, 0),
    creditRule: {
      type: enumText(
        creditRule.type,
        ["LeaveYearStart", "AttendanceCycleStart", "FixedDateOfMonth"] as const,
        "LeaveYearStart",
      ),
      fixedDate: num(creditRule.fixedDate, 1),
      minimumWorkingDays: num(creditRule.minimumWorkingDays, 0),
    },
    newJoinerRules: {
      proRateForNewJoiners: bool(newJoinerRules.proRateForNewJoiners),
      creditOnDoj: bool(newJoinerRules.creditOnDoj),
      minimumTenureMonths: num(newJoinerRules.minimumTenureMonths, 0),
    },
    carryForwardRule: {
      isAllowed: bool(carryForwardRule.isAllowed),
      maxDays: num(carryForwardRule.maxDays, 0),
      expiresAtYearEnd: bool(carryForwardRule.expiresAtYearEnd),
    },
    applicationRules: {
      allowBackdated: bool(applicationRules.allowBackdated),
      maxBackdatedDays: num(applicationRules.maxBackdatedDays, 0),
      allowFuture: bool(applicationRules.allowFuture, true),
      maxFutureDays: num(applicationRules.maxFutureDays, 30),
      maxRequestsPerMonth: num(applicationRules.maxRequestsPerMonth, 0),
      applicationClosingDate: {
        isEnabled: bool(appClosing.isEnabled),
        day: num(appClosing.day, 27),
      },
      managerApprovalClosingDate: {
        isEnabled: bool(managerClosing.isEnabled),
        day: num(managerClosing.day, 29),
      },
    },
    reasons: stringArray(raw.reasons),
    attachmentRules: {
      isRequired: bool(attachmentRules.isRequired),
      mandatoryAfterDays: num(attachmentRules.mandatoryAfterDays, 0),
      allowCameraCapture: bool(attachmentRules.allowCameraCapture, true),
      allowGalleryUpload: bool(attachmentRules.allowGalleryUpload, true),
    },
    approvalWorkflow: {
      isApprovalRequired: bool(approvalWorkflow.isApprovalRequired, true),
      levels: levels.map((item, index) => {
        const level = record(item);
        return {
          level: num(level.level, index + 1),
          approverRole: text(level.approverRole) || `MANAGER_${index + 1}`,
          autoAction: enumText(
            level.autoAction,
            ["None", "AutoApprove", "AutoReject"] as const,
            "None",
          ),
          autoActionDays: num(level.autoActionDays, 0),
        };
      }),
    },
    ...(raw.genderEligibility && typeof raw.genderEligibility === "object" && !Array.isArray(raw.genderEligibility)
      ? {
          genderEligibility: {
            ...record(raw.genderEligibility),
            fieldKey: text(record(raw.genderEligibility).fieldKey) || "gender",
            eligibleValues: stringArray(record(raw.genderEligibility).eligibleValues),
          },
        }
      : {}),
    ...(raw.maternityRules && typeof raw.maternityRules === "object" && !Array.isArray(raw.maternityRules)
      ? {
          maternityRules: {
            ...maternityRules,
            childLimits: maternityChildLimits.map((item) => {
              const limit = record(item);
              return {
                ...limit,
                category: text(limit.category),
                maxDays: num(limit.maxDays, 0),
              };
            }),
            ...(maternityRules.pregnancyIllnessExtension &&
            typeof maternityRules.pregnancyIllnessExtension === "object" &&
            !Array.isArray(maternityRules.pregnancyIllnessExtension)
              ? {
                  pregnancyIllnessExtension: {
                    ...maternityExtension,
                    isAllowed: bool(maternityExtension.isAllowed),
                    durationWeeks: num(maternityExtension.durationWeeks, 6),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(raw.paternityRules && typeof raw.paternityRules === "object" && !Array.isArray(raw.paternityRules)
      ? {
          paternityRules: {
            ...paternityRules,
            childLimits: paternityChildLimits.map((item) => {
              const limit = record(item);
              return {
                ...limit,
                category: text(limit.category),
                maxDays: num(limit.maxDays, 0),
              };
            }),
          },
        }
      : {}),
    ...(raw.compOffRules && typeof raw.compOffRules === "object" && !Array.isArray(raw.compOffRules)
      ? {
          compOffRules: {
            ...compOffRules,
            sourceAttendanceTypes: stringArray(compOffRules.sourceAttendanceTypes),
            lookbackDays: num(compOffRules.lookbackDays, 30),
          },
        }
      : {}),
    ...(raw.clubbingRules && typeof raw.clubbingRules === "object" && !Array.isArray(raw.clubbingRules)
      ? {
          clubbingRules: {
            ...clubbingRules,
            allowedLeaveTypeIds: stringArray(clubbingRules.allowedLeaveTypeIds),
          },
        }
      : {}),
  };
}

function normalizePolicy(value: unknown): LeavePolicy {
  const raw = record(value);
  const visibility = record(raw.visibility);
  return {
    ...raw,
    _id: text(raw._id) || text(raw.id) || undefined,
    name: text(raw.name) || "Untitled Leave Policy",
    applicableDesignations: stringArray(raw.applicableDesignations),
    visibility: {
      showLeaveBalance: bool(visibility.showLeaveBalance, true),
      showTransactionHistory: bool(visibility.showTransactionHistory, true),
      showHolidayCalendar: bool(visibility.showHolidayCalendar, true),
    },
    holidays: Array.isArray(raw.holidays)
      ? raw.holidays.map(normalizeHoliday)
      : [],
    groupWiseHolidaysEnabled: bool(raw.groupWiseHolidaysEnabled),
    holidayGroupFieldKey: text(raw.holidayGroupFieldKey) || undefined,
    holidayGroups: Array.isArray(raw.holidayGroups)
      ? raw.holidayGroups.map(normalizeHolidayGroup)
      : [],
    leaveTypes: Array.isArray(raw.leaveTypes)
      ? raw.leaveTypes.map(normalizeLeaveType)
      : [],
  };
}

function normalizeConfig(value: unknown, projectId: string): LeaveConfigDocument {
  const raw = record(value);
  return {
    ...raw,
    _id: text(raw._id) || text(raw.id) || undefined,
    projectId: text(raw.projectId) || projectId,
    policies: Array.isArray(raw.policies) ? raw.policies.map(normalizePolicy) : [],
  };
}

function holidayForSave(holiday: LeaveHoliday): LeaveHoliday {
  return {
    ...holiday,
    _id: validMongoId(holiday._id),
  };
}

function derivedParentalEntitlement(leaveType: LeaveTypeConfig): number | undefined {
  const limits =
    leaveType.leaveTypeMode === "Paternity"
      ? leaveType.paternityRules?.childLimits
      : leaveType.leaveTypeMode === "Maternity"
        ? leaveType.maternityRules?.childLimits
        : undefined;
  if (!limits?.length) return undefined;
  return Math.max(0, ...limits.map((limit) => Number(limit.maxDays) || 0));
}

function leaveTypeForSave(leaveType: LeaveTypeConfig): LeaveTypeConfig {
  const totalLeavesPerYear = derivedParentalEntitlement(leaveType);
  return {
    ...leaveType,
    _id: validMongoId(leaveType._id),
    ...(
      leaveType.leaveTypeMode === "Maternity" || leaveType.leaveTypeMode === "Paternity"
        ? {
            entitlementType: "OneTime" as const,
            ...(totalLeavesPerYear !== undefined ? { totalLeavesPerYear } : {}),
          }
        : {}
    ),
  };
}

function policyForSave(policy: LeavePolicy): LeavePolicy {
  return {
    ...policy,
    _id: validMongoId(policy._id),
    holidays: policy.holidays.map(holidayForSave),
    holidayGroups: (policy.holidayGroups ?? []).map((group) => ({
      ...group,
      holidays: group.holidays.map(holidayForSave),
    })),
    leaveTypes: policy.leaveTypes.map(leaveTypeForSave),
  };
}

function normalizeResponse(value: unknown, projectId: string): LeaveConfigResponse {
  const raw = record(value);
  const configValue = "config" in raw ? raw.config : value;
  return {
    config: normalizeConfig(configValue, projectId),
    warnings: stringArray(raw.warnings),
  };
}

function normalizeUploadSummary(value: unknown): HolidayUploadSummary | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = record(value);
  return {
    totalRows: num(raw.totalRows, 0),
    added: num(raw.added, 0),
    skipped: num(raw.skipped, 0),
    invalid: num(raw.invalid, 0),
    invalidRows: Array.isArray(raw.invalidRows)
      ? raw.invalidRows.map((item) => {
          const row = record(item);
          return {
            row: num(row.row, 0),
            errors: stringArray(row.errors),
          };
        })
      : [],
  };
}

function normalizeUploadResponse(value: unknown, projectId: string): HolidayUploadResponse {
  const raw = record(value);
  return {
    ...normalizeResponse(value, projectId),
    uploadSummary: normalizeUploadSummary(raw.uploadSummary),
  };
}

function normalizeReconcileResponse(value: unknown): LeaveCreditReconcileResponse {
  const raw = record(value);
  return {
    posted: num(raw.posted),
    existing: num(raw.existing),
    skipped: num(raw.skipped),
    failed: num(raw.failed),
  };
}

function withMockWarnings(config: LeaveConfigDocument): LeaveConfigResponse {
  const warnings = config.policies.flatMap((policy) =>
    policy.leaveTypes.flatMap((leaveType) => {
      const result: string[] = [];
      if (leaveType.reasons.length === 0) {
        result.push(`${leaveType.shortCode}: no leave reasons configured.`);
      }
      if (
        leaveType.applicationRules.applicationClosingDate.isEnabled &&
        leaveType.applicationRules.managerApprovalClosingDate.isEnabled &&
        leaveType.applicationRules.applicationClosingDate.day ===
          leaveType.applicationRules.managerApprovalClosingDate.day
      ) {
        result.push(
          `${leaveType.shortCode}: application and manager closing dates are the same.`,
        );
      }
      return result;
    }),
  );
  return { config, warnings };
}

function ensureMockConfig(projectId: string): LeaveConfigDocument {
  const current = mockConfigs.get(projectId);
  if (current) return current;
  const next = createDefaultConfig(projectId);
  mockConfigs.set(projectId, next);
  return next;
}

function validateMockActivation(config: LeaveConfigDocument): void {
  if (config.policies.length === 0) {
    throw new ApiError(400, "LEAVE_CONFIG_INCOMPLETE", undefined, "Add at least one leave policy.");
  }
  config.policies.forEach((policy) => {
    if (!policy.name.trim()) {
      throw new ApiError(400, "LEAVE_CONFIG_INCOMPLETE", undefined, "Policy name is required.");
    }
    if (policy.applicableDesignations.length === 0) {
      throw new ApiError(
        400,
        "LEAVE_CONFIG_INCOMPLETE",
        undefined,
        `Assign at least one designation to ${policy.name}.`,
      );
    }
    if (policy.leaveTypes.length === 0) {
      throw new ApiError(
        400,
        "LEAVE_CONFIG_INCOMPLETE",
        undefined,
        `Add at least one leave type to ${policy.name}.`,
      );
    }
  });
}

export const leaveConfigService = {
  createCustomLeaveType(input: {
    name: string;
    shortCode: string;
    colour?: string;
    totalLeavesPerYear: number;
    entitlementType: LeaveEntitlementType;
    carryForwardAllowed?: boolean;
    attachmentRequired?: boolean;
  }): LeaveTypeConfig {
    return createDefaultLeaveType(
      input.name.trim() || "Custom Leave",
      input.shortCode.trim().toUpperCase() || "CLV",
      input.totalLeavesPerYear,
      {
        colour: normalizeHexColour(input.colour),
        isCustom: true,
        entitlementType: input.entitlementType,
        carryForwardRule: {
          isAllowed: Boolean(input.carryForwardAllowed),
          maxDays: 0,
          expiresAtYearEnd: true,
        },
        attachmentRules: {
          isRequired: Boolean(input.attachmentRequired),
          mandatoryAfterDays: 0,
          allowCameraCapture: true,
          allowGalleryUpload: true,
        },
      },
    );
  },

  async initialize(projectId: string): Promise<LeaveConfigResponse> {
    if (USE_MOCK_API) {
      await delay();
      return withMockWarnings(ensureMockConfig(projectId));
    }
    const raw = await apiClient.post<unknown>(`${BASE}/${projectId}/initialize`);
    return normalizeResponse(raw, projectId);
  },

  async get(projectId: string): Promise<LeaveConfigResponse> {
    if (USE_MOCK_API) {
      await delay();
      return withMockWarnings(ensureMockConfig(projectId));
    }
    const raw = await apiClient.get<unknown>(`${BASE}/${projectId}`);
    return normalizeResponse(raw, projectId);
  },

  async listHolidayGroupingFields(projectId: string): Promise<HolidayGroupingField[]> {
    if (USE_MOCK_API) {
      await delay();
      return [
        {
          fieldKey: "state",
          label: "State",
          source: "STATIC",
          type: "select",
          options: ["Karnataka", "Maharashtra", "Delhi"],
        },
        {
          fieldKey: "zone",
          label: "Zone",
          source: "UDF",
          type: "text",
        },
      ];
    }
    const raw = await apiClient.get<unknown>(`${BASE}/${projectId}/holiday-grouping-fields`);
    return Array.isArray(raw) ? raw.map(normalizeHolidayGroupingField) : [];
  },

  async save(projectId: string, policies: LeavePolicy[]): Promise<LeaveConfigResponse> {
    const payloadPolicies = policies.map(policyForSave);
    if (USE_MOCK_API) {
      await delay();
      const current = ensureMockConfig(projectId);
      const next = normalizeConfig({ ...current, policies: payloadPolicies }, projectId);
      mockConfigs.set(projectId, next);
      return withMockWarnings(next);
    }
    const raw = await apiClient.put<unknown>(`${BASE}/${projectId}`, {
      policies: payloadPolicies,
    });
    return normalizeResponse(raw, projectId);
  },

  async addPolicy(projectId: string, name: string): Promise<LeaveConfigResponse> {
    if (USE_MOCK_API) {
      await delay();
      const current = ensureMockConfig(projectId);
      const next = {
        ...current,
        policies: [
          ...current.policies,
          {
            _id: makeId("policy"),
            name: name.trim() || "New Leave Policy",
            applicableDesignations: [],
            visibility: defaultVisibility(),
            holidays: [],
            leaveTypes: [createDefaultLeaveType("Casual Leave", "CL", 12)],
          },
        ],
      };
      mockConfigs.set(projectId, next);
      return withMockWarnings(next);
    }
    const raw = await apiClient.post<unknown>(`${BASE}/${projectId}/policies`, { name });
    return normalizeResponse(raw, projectId);
  },

  async clonePolicy(projectId: string, policyId: string): Promise<LeaveConfigResponse> {
    if (USE_MOCK_API) {
      await delay();
      const current = ensureMockConfig(projectId);
      const policy = current.policies.find((item) => item._id === policyId);
      if (!policy) {
        throw new ApiError(404, "NOT_FOUND", undefined, "Policy not found.");
      }
      const clone: LeavePolicy = {
        ...JSON.parse(JSON.stringify(policy)),
        _id: makeId("policy"),
        name: `${policy.name} (Copy)`,
        applicableDesignations: [],
        leaveTypes: policy.leaveTypes.map((leaveType) => ({
          ...leaveType,
          _id: makeId("leave_type"),
        })),
      };
      const next = { ...current, policies: [...current.policies, clone] };
      mockConfigs.set(projectId, next);
      return withMockWarnings(next);
    }
    const raw = await apiClient.post<unknown>(
      `${BASE}/${projectId}/policies/${policyId}/clone`,
    );
    return normalizeResponse(raw, projectId);
  },

  async deletePolicy(projectId: string, policyId: string): Promise<LeaveConfigResponse> {
    if (USE_MOCK_API) {
      await delay();
      const current = ensureMockConfig(projectId);
      if (current.policies.length <= 1) {
        throw new ApiError(400, "LAST_POLICY", undefined, "Need at least one policy.");
      }
      const next = {
        ...current,
        policies: current.policies.filter((item) => item._id !== policyId),
      };
      mockConfigs.set(projectId, next);
      return withMockWarnings(next);
    }
    const raw = await apiClient.delete<unknown>(
      `${BASE}/${projectId}/policies/${policyId}`,
    );
    return normalizeResponse(raw, projectId);
  },

  async addSpecialLeaveTypeTemplate(
    projectId: string,
    policyId: string,
    input: AddSpecialLeaveTypeTemplateInput,
  ): Promise<LeaveConfigResponse> {
    if (USE_MOCK_API) {
      await delay();
      const current = ensureMockConfig(projectId);
      const next = {
        ...current,
        policies: current.policies.map((policy) =>
          policy._id === policyId
            ? {
                ...policy,
                leaveTypes: [
                  ...policy.leaveTypes,
                  createSpecialLeaveType(input.template, input.eligibleGenderValues ?? []),
                ],
              }
            : policy,
        ),
      };
      mockConfigs.set(projectId, next);
      return withMockWarnings(next);
    }
    const raw = await apiClient.post<unknown>(
      `${BASE}/${projectId}/policies/${policyId}/leave-types/templates`,
      input.template === "CompOff"
        ? { template: input.template }
        : {
            template: input.template,
            eligibleGenderValues: input.eligibleGenderValues ?? [],
          },
    );
    return normalizeResponse(raw, projectId);
  },

  async uploadHolidays(
    projectId: string,
    policyId: string,
    file: File,
  ): Promise<HolidayUploadResponse> {
    if (USE_MOCK_API) {
      await delay();
      const current = ensureMockConfig(projectId);
      const next = {
        ...current,
        policies: current.policies.map((policy) =>
          policy._id === policyId
            ? policy.groupWiseHolidaysEnabled
              ? {
                  ...policy,
                  holidayGroups: [
                    ...(policy.holidayGroups ?? []),
                    {
                      fieldValue: "Karnataka",
                      holidays: [
                        {
                          _id: makeId("holiday"),
                          date: "2026-08-15",
                          name: file.name.replace(/\.[^.]+$/, "") || "Uploaded Holiday",
                          type: "National" as LeaveHolidayType,
                        },
                      ],
                    },
                  ],
                }
              : {
                  ...policy,
                  holidays: [
                    ...policy.holidays,
                    {
                      _id: makeId("holiday"),
                      date: "2026-08-15",
                      name: file.name.replace(/\.[^.]+$/, "") || "Uploaded Holiday",
                      type: "National" as LeaveHolidayType,
                    },
                  ],
                }
            : policy,
        ),
      };
      mockConfigs.set(projectId, next);
      return {
        ...withMockWarnings(next),
        uploadSummary: {
          totalRows: 1,
          added: 1,
          skipped: 0,
          invalid: 0,
          invalidRows: [],
        },
      };
    }
    const formData = new FormData();
    formData.append("file", file);
    const raw = await apiClient.postFormData<unknown>(
      `${BASE}/${projectId}/policies/${policyId}/holidays/upload`,
      formData,
    );
    return normalizeUploadResponse(raw, projectId);
  },

  async downloadHolidayTemplate(projectId: string, policyId: string): Promise<Blob> {
    if (USE_MOCK_API) {
      await delay();
      return new Blob(["Group,Date,Name,Type\nKarnataka,2026-08-15,Independence Day,National\n"], {
        type: "text/csv;charset=utf-8;",
      });
    }
    return apiClient.getBlob(
      `${BASE}/${projectId}/policies/${policyId}/holidays/template`,
    );
  },

  async reconcileCredits(
    input: LeaveCreditReconcileRequest,
  ): Promise<LeaveCreditReconcileResponse> {
    if (USE_MOCK_API) {
      await delay();
      return {
        posted: 1,
        existing: 0,
        skipped: 2,
        failed: 0,
      };
    }
    const raw = await apiClient.post<unknown>("/api/v1/leave-balances/credit-reconcile", input);
    return normalizeReconcileResponse(raw);
  },

  async activate(projectId: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay();
      validateMockActivation(ensureMockConfig(projectId));
      mockActive.add(projectId);
      return;
    }
    await apiClient.put(`${BASE}/activate/${projectId}`, {});
  },

  async deactivate(projectId: string): Promise<void> {
    if (USE_MOCK_API) {
      await delay();
      mockActive.delete(projectId);
      return;
    }
    await apiClient.put(`${BASE}/deactivate/${projectId}`, {});
  },
};
