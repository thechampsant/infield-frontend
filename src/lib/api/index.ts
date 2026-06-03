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

// Re-export designation + role services (INF2-1535)
export { designationService } from "./designation-service";
export type {
  Designation,
  DesignationDto,
  UpdateDesignationDto,
} from "./designation-service";
export { roleService, toRoleOptions } from "./role-service";
export type {
  BackendRole,
  CreateRolePayload,
  ProjectRolesSummary,
  RoleOption,
} from "./role-service";
export { udfConfigService, UDF_ENTITY_TYPES } from "./udf-config-service";
export type {
  UdfApiSelectConfig,
  UdfCascadingSelectConfig,
  UdfConfigScope,
  UdfDataSourceDefinition,
  UdfEntityType,
  UdfFieldConfig,
  UdfFieldType,
  UdfFieldTypeOption,
  UdfSchemaDocument,
  UdfSchemaField,
  UdfSourcePreviewItem,
  UdfSourcePreviewQuery,
  UdfVisibilityRule,
} from "./udf-config-service";
export { attendanceFormSchemaService } from "./attendance-form-schema-service";
export type {
  AttendanceFormSchemaDocument,
  AttendanceFormType,
  SaveAttendanceFormSchemaInput,
} from "./attendance-form-schema-service";

// Re-export types
export type { AdminApi } from "./admin";
export * from "./types";

// Re-export API client utilities
export { ApiError } from "./api-client";
export type { ApiErrorResponse } from "./api-client";
export { formatApiError } from "./get-api-error-message";
