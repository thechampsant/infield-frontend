import type { AdminApi } from "./admin";
import { mockAdminApi } from "@/lib/mock/admin-api";
import { realAdminApi } from "./real-admin-api";
import { roleDesignationApi } from "./role-designation-api";

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

/**
 * Get Role and Designation API.
 * Always uses real API as there's no mock implementation.
 */
export function getRoleDesignationApi() {
  return roleDesignationApi;
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
  UdfDatasourceFilterConfig,
  UdfDatasourceFilterMode,
  UdfDatasourceFilterParamSchema,
  UdfDatasourceFilterModesResponse,
  UdfEntityType,
  UdfFieldConfig,
  UdfFieldType,
  UdfFieldTypeOption,
  UdfFormulaAggregateOperation,
  UdfFormulaConfig,
  UdfFormulaExpressionToken,
  UdfFormulaOperator,
  UdfOptionItem,
  UdfOptionsRequest,
  UdfOptionsResponse,
  UdfRepeatableGroupConfig,
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
export { claimsConfigService } from "./claims-config-service";
export type {
  ClaimApprovalLevel,
  ClaimApprovalMode,
  ClaimApprovalWorkflow,
  ClaimCapType,
  ClaimConditionalCap,
  ClaimConditionalCapCondition,
  ClaimPerKmRateConfig,
  ClaimSchemaDocument,
  ClaimTypeDefinition,
  ClaimsBackdateConfig,
  ClaimsConfigDocument,
  ClaimsTemplateDocument,
  SaveClaimSchemaInput,
  SaveClaimTypeInput,
  SaveClaimsConfigInput,
} from "./claims-config-service";
export { visitConfigService, normalizeVisitConfig } from "./visit-config-service";
export type {
  JourneyTabDocument,
  LandingFieldSet,
  StoreDetail,
  StoreMappingMode,
  StoresForTypeResponse,
  UpsertVisitConfigInput,
  VisitConfigDocument,
  VisitConfigStatus,
  VisitSessionConfig,
  VisitType,
} from "./visit-config-service";
export {
  SALES_INBOX_MODULE_ID,
  SALES_MODULE_KEY,
  SALES_REQUEST_TYPE,
  normalizeSalesConfiguration,
  salesConfigModuleKey,
  salesConfigService,
} from "./sales-config-service";
export type {
  SalesApprovalLevel,
  SalesApprovalLevelRole,
  SalesApprovalWorkflow,
  SalesConfiguration,
  SalesFormField,
  SalesProductOption,
  SalesReportParams,
  SalesRuntimeEntry,
  SalesRuntimeForm,
  SalesSubmission,
  SalesSubmissionStatus,
  SalesTypeEntry,
  SalesUdfSchemaDocument,
  SaveSalesConfigurationInput,
  SubmitSalesInput,
} from "./sales-config-service";
export {
  STOCK_MODULE_KEY,
  normalizeStockConfiguration,
  normalizeStockType,
  stockConfigService,
} from "./stock-config-service";
export type {
  SaveStockConfigurationInput,
  SaveStockSalesLinkageInput,
  SaveStockTypeInput,
  StockApprovalLevel,
  StockApprovalLevelRole,
  StockApprovalWorkflow,
  StockConfiguration,
  StockFieldMapping,
  StockSalesLinkage,
  StockTrackingLevel,
  StockType,
  StockTypeBehavior,
  StockUdfSchemaDocument,
} from "./stock-config-service";
export { leaveConfigService } from "./leave-config-service";
export type {
  HolidayUploadResponse,
  HolidayUploadSummary,
  LeaveApprovalLevel,
  LeaveAutoAction,
  LeaveConfigDocument,
  LeaveConfigResponse,
  LeaveCreditReconcileRequest,
  LeaveCreditReconcileResponse,
  LeaveCreditRuleType,
  LeaveEntitlementType,
  LeaveHoliday,
  LeaveHolidayType,
  LeavePolicy,
  LeaveTypeConfig,
  LeaveVisibility,
  LeaveYear,
} from "./leave-config-service";
export {
  featureWizardService,
  getWizardFlow,
  isWizardFlowComplete,
} from "./feature-wizard-service";
export type {
  FeatureWizardDocument,
  FeatureWizardFlow,
  FeatureWizardStep,
  FeatureWizardStepStatus,
} from "./feature-wizard-service";
export { featureConfigService } from "./feature-config-service";
export type { FeatureConfigDto, FeatureModuleStatus, ProjectModuleState } from "./feature-config-service";
export { storeService } from "./store-service";
export type {
  StoreRecord,
  BulkStoreResult,
  CreateStoreInput,
  UpdateStoreInput,
} from "./store-service";
export { productService } from "./product-service";
export type {
  BulkProductResult,
  BulkProductStoreMappingResult,
  CreateProductInput,
  ProductRecord,
  ProductStoreMapping,
  UpdateProductInput,
} from "./product-service";
export { reportConfigService } from "./report-config-service";
export type {
  ReportDataSource,
  ReportFieldMetadata,
  ReportSelectedColumn,
  ReportCalculatedField,
  ReportFilter,
  ReportOutputSettings,
  ReportJoinConfig,
  ReportDataScope,
  ReportConfigDocument,
  CreateReportConfigInput,
  UpdateReportConfigInput,
  ExecuteReportParams,
  ExecuteReportResponse,
  ExportReportParams,
  PreviewReportParams,
} from "./report-config-service";

export { documentsService } from "./documents-service";
export type {
  DocumentRecord,
  DocumentStatus,
  DocumentTargetModule,
  DocumentTargetModuleConfig,
  DocumentType,
  DocumentsFilterParams,
  DocumentsListResponse,
  UploadDocumentInput,
} from "./documents-service";

// Re-export types
export type { AdminApi } from "./admin";
export * from "./types";

// Re-export Role/Designation API
export { roleDesignationApi } from "./role-designation-api";
export type { RoleDesignationApi } from "./role-designation-api";

// Re-export API client utilities
export { ApiError } from "./api-client";
export type { ApiErrorResponse } from "./api-client";
export { formatApiError } from "./get-api-error-message";
