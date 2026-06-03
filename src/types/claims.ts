export type CapType = "fixed" | "conditional";
export type BackdateWindowType = "tminus" | "daterange";

export interface Condition {
  value: string;
  cap: number;
}

export interface ClaimType {
  id: string;
  name: string;
  isDefault: boolean;
  active: boolean;
  capType: CapType;
  fixedCap: number;
  condField: string;
  conditions: Condition[];
}

export interface ApprovalStep {
  role: string;
}

export interface ClaimsConfig {
  id: string;
  name: string;
  projectId: string;
  selectedDesigs: string[];
  backdateEnabled: boolean;
  backdateWindowType: BackdateWindowType;
  backdateTminusDays: number;
  backdateDateFrom: number;
  backdateDateTo: number;
  claimTypes: ClaimType[];
  approvalEnabled: boolean;
  approvalFlow: ApprovalStep[];
}

export type FieldType =
  | "dropdown"
  | "short-text"
  | "long-text"
  | "number"
  | "date"
  | "image"
  | "file"
  | "gps";

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  showFor: string;
}
