import { ApiError, apiClient } from "./api-client";
import { udfConfigService } from "./udf-config-service";
import type { UDFField } from "@/types/project-admin";
import type { UdfSchemaField } from "./udf-config-service";

const BASE = "/api/v1/products";

export interface ProductRecord {
  backendId: string;
  productCode: string;
  productName: string;
  category: string;
  isFocusProduct: boolean;
  projectId: string;
  isActive: boolean;
  udfs: Record<string, string | string[]>;
}

interface RawProduct {
  _id?: string;
  id?: string;
  productCode?: string;
  productName?: string;
  category?: string;
  isFocusProduct?: boolean;
  projectId?: string | { _id?: string };
  isActive?: boolean;
  [key: string]: unknown;
}

interface PaginatedProducts {
  data?: RawProduct[];
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalCount?: number;
    totalPages?: number;
  };
}

export interface ProductListResult {
  data: ProductRecord[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface BulkProductResult {
  total: number;
  successCount: number;
  invalidCount: number;
  successes?: { id: string; productCode: string }[];
  errors: {
    row?: string | number;
    productCode?: string;
    data?: unknown;
    errors: string[];
  }[];
}

interface ProductFormFieldsResponse {
  projectId?: string;
  entityType?: string;
  staticFields?: unknown;
  udfFields?: unknown;
}

export interface CreateProductInput {
  projectId: string;
  productCode: string;
  productName: string;
  category: string;
  isFocusProduct?: boolean;
  udfs?: Record<string, string | string[]>;
}

export interface UpdateProductInput {
  productCode?: string;
  productName?: string;
  category?: string;
  isFocusProduct?: boolean;
  udfs?: Record<string, string | string[]>;
}

export interface SaveProductSchemaInput {
  projectId: string;
  fields: UdfSchemaField[];
}

export interface ProductStoreMapping {
  backendId: string;
  projectId: string;
  storeId: string;
  productId: string;
  storeCode: string;
  productCode: string;
}

interface RawProductStoreMapping {
  _id?: string;
  id?: string;
  projectId?: string | { _id?: string };
  storeId?: string | { _id?: string };
  productId?: string | { _id?: string };
  storeCode?: string;
  productCode?: string;
}

export interface BulkProductStoreMappingResult {
  total: number;
  successCount: number;
  invalidCount: number;
  errors: {
    row?: string | number;
    storeCode?: string;
    productCode?: string;
    errors: string[];
  }[];
}

const KNOWN_CORE_KEYS = new Set([
  "_id",
  "id",
  "productCode",
  "productName",
  "category",
  "isFocusProduct",
  "projectId",
  "isActive",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "__v",
  "isDeleted",
  "deletedAt",
  "deletedBy",
  "version",
]);

function refToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id?: unknown })._id ?? "");
  }
  return "";
}

function extractUdfs(raw: RawProduct): Record<string, string | string[]> {
  const udfs: Record<string, string | string[]> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (KNOWN_CORE_KEYS.has(key)) continue;
    if (Array.isArray(val)) {
      udfs[key] = val.map(String);
    } else if (val != null) {
      udfs[key] = String(val);
    }
  }
  return udfs;
}

function normalizeProduct(raw: RawProduct): ProductRecord {
  return {
    backendId: String(raw._id ?? raw.id ?? ""),
    productCode: String(raw.productCode ?? ""),
    productName: String(raw.productName ?? ""),
    category: String(raw.category ?? ""),
    isFocusProduct: Boolean(raw.isFocusProduct),
    projectId: refToString(raw.projectId),
    isActive: raw.isActive !== false,
    udfs: extractUdfs(raw),
  };
}

function normalizeProductsResponse(raw: PaginatedProducts | RawProduct[]): ProductListResult {
  const rows = Array.isArray(raw) ? raw : (raw.data ?? []);
  const meta = Array.isArray(raw) ? undefined : raw.meta;
  const page = meta?.page ?? 1;
  const pageSize = meta?.pageSize ?? rows.length;
  const totalCount = meta?.totalCount ?? meta?.total ?? rows.length;
  return {
    data: rows.map(normalizeProduct),
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages: meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))),
    },
  };
}

function normalizeUdfSchemaFields(payload: unknown): UdfSchemaField[] {
  const fields = Array.isArray(payload) ? payload : [];
  return fields.map((item, index) => {
    const f = item as Record<string, unknown>;
    return {
      fieldKey: String(f.fieldKey ?? `field_${index + 1}`),
      label: String(f.label ?? f.fieldKey ?? `Field ${index + 1}`),
      type: String(f.type ?? "STRING").toUpperCase() as UdfSchemaField["type"],
      required: Boolean(f.required),
      status: typeof f.status === "boolean" ? f.status : true,
      order: typeof f.order === "number" ? f.order : index + 1,
      config: f.config && typeof f.config === "object" && !Array.isArray(f.config)
        ? (f.config as Record<string, unknown>)
        : {},
      summaryKey: typeof f.summaryKey === "boolean" ? f.summaryKey : false,
      visibilityRules: Array.isArray(f.visibilityRules)
        ? (f.visibilityRules as UdfSchemaField["visibilityRules"])
        : undefined,
    };
  });
}

function schemaFieldsToRuntimeFields(payload: unknown): UDFField[] {
  const fields = Array.isArray(payload) ? payload : [];

  return fields
    .map((item, index) => {
      const f = item as Record<string, unknown>;
      const typeRaw = String(f.type ?? "STRING").toUpperCase();
      let type: UDFField["type"] | null = "alphanumeric";
      if (typeRaw === "NUMBER") type = "numeric";
      if (typeRaw === "DROPDOWN" || typeRaw === "SELECT" || typeRaw === "API_SELECT" || typeRaw === "CASCADING_SELECT") {
        type = "dropdown";
      }
      if (typeRaw === "DATE" || typeRaw === "BOOLEAN" || typeRaw === "IMAGE" || typeRaw === "FILE") {
        type = null;
      }
      if (!type) return null;

      const config =
        f.config && typeof f.config === "object" && !Array.isArray(f.config)
          ? (f.config as Record<string, unknown>)
          : {};
      const options = Array.isArray(config.options) ? config.options.map(String) : [];
      const idSeed = String(f.fieldKey ?? f.label ?? index + 1);
      const id = Array.from(idSeed).reduce((sum, char) => sum + char.charCodeAt(0), 0);

      const runtimeField: UDFField = {
        id,
        fieldKey: String(f.fieldKey ?? `field_${index + 1}`),
        name: String(f.label ?? f.fieldKey ?? `Field ${index + 1}`),
        type,
        values: options,
        mandatory: Boolean(f.required),
      };

      if (options.length > 0) {
        runtimeField.optionItems = options.map((option) => ({ label: option, value: option }));
      }

      if (typeRaw === "API_SELECT") {
        runtimeField.sourceKey = String(config.sourceKey ?? "") || undefined;
        runtimeField.labelKey = String(config.labelKey ?? "") || undefined;
        runtimeField.valueKey = String(config.valueKey ?? "") || undefined;
        runtimeField.multiple = Boolean(config.multiple);
      }

      return runtimeField;
    })
    .filter((field): field is UDFField => Boolean(field));
}

function normalizeSchemaFieldForSave(
  field: UdfSchemaField,
  index: number,
): Record<string, unknown> {
  return {
    fieldKey: field.fieldKey,
    label: field.label,
    type: field.type,
    ...(field.required !== undefined ? { required: field.required } : {}),
    order: field.order ?? index + 1,
    ...(field.status !== undefined ? { status: field.status } : {}),
    ...(field.summaryKey !== undefined ? { summaryKey: field.summaryKey } : {}),
    ...(field.visibilityRules ? { visibilityRules: field.visibilityRules } : {}),
    ...(field.config && typeof field.config === "object" && !Array.isArray(field.config)
      ? { config: field.config }
      : {}),
  };
}

function normalizeMapping(raw: RawProductStoreMapping): ProductStoreMapping {
  return {
    backendId: String(raw._id ?? raw.id ?? ""),
    projectId: refToString(raw.projectId),
    storeId: refToString(raw.storeId),
    productId: refToString(raw.productId),
    storeCode: String(raw.storeCode ?? ""),
    productCode: String(raw.productCode ?? ""),
  };
}

export const productService = {
  async listByProject(projectId: string, page = 1, pageSize = 50): Promise<ProductListResult> {
    const res = await apiClient.get<PaginatedProducts | RawProduct[]>(
      `${BASE}?projectId=${encodeURIComponent(projectId)}&page=${page}&pageSize=${pageSize}`,
    );
    return normalizeProductsResponse(res);
  },

  async listAllByProject(projectId: string): Promise<ProductRecord[]> {
    const firstPage = await productService.listByProject(projectId);
    const products = [...firstPage.data];

    for (let page = firstPage.meta.page + 1; page <= firstPage.meta.totalPages; page += 1) {
      const result = await productService.listByProject(projectId, page);
      products.push(...result.data);
    }

    return products;
  },

  async getFormFields(projectId: string): Promise<UDFField[]> {
    try {
      const config = await productService.getFormFieldsConfig(projectId);
      if (config && config.udfFields.length > 0) {
        return schemaFieldsToRuntimeFields(config.udfFields);
      }
    } catch {
      // fall through
    }

    try {
      const schema = await udfConfigService.getSchema({
        projectId,
        entityType: udfConfigService.entityTypeForScope("product"),
      });
      return schemaFieldsToRuntimeFields(schema?.fields ?? []);
    } catch {
      return [];
    }
  },

  async getFormFieldsConfig(projectId: string): Promise<{
    projectId: string;
    entityType: string;
    udfFields: UdfSchemaField[];
    staticFields: unknown;
  } | null> {
    try {
      const payload = await apiClient.get<ProductFormFieldsResponse>(
        `${BASE}/form-fields/${encodeURIComponent(projectId)}`,
      );
      if (!payload || typeof payload !== "object") return null;

      return {
        projectId: String(payload.projectId ?? projectId),
        entityType: String(payload.entityType ?? "PRODUCT"),
        udfFields: normalizeUdfSchemaFields(payload.udfFields),
        staticFields: payload.staticFields ?? null,
      };
    } catch {
      return null;
    }
  },

  async saveProductSchema(input: SaveProductSchemaInput): Promise<void> {
    await apiClient.post(`${BASE}/schema`, {
      projectId: input.projectId,
      fields: input.fields.map(normalizeSchemaFieldForSave),
    });
  },

  async create(input: CreateProductInput): Promise<void> {
    await apiClient.post(BASE, {
      projectId: input.projectId,
      productCode: input.productCode,
      productName: input.productName,
      category: input.category,
      isFocusProduct: input.isFocusProduct ?? false,
      ...(input.udfs ?? {}),
    });
  },

  async update(productId: string, input: UpdateProductInput): Promise<void> {
    await apiClient.patch(`${BASE}/${encodeURIComponent(productId)}`, {
      ...(input.productCode !== undefined ? { productCode: input.productCode } : {}),
      ...(input.productName !== undefined ? { productName: input.productName } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.isFocusProduct !== undefined ? { isFocusProduct: input.isFocusProduct } : {}),
      ...(input.udfs ?? {}),
    });
  },

  async delete(productId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${encodeURIComponent(productId)}`);
  },

  async downloadTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(`${BASE}/bulk/template?projectId=${encodeURIComponent(projectId)}`);
  },

  async bulkUpload(projectId: string, file: File): Promise<BulkProductResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    return apiClient.postFormData<BulkProductResult>(`${BASE}/bulk/excel`, formData);
  },

  async exportProducts(projectId: string): Promise<Blob> {
    return apiClient.getBlob(`${BASE}/bulk/export?projectId=${encodeURIComponent(projectId)}`);
  },

  async listStoreMappings(projectId: string): Promise<ProductStoreMapping[]> {
    const res = await apiClient.get<RawProductStoreMapping[]>(
      `${BASE}/store-mapping?projectId=${encodeURIComponent(projectId)}`,
    );
    return (Array.isArray(res) ? res : []).map(normalizeMapping);
  },

  async createStoreMapping(input: {
    projectId: string;
    storeCode: string;
    productCode: string;
  }): Promise<void> {
    await apiClient.post(`${BASE}/store-mapping`, input);
  },

  async deleteStoreMapping(mappingId: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/store-mapping/${encodeURIComponent(mappingId)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        if (err.message.includes("Cannot DELETE")) {
          throw new Error("Product-store unmap API is not available on the backend yet.");
        }
        return;
      }
      throw err;
    }
  },

  async downloadStoreMappingTemplate(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/store-mapping/bulk/template?projectId=${encodeURIComponent(projectId)}`,
    );
  },

  async bulkUploadStoreMapping(
    projectId: string,
    file: File,
  ): Promise<BulkProductStoreMappingResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    return apiClient.postFormData<BulkProductStoreMappingResult>(
      `${BASE}/store-mapping/bulk/excel`,
      formData,
    );
  },

  async exportStoreMappings(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/store-mapping/bulk/export?projectId=${encodeURIComponent(projectId)}`,
    );
  },
};
