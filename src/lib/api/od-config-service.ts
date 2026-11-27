import { apiClient } from "./api-client";

export interface OdTemplateInput {
  name: string;
  designationIds: string[];
  approverDesignationId: string;
  isActive: boolean;
  affectsAttendance: boolean;
  requiresOdForStoreVisits: boolean;
  dailyVisitLimit: number;
}

export interface OdTemplate extends OdTemplateInput {
  id: string;
  autoApproveDays: number;
}

export interface OdConfiguration {
  isActive: boolean;
  templates: OdTemplate[];
  cityMasterCount?: number;
}

export interface OdCityUploadResult {
  totalRows: number;
  invalidRows: number;
  added: number;
  skipped: number;
  errors: { row: number; message: string }[];
  cityMasterCount?: number;
}

const endpoint = (projectId: string) => `/api/v1/od-config/${encodeURIComponent(projectId)}`;

export const odConfigService = {
  get(projectId: string) {
    return apiClient.get<OdConfiguration>(endpoint(projectId));
  },
  save(projectId: string, template: OdTemplateInput, templateId?: string) {
    const path = `${endpoint(projectId)}/templates`;
    return templateId
      ? apiClient.patch<OdTemplate>(`${path}/${encodeURIComponent(templateId)}`, template)
      : apiClient.post<OdTemplate>(path, template);
  },
  activate(projectId: string, isActive: boolean) {
    return apiClient.put<OdConfiguration>(`${endpoint(projectId)}/activation`, { isActive });
  },
  downloadCityTemplate(projectId: string) {
    return apiClient.getBlob(`${endpoint(projectId)}/cities/template`);
  },
  uploadCities(projectId: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiClient.postFormData<OdCityUploadResult>(`${endpoint(projectId)}/cities/upload`, form);
  },
};
