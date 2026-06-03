/**
 * Project users service — wraps /api/v1/users endpoints.
 */

import { apiClient } from "./api-client";
import type { UDFField, ProjectUser } from "@/types/project-admin";

const BASE = "/api/v1/users";

interface RawUser {
  _id?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  employeeId?: string;
  designation?: string | { name?: string; roleName?: string };
  status?: string;
  isActive?: boolean;
  udfData?: Record<string, string>;
  createdAt?: string;
  dateOfJoining?: string;
  dateOfExit?: string;
}

interface PaginatedUsers {
  data?: RawUser[];
  meta?: { total?: number; page?: number; pageSize?: number };
}

function normalizeStatus(raw: RawUser): "active" | "inactive" {
  if (typeof raw.isActive === "boolean") return raw.isActive ? "active" : "inactive";
  const s = (raw.status ?? "").toUpperCase();
  if (s === "INACTIVE" || s === "DISABLED") return "inactive";
  return "active";
}

function designationLabel(raw: RawUser): { designation: string; role: string } {
  if (typeof raw.designation === "object" && raw.designation) {
    return {
      designation: raw.designation.name ?? "",
      role: raw.designation.roleName ?? "",
    };
  }
  return { designation: String(raw.designation ?? ""), role: "" };
}

function normalizeUser(raw: RawUser): ProjectUser {
  const { designation, role } = designationLabel(raw);
  const name = `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim() || raw.email || "";
  const backendId = raw._id ?? raw.id ?? "";
  return {
    backendId,
    id: raw.employeeId ?? backendId,
    name,
    mobile: raw.phoneNumber ?? "",
    email: raw.email ?? "",
    designation,
    role,
    doj: raw.dateOfJoining ?? raw.createdAt?.slice(0, 10) ?? "",
    doe: raw.dateOfExit ?? "",
    status: normalizeStatus(raw),
    udfs: raw.udfData ?? {},
  };
}

function parseFormFields(payload: unknown): UDFField[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = (root.data ?? root.fields ?? payload) as unknown;
  if (!Array.isArray(data)) return [];

  return data.map((item, index) => {
    const f = item as Record<string, unknown>;
    const typeRaw = String(f.type ?? f.fieldType ?? "alphanumeric").toLowerCase();
    let type: UDFField["type"] = "alphanumeric";
    if (typeRaw.includes("num")) type = "numeric";
    if (typeRaw.includes("drop") || typeRaw.includes("select")) type = "dropdown";

    const options = f.options ?? f.values ?? f.dropdownValues;
    return {
      id: typeof f.id === "number" ? f.id : index + 1,
      name: String(f.name ?? f.label ?? f.key ?? `Field ${index + 1}`),
      type,
      values: Array.isArray(options) ? options.map(String) : [],
      mandatory: Boolean(f.mandatory ?? f.required),
    };
  });
}

export interface CreateProjectUserInput {
  projectId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  designationId: string;
  dateOfJoining?: string;
  udfs?: Record<string, string>;
}

export interface UpdateProjectUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  designationId?: string;
  udfs?: Record<string, string>;
}

export const projectUsersService = {
  async listByProject(projectId: string, limit = 500): Promise<ProjectUser[]> {
    const res = await apiClient.get<PaginatedUsers | RawUser[]>(
      `${BASE}?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
    );
    const rows = Array.isArray(res) ? res : (res.data ?? []);
    return rows.map(normalizeUser);
  },

  async getFormFields(projectId: string): Promise<UDFField[]> {
    try {
      const res = await apiClient.get<unknown>(
        `${BASE}/form-fields/${encodeURIComponent(projectId)}`,
      );
      return parseFormFields(res);
    } catch {
      return [];
    }
  },

  async create(input: CreateProjectUserInput): Promise<void> {
    const payload: Record<string, unknown> = {
      projectId: input.projectId,
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      designation: input.designationId,
      ...(input.dateOfJoining ? { dateOfJoining: input.dateOfJoining } : {}),
      ...(input.udfs ?? {}),
    };
    await apiClient.post(BASE, payload);
  },

  async update(userId: string, input: UpdateProjectUserInput): Promise<void> {
    const payload: Record<string, unknown> = {
      ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber } : {}),
      ...(input.designationId !== undefined
        ? { designation: input.designationId }
        : {}),
      ...(input.udfs ?? {}),
    };
    await apiClient.patch(`${BASE}/${encodeURIComponent(userId)}`, payload);
  },

  async downloadTemplate(): Promise<Blob> {
    return apiClient.getBlob(`${BASE}/bulk/template`);
  },

  async exportUsers(projectId: string): Promise<Blob> {
    return apiClient.getBlob(
      `${BASE}/bulk/excel?projectId=${encodeURIComponent(projectId)}`,
    );
  },
};
