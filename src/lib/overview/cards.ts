import type { TeamSummaryCard } from "@/lib/team-follow-ups/types";

/** Web Overview is limited to the team's Sales, Stock and Form Builder cards. */
export function webOverviewCards(cards: TeamSummaryCard[]): TeamSummaryCard[] {
  return cards.filter(
    (card) =>
      card.isEnabled !== false &&
      (card.isFormBuilder ||
        /^(sales|stock)_config_[a-f\d]{24}$/i.test(card.sectionKey)),
  );
}
