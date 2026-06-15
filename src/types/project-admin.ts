export type Status = "active" | "inactive";

export interface AuditEntry {
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
}

export type UDFType = "alphanumeric" | "numeric" | "dropdown";
export type UDFScope = "user" | "store" | "product";

export interface UDFOptionItem {
  label: string;
  value: string;
}

export type UDFValue = string | string[];

export interface UDFField {
  id: number;
  fieldKey: string;
  name: string;
  type: UDFType;
  values: string[];
  optionItems?: UDFOptionItem[];
  sourceKey?: string;
  labelKey?: string;
  valueKey?: string;
  multiple?: boolean;
  mandatory: boolean;
}

export interface UserStaticField {
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  sourceKey?: string;
  labelKey?: string;
  valueKey?: string;
  multiple?: boolean;
}

export interface UserStaticFields {
  create: UserStaticField[];
  update: UserStaticField[];
}

export interface DesignationRow {
  id: string;
  name: string;
  role: string;
  userCount: number;
  status: Status;
}

export interface User {
  id: string;
  name: string;
  mobile: string;
  email: string;
  designation: string;
  role: string;
  doj: string;
  doe: string;
  status: Status;
  udfs: Record<string, UDFValue>;
}

export interface ProjectUser extends User {
  backendId: string;
  reporteeIds: string[];
}

export interface Store {
  code: string;
  status: Status;
  udfs: Record<string, UDFValue>;
}

export interface Product {
  code: string;
  status: Status;
  udfs: Record<string, UDFValue>;
}

export type MappingType = "direct" | "pjp";

export interface MappingConfig {
  role: string;
  type: MappingType;
}

export interface DirectMapping {
  id: string;
  userId: string;
  userName: string;
  storeCode: string;
  storeName: string;
  startDate: string;
  endDate: string;
  status: Status;
}

export interface PJPMapping {
  id: string;
  userId: string;
  userName: string;
  storeCode: string;
  storeName: string;
  visitDate: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  comingSoon: boolean;
  color: "blue" | "teal" | "purple" | "amber";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  message: string;
  code?: string;
}
