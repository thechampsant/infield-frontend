import type { AdminApi } from "./admin";
import { mockAdminApi } from "@/lib/mock/admin-api";
import { realAdminApi } from "./real-admin-api";

/**
 * Toggle between mock and real API implementation.
 * Set NEXT_PUBLIC_USE_MOCK_API=true in .env.local to use mock data.
 */
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

/**
 * Single seam for API implementation.
 * Toggle via NEXT_PUBLIC_USE_MOCK_API environment variable.
 */
export function getAdminApi(): AdminApi {
  return USE_MOCK_API ? mockAdminApi : realAdminApi;
}

// Re-export auth service for convenience
export { authService } from "./auth-service";
export type { AuthService } from "./auth-service";

// Re-export types
export type { AdminApi } from "./admin";
export * from "./types";

// Re-export API client utilities
export { ApiError } from "./api-client";
export type { ApiErrorResponse } from "./api-client";
