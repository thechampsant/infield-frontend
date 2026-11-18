import type { BackendUser } from "@/lib/api/types";

export function canAccessOverview(
  user: Pick<BackendUser, "access"> | null | undefined,
): boolean {
  return user?.access === "WEB" || user?.access === "BOTH";
}
