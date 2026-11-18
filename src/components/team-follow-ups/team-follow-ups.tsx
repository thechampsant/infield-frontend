"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { teamOverviewService } from "@/lib/api/team-overview-service";
import {
  TeamFollowUpStore,
  type FollowUpContext,
} from "@/lib/team-follow-ups/store";
import {
  attendanceTime,
  breakdown,
  denominator,
  displayDate,
  displayTime,
  eligibleFollowUp,
  followUpMessage,
} from "@/lib/team-follow-ups/presentation";
import type {
  TeamOverviewApi,
  TeamSummaryCard,
} from "@/lib/team-follow-ups/types";
import styles from "./team-follow-ups.module.css";
import { CheckCircle2, ChevronRight, Search, X } from "lucide-react";

const FollowUpContext = createContext<{
  store: TeamFollowUpStore;
  filters: FollowUpContext;
  onOpenReportee: (userId: string, name?: string) => void;
  onOpenFollowUp?: () => void;
} | null>(null);

/** Wrap the existing Team screen. This does not replace cards, controls or submission drills. */
export function TeamFollowUpProvider({
  children,
  onOpenReportee,
  onOpenFollowUp,
  api = teamOverviewService,
  controller,
  ...filters
}: FollowUpContext & {
  children: ReactNode;
  onOpenReportee: (userId: string, name?: string) => void;
  onOpenFollowUp?: () => void;
  api?: Pick<TeamOverviewApi, "getFollowUps">;
  controller?: TeamFollowUpStore;
}) {
  const store = useMemo(
    () => controller ?? new TeamFollowUpStore(api),
    [api, controller],
  );
  const { date, scope, summary, refreshing, summaryError } = filters;
  useEffect(() => {
    store.configure({ date, scope, summary, refreshing, summaryError });
    return store.cancel;
  }, [store, date, scope, summary, refreshing, summaryError]);
  return (
    <FollowUpContext.Provider
      value={{ store, filters, onOpenReportee, onOpenFollowUp }}
    >
      {children}
    </FollowUpContext.Provider>
  );
}

export function useFollowUps() {
  const context = useContext(FollowUpContext);
  if (!context) throw new Error("Team follow-ups require TeamFollowUpProvider");
  const state = useSyncExternalStore(
    context.store.subscribe,
    context.store.getSnapshot,
    context.store.getSnapshot,
  );
  return { ...context, state };
}

/** Render under a generic form header, or after the existing Sales/Stock grid and split. */
export function TeamFollowUpBox({ card }: { card: TeamSummaryCard }) {
  const { store, state, filters, onOpenFollowUp } = useFollowUps();
  const block = eligibleFollowUp(card);
  if (!filters.date || !block) return null;
  const tone =
    block.state === "all_clear" && !block.unverifiedCount
      ? "clear"
      : block.state === "unavailable" || block.state === "nobody_expected"
        ? "neutral"
        : block.isToday
          ? "today"
          : "past";
  const active = state.moduleKey === card.sectionKey;
  const content = (
    <>
      {block.state === "listed" && (
        <span className={styles.count}>{block.listedCount}</span>
      )}
      {block.state === "all_clear" && !block.unverifiedCount && (
        <CheckCircle2
          size={18}
          className={styles.statusIcon}
          aria-hidden="true"
        />
      )}
      <span className={styles.boxCopy}>
        <strong>
          {block.state === "listed"
            ? block.label
            : block.state === "all_clear" && !block.unverifiedCount
              ? "All clear"
              : followUpMessage(card, block)}
        </strong>
        {block.state === "all_clear" && !block.unverifiedCount && (
          <span>{followUpMessage(card, block)}</span>
        )}
        {block.state === "listed" && (
          <span>
            {denominator(block)}
            {block.isToday ? " so far" : ""}
            {breakdown(block) && ` · ${breakdown(block)}`}
          </span>
        )}
      </span>
      {block.state === "listed" && (
        <ChevronRight
          size={21}
          strokeWidth={2.5}
          className={styles.chevron}
          aria-hidden="true"
        />
      )}
    </>
  );
  return (
    <div
      className={`${styles.box} ${styles[tone]} ${active ? styles.selected : ""}`}
      data-selected={active || undefined}
    >
      {!!block.listedCount && block.state !== "unavailable" ? (
        <button
          className={`btn ${styles.trigger}`}
          type="button"
          disabled={filters.refreshing}
          aria-pressed={active && state.view === "listed"}
          onClick={(event) => {
            event.stopPropagation();
            store.select(card.sectionKey);
            onOpenFollowUp?.();
          }}
        >
          {content}
        </button>
      ) : (
        <div className={styles.message} role="status">
          {content}
        </div>
      )}
      {!!block.unverifiedCount && (
        <button
          className={`btn ${styles.unverified}`}
          type="button"
          disabled={filters.refreshing}
          aria-pressed={active && state.view === "unverified"}
          onClick={(event) => {
            event.stopPropagation();
            store.select(card.sectionKey, "unverified");
            onOpenFollowUp?.();
          }}
        >
          {block.unverifiedCount} could not be verified · View
        </button>
      )}
    </div>
  );
}

function emptyMessage(reason: string | null, count: number | null | undefined) {
  if (reason === "no_match")
    return "No match. Try a different name, store or employee ID.";
  if (reason === "before_publication")
    return "Follow-ups are not available before this date.";
  if (reason === "unavailable") return "Follow-up information is unavailable.";
  if (reason === "unverified")
    return "No confirmed follow-ups. Some store mappings could not be verified.";
  if (reason === "nobody_expected")
    return "Nobody was expected to submit on this date.";
  return `All clear · ${count ?? 0} expected reports`;
}

/** Same-screen people mode; existing record-list components and endpoints are unchanged. */
export function TeamFollowUpTable() {
  const { store, state, filters, onOpenReportee } = useFollowUps();
  const headingId = useId(),
    searchId = useId();
  const card = filters.summary?.modules.find(
    (c) => c.sectionKey === state.moduleKey,
  );
  if (!card || !filters.date || !eligibleFollowUp(card)) return null;
  const matchingFilters =
    state.contextKey === `${filters.date}:${filters.scope}`;
  const data =
    matchingFilters && !filters.refreshing && !filters.summaryError
      ? state.data
      : null;
  const block = data?.followUp ?? card.followUp!;
  const loading =
    filters.refreshing || !matchingFilters || state.status === "loading";
  return (
    <section
      className={styles.panel}
      aria-labelledby={headingId}
      aria-busy={loading}
    >
      <div className={styles.heading}>
        <div>
          <h2 id={headingId}>
            {card.label} ·{" "}
            {state.view === "unverified"
              ? "Unverified store mappings"
              : block.label}
          </h2>
          <p>
            {block.state !== "unavailable" && (
              <>
                {state.view === "unverified"
                  ? block.unverifiedCount
                  : block.listedCount}{" "}
                {denominator(block)} ·{" "}
              </>
            )}
            {block.isToday ? "Today · " : ""}
            {displayDate(filters.date)} ·{" "}
            {filters.scope === "all" ? "+ Sub" : "Direct"}
          </p>
        </div>
        <button
          className={`btn ${styles.close}`}
          type="button"
          onClick={store.close}
          aria-label="Close follow-up table"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {!!block.unverifiedCount && (
        <p className={styles.notice}>
          Historical store mappings could not be verified for{" "}
          {block.unverifiedCount} reports. These are separate from confirmed
          missing entries.
        </p>
      )}
      <div className={styles.search}>
        <label htmlFor={searchId}>Search by name, store or employee ID</label>
        <div className={styles.searchField}>
          <Search size={20} aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            maxLength={100}
            value={state.draftSearch}
            disabled={filters.refreshing || block.state === "unavailable"}
            onChange={(event) => store.setSearch(event.target.value)}
            placeholder="Search name, store, ID…"
          />
        </div>
      </div>
      {filters.summaryError ? (
        <p role="alert">
          Refresh the Team summary to reload follow-ups. {filters.summaryError}
        </p>
      ) : loading ? (
        <p role="status" className={styles.empty}>
          Loading reports…
        </p>
      ) : state.status === "error" ? (
        <div role="alert" className={styles.empty}>
          <p>{state.error}</p>
          <button className="btn" type="button" onClick={store.retry}>
            Retry
          </button>
        </div>
      ) : block.state === "unavailable" ? (
        <p role="status" className={styles.empty}>
          {followUpMessage(card, block)}
        </p>
      ) : data && !data.items.length ? (
        <p role="status" className={styles.empty}>
          {state.view === "unverified" &&
          !data.totalCount &&
          data.emptyReason !== "no_match"
            ? "No unresolved store mappings"
            : emptyMessage(data.emptyReason, block.expectedCount)}
        </p>
      ) : data ? (
        <>
          <div
            className={styles.tableContainer}
            role="region"
            aria-label={`${card.label} follow-up reports`}
            tabIndex={0}
          >
            <table>
              <colgroup>
                {["16%", "24%", "13%", "15%", "18%", "14%"].map(
                  (width, index) => (
                    <col key={index} style={{ width }} />
                  ),
                )}
              </colgroup>
              <thead>
                <tr>
                  {[
                    "Name",
                    "Why",
                    "Attendance type",
                    "Time",
                    "Store",
                    "Phone",
                  ].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.user.userId}>
                    <td>
                      <button
                        className={`btn ${styles.name}`}
                        type="button"
                        onClick={() =>
                          onOpenReportee(row.user.userId, row.user.name)
                        }
                      >
                        {row.user.name}
                      </button>
                      {row.user.isSubManager && (
                        <span className={styles.badge}>Sub-Mgr</span>
                      )}
                      <small>
                        {[row.user.employeeId, row.user.designation]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                      {filters.scope === "all" &&
                        !row.user.isDirectReportee &&
                        row.user.managerName && (
                          <small>Under {row.user.managerName}</small>
                        )}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[row.reason.key]}`}
                      >
                        {row.reason.label}
                      </span>{" "}
                      {row.reason.key === "rejected" &&
                        row.reason.rejectionReason && (
                          <span className={styles.reasonDetail}>
                            {row.reason.rejectionReason}
                          </span>
                        )}
                      {row.reason.key === "zero_sales" && (
                        <span className={styles.reasonDetail}>
                          {displayTime(row.reason.declaredAt)}
                          {row.reason.dayLocked ? " · day locked" : ""}
                        </span>
                      )}
                    </td>
                    <td>{row.attendance?.type ?? ""}</td>
                    <td>{attendanceTime(row.attendance, block.isToday)}</td>
                    <td>
                      {row.stores.map((store) => (
                        <small key={store.storeId}>
                          {[store.storeName, store.storeCode]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      ))}
                      {row.storeSource === "current_mapping" &&
                        row.stores.length > 0 && (
                          <small className={styles.muted}>
                            Current mapping
                          </small>
                        )}
                    </td>
                    <td>{row.phoneNumber ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <span>
              {data.totalCount} {state.search ? "matching " : ""}reports · Page{" "}
              {data.pagination.page} of{" "}
              {Math.max(1, data.pagination.totalPages)}
            </span>
            <div>
              <button
                className="btn"
                type="button"
                disabled={!data.pagination.hasPrevPage}
                onClick={() => store.changePage("previous")}
              >
                Previous
              </button>
              <button
                className="btn"
                type="button"
                disabled={!data.pagination.hasNextPage}
                onClick={() => store.changePage("next")}
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
