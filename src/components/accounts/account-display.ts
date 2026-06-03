/** Two-letter initials used for account avatars (e.g. "Bosch" -> "BO"). */
export function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "AC";
  return trimmed.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "var(--if2-blue)",
  "var(--if2-teal)",
  "#555",
  "var(--if2-amber)",
  "#7c3aed",
];

/** Deterministic avatar background colour derived from the account name. */
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
