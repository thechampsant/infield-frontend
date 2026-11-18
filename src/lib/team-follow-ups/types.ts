export type TeamScope = "direct" | "all";
export type FollowUpView = "listed" | "unverified";

export interface FollowUpBlock {
  state:
    | "listed"
    | "all_clear"
    | "nobody_expected"
    | "incomplete"
    | "unavailable";
  label: string;
  assignedCount: number | null;
  checkedInCount: number | null;
  attendanceNotRequiredCount: number | null;
  expectedCount: number | null;
  listedCount: number | null;
  noEntryCount: number | null;
  zeroCount: number | null;
  rejectedCount: number | null;
  unverifiedCount: number | null;
  denominatorKind: "checked_in" | "reports" | "expected_reports" | null;
  isToday: boolean;
  unavailableReason: "publication_unknown" | "calculation_failed" | null;
}

/** Additive view of a card: callers retain their existing metrics and drill payloads. */
export interface TeamSummaryCard {
  sectionKey: string;
  label: string;
  isFormBuilder: boolean;
  followUp?: FollowUpBlock;
  seedScore?: unknown;
  demoCount?: unknown;
  subtitle?: string;
  metrics?: MetricTile[];
  sales?: SubmissionBlock;
  stock?: SubmissionBlock & {
    flow: Record<string, number | string | null>;
    skuCount: number;
    flowEnabled: boolean;
  };
  [key: string]: unknown;
}

export interface MetricTile {
  key: string;
  label: string;
  value: number;
  colorHex: string;
}
export interface SubmissionBlock {
  total: number;
  tiles: (MetricTile & { row?: string })[];
}

export interface TeamSummary {
  managerId: string;
  scope: TeamScope;
  modules: TeamSummaryCard[];
  dateRange: { start: string; end: string };
  [key: string]: unknown;
}

export interface FollowUpPerson {
  user: {
    userId: string;
    avatarUrl: string | null;
    name: string;
    employeeId: string | null;
    designation: string | null;
    isSubManager: boolean;
    isDirectReportee: boolean;
    managerId: string | null;
    managerName: string | null;
  };
  reason: {
    key: "no_entry" | "rejected" | "zero_sales" | "mapping_unknown";
    label: string;
    rejectionReason: string | null;
    declaredAt: string | null;
    dayLocked: boolean;
  };
  attendance: {
    type: string;
    checkInAt: string;
    checkOutAt: string | null;
    state: "checked_in" | "checked_out";
  } | null;
  stores: {
    storeId: string;
    storeCode: string | null;
    storeName: string | null;
  }[];
  storeSource:
    | "attendance"
    | "current_mapping"
    | "historical_mapping"
    | "none"
    | "unknown";
  phoneNumber: string | null;
}

export interface FollowUpList {
  moduleKey: string;
  moduleName: string;
  date: string;
  scope: TeamScope;
  followUp: FollowUpBlock | null;
  view: FollowUpView;
  search: string | null;
  totalCount: number;
  items: FollowUpPerson[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  emptyReason:
    | "all_clear"
    | "no_match"
    | "unverified"
    | "before_publication"
    | "nobody_expected"
    | "unavailable"
    | null;
}

export interface FollowUpQuery {
  moduleKey: string;
  date: string;
  scope: TeamScope;
  view: FollowUpView;
  search: string;
  page: number;
  limit: number;
}

export interface TeamOverviewApi {
  getSummary: (
    query: { scope: TeamScope } & (
      | { date: string }
      | { month: number; year: number }
    ),
    signal?: AbortSignal,
  ) => Promise<TeamSummary>;
  getFollowUps: (
    query: FollowUpQuery,
    signal?: AbortSignal,
  ) => Promise<FollowUpList>;
}
