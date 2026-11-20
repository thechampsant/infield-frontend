import type { FollowUpBlock, FollowUpPerson, TeamSummaryCard } from "./types";

export function eligibleFollowUp(
  card: TeamSummaryCard,
): FollowUpBlock | undefined {
  const eligible =
    /^(sales|stock)_config_[a-f\d]{24}$/i.test(card.sectionKey) ||
    (card.isFormBuilder && !card.seedScore && !card.demoCount);
  return eligible ? card.followUp : undefined;
}

export function denominator(block: FollowUpBlock): string {
  if (block.expectedCount === null || !block.denominatorKind) return "";
  return `of ${block.expectedCount} ${block.denominatorKind === "checked_in" ? "checked in" : block.denominatorKind === "reports" ? "reports" : "expected reports"}`;
}

export function followUpMessage(
  card: TeamSummaryCard,
  block: FollowUpBlock,
): string {
  if (block.state === "unavailable")
    return block.unavailableReason === "publication_unknown"
      ? "Availability date unavailable"
      : "Unable to load follow-ups";
  if (block.state === "nobody_expected")
    return block.denominatorKind === "checked_in"
      ? `Nobody checked in${block.isToday ? " yet" : ""}`
      : block.denominatorKind === "reports"
        ? "No reports expected"
        : "No expected reports";
  if (block.state === "incomplete")
    return "Store mapping could not be verified";
  if (block.state === "all_clear" && !block.unverifiedCount) {
    const population =
      block.denominatorKind === "checked_in"
        ? "checked in"
        : block.denominatorKind === "reports"
          ? "reports"
          : "expected reports";
    const action = card.sectionKey.startsWith("sales_config_")
      ? "have a sale"
      : card.sectionKey.startsWith("stock_config_")
        ? "have an entry"
        : "have submitted";
    return `All ${block.expectedCount} ${population} ${action}`;
  }
  return `${block.listedCount ?? 0} ${block.label}${block.isToday ? " so far" : ""}`;
}

export function breakdown(block: FollowUpBlock): string {
  return block.zeroCount || block.rejectedCount
    ? `${block.noEntryCount ?? 0} no entry${block.label === "No Sale" ? ` · ${block.zeroCount ?? 0} zero` : ""} · ${block.rejectedCount ?? 0} rejected`
    : "";
}

export function istDay(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime())
    ? new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 10)
    : "";
}

export function displayDate(day: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${day}T12:00:00+05:30`));
}

export function displayTime(timestamp: string | null): string {
  if (!timestamp || !Number.isFinite(new Date(timestamp).getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(timestamp));
}

export function attendanceTime(
  attendance: FollowUpPerson["attendance"],
  isToday: boolean,
): string {
  if (!attendance) return "";
  const checkIn = displayTime(attendance.checkInAt),
    checkOut = displayTime(attendance.checkOutAt);
  if (isToday)
    return checkOut ? `Checked out ${checkOut}` : `Checked in ${checkIn}`;
  return checkOut ? `${checkIn} to ${checkOut}` : `Checked in ${checkIn}`;
}
