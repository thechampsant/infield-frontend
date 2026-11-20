import { WallPost } from "./types";

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


export interface UnseenUserRow {
  id: string;
  name: string;
  role?: string;
  desig?: string;
  location?: string;
  store?: string;
  phone?: string;
  email?: string;
  hasDemoPhone?: boolean;
}

/**
 * Format duration in seconds to "m:ss" format.
 * e.g. 134 => "2:14", 60 => "1:00", 9 => "0:09"
 */
export function formatDurationSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate the percentage of users who have seen a post (0 to 100).
 */
export function calculateReachPercentage(seenCount: number, totalUsers: number): number {
  if (!totalUsers || totalUsers <= 0) return 0;
  const pct = Math.round((seenCount / totalUsers) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Export unseen users to CSV, downloading to the admin's machine.
 * Follows the API Guide structure: Employee Code, Full Name, Phone Number, Email, Designation, Store.
 */
export function exportUnseenUsersToCsv(
  post: WallPost,
  unseenUsers: UnseenUserRow[],
): void {
  const headers = [
    "Employee Code",
    "Full Name",
    "Phone Number",
    "Email",
    "Designation",
    "Store / Location",
  ];

  const rows = unseenUsers.map((u) => [
    `"${(u.id || "").replace(/"/g, '""')}"`,
    `"${(u.name || "").replace(/"/g, '""')}"`,
    `"${(u.phone || "").replace(/"/g, '""')}"`,
    `"${(u.email || "").replace(/"/g, '""')}"`,
    `"${(u.desig || u.role || "").replace(/"/g, '""')}"`,
    `"${(u.store || u.location || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const suffix = post.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "export";
  link.setAttribute("href", url);
  link.setAttribute("download", `unseen_users_post_${suffix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
