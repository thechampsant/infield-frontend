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

