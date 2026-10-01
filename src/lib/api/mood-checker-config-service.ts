import { apiClient } from "./api-client";

const BASE = "/api/v1/mood-checker/configurations";

export const MOOD_CHECKER_MODULE_KEY = "mood-checker";

export type MoodFrequencyType = "DAILY" | "SELECT_DAYS" | "SELECT_DATES" | "EVERY_N_DAYS";
export type MoodWeekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type MoodEnforcementMode = "SOFT" | "HARD";
export type MoodTriggerPoint = "ON_APP_OPEN" | "AFTER_CHECK_IN" | "SCHEDULED_TIME";

export const MOOD_WEEKDAYS: { value: MoodWeekday; label: string }[] = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

export const MOOD_MIN_OPTIONS = 2;
export const MOOD_MAX_OPTIONS = 12;
export const MOOD_MAX_EVERY_N_DAYS = 30;

export interface MoodOption {
  /** Server-generated; absent for options added in the editor but not yet saved. */
  key?: string;
  label: string;
  emoji: string;
}

export interface MoodConfiguration {
  id: string;
  projectId: string;
  name: string;
  applicableDesignations: string[];
  question: string;
  options: MoodOption[];
  comment: { enabled: boolean; mandatory: boolean; placeholder: string };
  frequency: { type: MoodFrequencyType; days: MoodWeekday[]; dates: number[]; everyNDays: number };
  enforcement: { mode: MoodEnforcementMode; trigger: MoodTriggerPoint; scheduledTime: string };
  createdAt?: string;
  updatedAt?: string;
}

/** Editor form state. `id` is undefined for a config that has not been saved yet. */
export type MoodConfigForm = Omit<MoodConfiguration, "id" | "projectId" | "createdAt" | "updatedAt"> & {
  id?: string;
};

export type SaveMoodConfigurationInput = Omit<MoodConfigForm, "id">;

export const MOOD_DEFAULT_SCHEDULED_TIME = "09:00";

export function defaultMoodConfigForm(): MoodConfigForm {
  return {
    name: "",
    applicableDesignations: [],
    question: "How are you feeling today?",
    options: [
      { label: "Happy", emoji: "😊" },
      { label: "Neutral", emoji: "😐" },
      { label: "Not Great", emoji: "😟" },
    ],
    comment: { enabled: true, mandatory: false, placeholder: "Share more about how you feel… (optional)" },
    frequency: { type: "DAILY", days: ["MON", "TUE", "WED", "THU", "FRI"], dates: [], everyNDays: 1 },
    enforcement: { mode: "SOFT", trigger: "ON_APP_OPEN", scheduledTime: MOOD_DEFAULT_SCHEDULED_TIME },
  };
}

type RawRecord = Record<string, unknown>;

function record(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

const FREQUENCY_TYPES = ["DAILY", "SELECT_DAYS", "SELECT_DATES", "EVERY_N_DAYS"] as const;
const WEEKDAYS = MOOD_WEEKDAYS.map((day) => day.value);
const MODES = ["SOFT", "HARD"] as const;
const TRIGGERS = ["ON_APP_OPEN", "AFTER_CHECK_IN", "SCHEDULED_TIME"] as const;

export function normalizeMoodConfiguration(value: unknown): MoodConfiguration {
  const raw = record(value);
  const comment = record(raw.comment);
  const frequency = record(raw.frequency);
  const enforcement = record(raw.enforcement);
  const defaults = defaultMoodConfigForm();

  const options = (Array.isArray(raw.options) ? raw.options : [])
    .map(record)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((option) => ({ key: text(option.key) || undefined, label: text(option.label), emoji: text(option.emoji) }));

  return {
    id: text(raw._id) || text(raw.id),
    projectId: text(raw.projectId),
    name: text(raw.name),
    applicableDesignations: (Array.isArray(raw.applicableDesignations) ? raw.applicableDesignations : []).map(String),
    question: text(raw.question, defaults.question),
    options,
    comment: {
      enabled: bool(comment.enabled, true),
      mandatory: bool(comment.mandatory, false),
      placeholder: text(comment.placeholder, defaults.comment.placeholder),
    },
    frequency: {
      type: oneOf(frequency.type, FREQUENCY_TYPES, "DAILY"),
      days: (Array.isArray(frequency.days) ? frequency.days : []).filter((day): day is MoodWeekday =>
        WEEKDAYS.includes(day as MoodWeekday),
      ),
      dates: (Array.isArray(frequency.dates) ? frequency.dates : []).map(Number).filter(Number.isFinite),
      everyNDays: Number(frequency.everyNDays) || 1,
    },
    enforcement: {
      mode: oneOf(enforcement.mode, MODES, "SOFT"),
      trigger: oneOf(enforcement.trigger, TRIGGERS, "ON_APP_OPEN"),
      scheduledTime: text(enforcement.scheduledTime) || MOOD_DEFAULT_SCHEDULED_TIME,
    },
    createdAt: text(raw.createdAt) || undefined,
    updatedAt: text(raw.updatedAt) || undefined,
  };
}

export function moodConfigToForm(config: MoodConfiguration): MoodConfigForm {
  return {
    id: config.id,
    name: config.name,
    applicableDesignations: [...config.applicableDesignations],
    question: config.question,
    options: config.options.map((option) => ({ ...option })),
    comment: { ...config.comment },
    frequency: { ...config.frequency, days: [...config.frequency.days], dates: [...config.frequency.dates] },
    enforcement: { ...config.enforcement },
  };
}

/** Builds the API body. The time is only sent for the Scheduled Time trigger. */
export function moodFormToInput(form: MoodConfigForm): SaveMoodConfigurationInput {
  return {
    name: form.name.trim(),
    applicableDesignations: form.applicableDesignations,
    question: form.question.trim(),
    options: form.options.map((option) => ({
      ...(option.key ? { key: option.key } : {}),
      label: option.label.trim(),
      emoji: option.emoji,
    })),
    comment: {
      enabled: form.comment.enabled,
      mandatory: form.comment.enabled && form.comment.mandatory,
      placeholder: form.comment.placeholder.trim(),
    },
    frequency: {
      type: form.frequency.type,
      days: form.frequency.days,
      dates: [...form.frequency.dates].sort((a, b) => a - b),
      everyNDays: Number(form.frequency.everyNDays),
    },
    enforcement: {
      mode: form.enforcement.mode,
      trigger: form.enforcement.trigger,
      ...(form.enforcement.trigger === "SCHEDULED_TIME" ? { scheduledTime: form.enforcement.scheduledTime } : {}),
    } as MoodConfiguration["enforcement"],
  };
}

/** Client-side checks that mirror the backend rules, so errors show before saving. */
export function validateMoodConfigForm(form: MoodConfigForm): string[] {
  const errors: string[] = [];
  if (!form.name.trim()) errors.push("Configuration name is required.");
  if (form.name.trim().length > 160) errors.push("Configuration name must be 160 characters or fewer.");
  if (!form.question.trim()) errors.push("Check-in question is required.");
  if (form.options.length < MOOD_MIN_OPTIONS) errors.push(`Minimum ${MOOD_MIN_OPTIONS} mood options are required.`);
  const labels = form.options.map((option) => option.label.trim().toLowerCase());
  if (new Set(labels).size !== labels.length) errors.push("Mood option labels must be unique.");
  if (form.frequency.type === "SELECT_DAYS" && form.frequency.days.length === 0) {
    errors.push("Select at least one day.");
  }
  if (form.frequency.type === "SELECT_DATES" && form.frequency.dates.length === 0) {
    errors.push("Select at least one date.");
  }
  const n = Number(form.frequency.everyNDays);
  if (form.frequency.type === "EVERY_N_DAYS" && (!Number.isInteger(n) || n < 1 || n > MOOD_MAX_EVERY_N_DAYS)) {
    errors.push(`"Every N Days" must be a whole number between 1 and ${MOOD_MAX_EVERY_N_DAYS}.`);
  }
  if (form.enforcement.trigger === "SCHEDULED_TIME" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.enforcement.scheduledTime)) {
    errors.push("Trigger time is required for the Scheduled Time trigger.");
  }
  return errors;
}

function projectQuery(projectId: string): string {
  return `projectId=${encodeURIComponent(projectId)}`;
}

export const moodCheckerConfigService = {
  async list(projectId: string): Promise<MoodConfiguration[]> {
    const result = await apiClient.get<unknown[]>(`${BASE}?${projectQuery(projectId)}`);
    return Array.isArray(result) ? result.map(normalizeMoodConfiguration) : [];
  },

  async get(id: string, projectId: string): Promise<MoodConfiguration> {
    const result = await apiClient.get<unknown>(`${BASE}/${encodeURIComponent(id)}?${projectQuery(projectId)}`);
    return normalizeMoodConfiguration(result);
  },

  async create(input: SaveMoodConfigurationInput & { projectId: string }): Promise<MoodConfiguration> {
    const result = await apiClient.post<unknown>(BASE, input);
    return normalizeMoodConfiguration(result);
  },

  async update(id: string, projectId: string, input: SaveMoodConfigurationInput): Promise<MoodConfiguration> {
    const result = await apiClient.patch<unknown>(`${BASE}/${encodeURIComponent(id)}?${projectQuery(projectId)}`, input);
    return normalizeMoodConfiguration(result);
  },

  async clone(id: string, projectId: string): Promise<MoodConfiguration> {
    const result = await apiClient.post<unknown>(`${BASE}/${encodeURIComponent(id)}/clone?${projectQuery(projectId)}`);
    return normalizeMoodConfiguration(result);
  },

  async remove(id: string, projectId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${encodeURIComponent(id)}?${projectQuery(projectId)}`);
  },
};
