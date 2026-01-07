export type Status = "Active" | "Inactive" | "Onboarding";

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type Account = {
  id: string;
  name: string;
  code: string;
  primaryAdminName: string;
  primaryAdminEmail: string;
  projectsActiveCount: number;
  status: Exclude<Status, "Onboarding">;
  createdAtIso: string;
};

export type Project = {
  id: string;
  accountCode: string;
  name: string;
  code: string;
  regionLabel?: string;
  projectAdminName: string;
  projectAdminEmail: string;
  modulesActive: string[];
  status: Exclude<Status, "Onboarding">;
};

export type User = {
  id: string;
  accountCode: string;
  projectCode: string;
  name: string;
  employeeCode: string;
  email: string;
  designation: string;
  systemRole: string;
  assignedStoresLabel: string;
  status: Status;
};

export type ListQuery = {
  q?: string;
  status?: Status | "All";
  page?: number;
  pageSize?: number;
};


