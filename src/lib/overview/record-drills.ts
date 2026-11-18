import type { TeamScope, TeamSummaryCard } from "@/lib/team-follow-ups/types";

export type Period = { date: string } | { month: number; year: number };
export interface RecordSelection {
  card: TeamSummaryCard;
  status: string;
  formUserId?: string;
  reporteeId?: string;
}

/** Existing record endpoints stay separate from the new missing-people endpoint. */
export function recordDrillUrl(
  selection: RecordSelection,
  period: Period,
  scope: TeamScope,
  page: number,
  search: string,
): string | null {
  const { card, status, formUserId, reporteeId } = selection;
  const key = encodeURIComponent(card.sectionKey);
  let path: string;
  const genericForm = card.isFormBuilder && !card.seedScore && !card.demoCount;
  if (reporteeId && !genericForm && !card.sales && !card.stock) return null;
  if (genericForm)
    path = reporteeId
      ? `forms/${key}/submissions`
      : formUserId
        ? `team/forms/${key}/users/${encodeURIComponent(formUserId)}/submissions`
        : `team/forms/${key}/users`;
  else if (card.sales) path = `team/sales/${key}`;
  else if (card.stock) path = `team/stock/${key}`;
  else if (card.sectionKey === "attendance") path = "team/attendance/users";
  else if (["visit", "visits"].includes(card.sectionKey)) path = "team/visits";
  else if (card.sectionKey === "claims") path = "team/claims";
  else return null;
  const params = new URLSearchParams(
    reporteeId ? { userId: reporteeId } : { scope },
  );
  Object.entries(period).forEach(([key, value]) =>
    params.set(key, String(value)),
  );
  if (search.trim() && !formUserId) params.set("search", search.trim());
  if (!genericForm) params.set("status", status);
  if (
    (genericForm && (formUserId || reporteeId)) ||
    (!genericForm && card.sectionKey !== "attendance")
  ) {
    params.set("page", String(page));
    params.set("limit", "20");
  }
  return `/api/v1/overview/${path}?${params}`;
}

export function submissionDetailUrl(
  card: TeamSummaryCard,
  row: Record<string, unknown>,
): string | null {
  const id = row.id ?? row.submissionId ?? row._id;
  if (typeof id !== "string") return null;
  const key = encodeURIComponent(card.sectionKey);
  if (card.sales)
    return `/api/v1/overview/sales/${key}/${row.recordType === "zero_sales" ? "zero-sales" : "submissions"}/${encodeURIComponent(id)}`;
  if (card.stock)
    return `/api/v1/overview/stock/${key}/submissions/${encodeURIComponent(id)}`;
  if (card.isFormBuilder)
    return `/api/v1/overview/forms/${key}/submissions/${encodeURIComponent(id)}`;
  return null;
}
