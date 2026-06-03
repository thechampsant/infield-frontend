import type { ClientBrand } from "@/lib/api/types";

/**
 * Fetches unread notification count for inbox badge + topbar dot.
 * TODO: GET /api/v1/notifications/unread-count
 */
export async function fetchNotificationCount(): Promise<{ count: number }> {
  // Design-time mock — replace with real API call when backend is ready.
  return { count: 4 };
}

/**
 * Fetches client branding for the top bar white-label slot.
 * Returns null when no logo is configured (container stays hidden).
 * TODO: GET /api/v1/accounts/:accountId/brand
 */
export async function fetchClientBrand(
  _accountId?: string,
): Promise<ClientBrand | null> {
  // Default: no client logo configured.
  // To preview the slot during development, return:
  // { logoUrl: "/assets/clients/bosch-logo.png", name: "Bosch" }
  return null;
}
