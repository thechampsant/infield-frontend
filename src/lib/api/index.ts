import type { AdminApi } from "./admin";
import { mockAdminApi } from "@/lib/mock/adminApi";

/**
 * Single seam for future API integration.
 * Replace `mockAdminApi` with an implementation that calls your real backend / external system.
 */
export function getAdminApi(): AdminApi {
  return mockAdminApi;
}


