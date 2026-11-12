/**
 * Connect Room utilities and service exports.
 */

export {
  ROOMS_BASE,
  ROOMS_BASE_CONFIG,
  setRoomContext,
  getRoomContext,
  clearRoomContext,
  connectRoomService,
  formatRoomDate,
  getRoomInitials,
  type CreateRoomInput,
  type EligibleMember,
  type ApiRoom,
  type ApiRoomMember,
  type ApiMessage,
  type RoomContextConfig,
} from "@/lib/api/connect-room-service";

/**
 * Returns formatted count and noun with pluralization (e.g. "1 member", "5 members").
 */
export function plural(count: number, singular: string, pluralForm?: string): string {
  const form = count === 1 ? singular : pluralForm || `${singular}s`;
  return `${count} ${form}`;
}

/**
 * Returns initials from name (e.g. "Mumbai South" -> "MS").
 */
export function initials(name: string): string {
  if (!name || !name.trim()) return "RM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return ((parts[0][0] || "") + (parts[1][0] || "")).toUpperCase();
}

/** Shared palette for member initials and room member avatars. */
export const INITIALS_COLORS = [
  "bg-blue-600",
  "bg-orange-700",
  "bg-emerald-600",
  "bg-indigo-600",
  "bg-cyan-700",
  "bg-rose-600",
  "bg-amber-600",
  "bg-violet-600",
  "bg-teal-600",
  "bg-slate-700",
] as const;

/** Assigns a stable, varied palette color from a user's identifier. */
export function getInitialsColor(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0;
  }
  return INITIALS_COLORS[hash % INITIALS_COLORS.length];
}

