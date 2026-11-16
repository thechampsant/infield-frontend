import { apiClient } from "./api-client";

export const NOTIFICATION_TYPES = ["IN_APP", "PUSH", "POP_UP"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export const TYPE_LABELS: Record<NotificationType, string> = {
  IN_APP: "In-App",
  PUSH: "Push",
  POP_UP: "Pop-Up",
};
export interface PopupDefaults {
  actionLabel: string;
  allowDismissByTapOutside: boolean;
  timezone: string;
  projectId: string;
}
export interface CampaignInput {
  title: string;
  message?: string;
  types: NotificationType[];
  designationIds: string[];
  schedule: "NOW" | "LATER";
  startsAt?: string;
  durationDays: number;
  frequencyPerDay: number;
  actionLabel?: string;
  attachmentId?: string;
}
export interface Campaign extends Omit<
  CampaignInput,
  "schedule" | "attachmentId"
> {
  id: string;
  projectId: string;
  startsAt: string;
  endsAt: string | null;
  attachmentId: string | null;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  isScheduled: boolean;
  isExpired: boolean;
  designations: { id: string; name: string; code: string }[];
  allowDismissByTapOutside?: boolean;
}
export interface CampaignPage {
  items: Campaign[];
  nextCursor: string | null;
}
export interface CampaignFilters {
  from?: string;
  to?: string;
  cursor?: string;
}
const BASE = "/api/v1/notification-engine";
function query(projectId: string, filters: CampaignFilters = {}) {
  const params = new URLSearchParams({ projectId });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}
/** Build exactly the fields accepted by CreateNotificationCampaignDto. */
export function notificationCampaignInput(
  form: CampaignInput,
  localStart: string,
): CampaignInput {
  const input: CampaignInput = {
    title: form.title.trim(),
    message: form.message?.trim(),
    types: [...form.types],
    designationIds: [...form.designationIds],
    schedule: form.schedule,
    durationDays: form.durationDays,
    frequencyPerDay: form.frequencyPerDay,
  };
  if (form.schedule === "LATER")
    input.startsAt = notificationStartIso(localStart);
  if (form.types.includes("POP_UP") && form.actionLabel?.trim())
    input.actionLabel = form.actionLabel.trim();
  return input;
}

/** Status transitions intentionally omit designation labels on the backend. */
export function mergeCampaignTransition(
  current: Campaign,
  updated: Campaign,
): Campaign {
  return {
    ...updated,
    designations: updated.designations.length
      ? updated.designations
      : current.designations,
  };
}

export function validateCampaign(
  input: CampaignInput,
  now = Date.now(),
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title.trim() || input.title.trim().length > 200)
    errors.title = "Enter a title of 1–200 characters.";
  if ((input.message?.length ?? 0) > 4000)
    errors.message = "Message must be at most 4,000 characters.";
  if (!input.types.length)
    errors.types = "Select at least one notification type.";
  if (!input.designationIds.length)
    errors.designationIds = "Select at least one designation.";
  if (
    input.schedule === "LATER" &&
    (!input.startsAt ||
      !Number.isFinite(Date.parse(input.startsAt)) ||
      Date.parse(input.startsAt) <= now)
  )
    errors.startsAt = "Choose a future date and time.";
  if (!Number.isInteger(input.durationDays) || input.durationDays < 0)
    errors.durationDays = "Enter a whole number of days, 0 or greater.";
  if (
    !Number.isInteger(input.frequencyPerDay) ||
    input.frequencyPerDay < 1 ||
    input.frequencyPerDay > 10
  )
    errors.frequencyPerDay = "Enter a whole number from 1 to 10.";
  if (
    input.types.includes("POP_UP") &&
    input.actionLabel !== undefined &&
    (!input.actionLabel.trim() || input.actionLabel.trim().length > 50)
  )
    errors.actionLabel =
      "Enter a button label of 1–50 characters, or use the default.";
  return errors;
}
export function validateNotificationImage(
  file: Pick<File, "type" | "size">,
): string | null {
  if (!["image/png", "image/jpeg"].includes(file.type))
    return "Choose a PNG or JPG image.";
  if (file.size > 5 * 1024 * 1024) return "Image must be 5 MB or smaller.";
  if (!file.size) return "Image is empty. Choose another file.";
  return null;
}
export function validNotificationDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function validateNotificationFilters(
  filters: CampaignFilters,
): string | null {
  if (
    (filters.from && !validNotificationDate(filters.from)) ||
    (filters.to && !validNotificationDate(filters.to))
  )
    return "Enter valid From and To dates.";
  return filters.from && filters.to && filters.from > filters.to
    ? "From date must be on or before To date."
    : null;
}

/** The project uses IST even when the administrator's computer uses another timezone. */
export function notificationStartIso(local: string): string | undefined {
  // datetime-local may include seconds; reject calendar rollovers rather than silently rescheduling.
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/.exec(local);
  if (!match || !validNotificationDate(match[1])) return undefined;
  const normalized = `${match[1]}T${match[2]}:${match[3] ?? "00"}`;
  const date = new Date(`${normalized}+05:30`);
  if (!Number.isFinite(date.getTime())) return undefined;
  const roundTrip = new Date(date.getTime() + 19_800_000)
    .toISOString()
    .slice(0, 19);
  return roundTrip === normalized ? date.toISOString() : undefined;
}
export const notificationEngineService = {
  getDefaults: (projectId: string) =>
    apiClient.get<PopupDefaults>(`${BASE}/config?${query(projectId)}`),
  saveDefaults: (
    projectId: string,
    input: Pick<PopupDefaults, "actionLabel" | "allowDismissByTapOutside">,
  ) =>
    apiClient.patch<PopupDefaults>(`${BASE}/config?${query(projectId)}`, input),
  list: (projectId: string, filters: CampaignFilters = {}) =>
    apiClient.get<CampaignPage>(
      `${BASE}/campaigns?${query(projectId, filters)}`,
    ),
  create: (projectId: string, input: CampaignInput) =>
    apiClient.post<Campaign>(`${BASE}/campaigns?${query(projectId)}`, input),
  upload: (projectId: string, file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiClient.postFormData<{ id: string }>(
      `${BASE}/attachments?${query(projectId)}`,
      body,
    );
  },
  transition: (
    projectId: string,
    campaign: Campaign,
    action: "pause" | "resume",
  ) =>
    apiClient.patch<Campaign>(
      `${BASE}/campaigns/${encodeURIComponent(campaign.id)}/${action}?${query(projectId)}`,
      { version: campaign.version },
    ),
  remove: (projectId: string, id: string) =>
    apiClient.delete(
      `${BASE}/campaigns/${encodeURIComponent(id)}?${query(projectId)}`,
    ),
};
