"use client";
import { useMemo, useState } from "react";
import { ClipboardList, Package, RefreshCw, ShoppingCart } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessOverview } from "@/lib/overview/access";
import { webOverviewCards } from "@/lib/overview/cards";
import { useOverviewResource } from "@/lib/overview/use-overview-resource";
import {
  recordDrillUrl,
  type Period,
  type RecordSelection,
} from "@/lib/overview/record-drills";
import { istDay } from "@/lib/team-follow-ups/presentation";
import type {
  TeamScope,
  TeamSummary,
  TeamSummaryCard,
} from "@/lib/team-follow-ups/types";
import {
  TeamFollowUpBox,
  TeamFollowUpProvider,
  TeamFollowUpTable,
  useFollowUps,
} from "@/components/team-follow-ups/team-follow-ups";
import { RecordDrill } from "./record-drill";
import styles from "./overview.module.css";

export function SummaryCards({
  cards,
  onOpenRecords,
  reporteeId,
}: {
  cards: TeamSummaryCard[];
  onOpenRecords: (selection: RecordSelection) => void;
  reporteeId?: string;
}) {
  const { store, state } = useFollowUps();
  return (
    <div className={styles.grid}>
      {webOverviewCards(cards).map((card) => {
        const genericForm =
          card.isFormBuilder && !card.seedScore && !card.demoCount;
        const submissionCard = !!(card.sales || card.stock);
        const Icon = card.sales
          ? ShoppingCart
          : card.stock
            ? Package
            : ClipboardList;
        const tiles =
          card.sales?.tiles ?? card.stock?.tiles ?? card.metrics ?? [];
        const supported =
          recordDrillUrl(
            { card, status: "total", reporteeId },
            { date: "2000-01-01" },
            "direct",
            1,
            "",
          ) !== null;
        function open(status: string) {
          store.close();
          onOpenRecords({ card, status, reporteeId });
        }
        const split = (card.sales?.tiles ?? card.stock?.tiles ?? []).filter(
          (t) => !["total", "zero_sales"].includes(t.key),
        );
        const sum = split.reduce((n, t) => n + t.value, 0);
        return (
          <article
            className={`${styles.card} ${genericForm ? styles.formCard : ""} ${state.moduleKey === card.sectionKey ? styles.selectedCard : ""}`}
            key={card.sectionKey}
          >
            <header
              className={
                submissionCard || genericForm ? styles.moduleHeader : undefined
              }
            >
              {(submissionCard || genericForm) && (
                <span
                  className={`${styles.moduleIcon} ${card.sales ? styles.salesIcon : card.stock ? styles.stockIcon : styles.formIcon}`}
                >
                  <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
                </span>
              )}
              <div className={styles.headerText}>
                {!submissionCard && !genericForm && (
                  <div className={styles.eyebrow}>Team activity</div>
                )}
                {supported ? (
                  <button
                    className={`btn ${styles.cardTitle}`}
                    onClick={() =>
                      open(
                        card.sectionKey === "visit" ||
                          card.sectionKey === "visits"
                          ? "all"
                          : card.sectionKey === "attendance"
                            ? (tiles[0]?.key ?? "present")
                            : "total",
                      )
                    }
                  >
                    {card.label}
                    {!submissionCard && !genericForm && (
                      <span aria-hidden="true">↗</span>
                    )}
                  </button>
                ) : (
                  <h2>{card.label}</h2>
                )}
                <p>{card.subtitle}</p>
              </div>
            </header>
            {!genericForm && (
              <div className={styles.metrics}>
                {tiles.map((tile) =>
                  supported ? (
                    <button
                      className="btn"
                      key={tile.key}
                      onClick={() => open(tile.key)}
                    >
                      <span>{tile.label}</span>
                      <strong style={{ color: tile.colorHex }}>
                        {tile.value}
                      </strong>
                    </button>
                  ) : (
                    <div key={tile.key}>
                      <span>{tile.label}</span>
                      <strong style={{ color: tile.colorHex }}>
                        {tile.value}
                      </strong>
                    </div>
                  ),
                )}
              </div>
            )}
            {sum > 0 && (
              <div
                className={styles.split}
                aria-label="Submission status breakdown"
              >
                {split.map((tile) => (
                  <span
                    key={tile.key}
                    title={`${tile.label}: ${tile.value}`}
                    style={{
                      width: `${(tile.value / sum) * 100}%`,
                      background: tile.colorHex,
                    }}
                  />
                ))}
              </div>
            )}
            {card.stock && (
              <div className={styles.flow}>
                <span>{card.stock.skuCount} SKUs</span>
                {card.stock.flowEnabled &&
                  ["opening", "refill", "out", "current"].map((key) => (
                    <span key={key}>
                      {key}: <strong>{card.stock!.flow[key]}</strong>
                    </span>
                  ))}
              </div>
            )}
            {!reporteeId && (
              <div className={styles.followUpSlot}>
                <TeamFollowUpBox card={card} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ReporteeOverview({
  userId,
  name,
  period,
  onOpenRecords,
  refreshRevision = 0,
}: {
  userId: string;
  name: string;
  period: Period;
  onOpenRecords: (selection: RecordSelection) => void;
  refreshRevision?: number;
}) {
  const params = new URLSearchParams({ userId });
  Object.entries(period).forEach(([key, value]) =>
    params.set(key, String(value)),
  );
  const [revision, setRevision] = useState(0);
  const resource = useOverviewResource<{
    overview: { sections: TeamSummaryCard[] };
  }>(`/api/v1/overview?${params}`, revision + refreshRevision);
  return (
    <>
      <h2 className={styles.reporteeTitle}>
        {name || "Reportee"} · Reportee Overview
      </h2>
      {resource.loading ? (
        <p role="status">Loading reportee overview…</p>
      ) : resource.error ? (
        <p role="alert">
          {resource.error}{" "}
          <button className="btn" onClick={() => setRevision((r) => r + 1)}>
            Retry
          </button>
        </p>
      ) : (
        <SummaryCards
          cards={resource.data?.overview.sections ?? []}
          onOpenRecords={onOpenRecords}
          reporteeId={userId}
        />
      )}
    </>
  );
}

function OverviewContent() {
  const today = istDay(new Date().toISOString());
  const yesterday = new Date(
    new Date(`${today}T12:00:00Z`).getTime() - 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const [date, setDate] = useState(today),
    [scope, setScope] = useState<TeamScope>("direct"),
    [revision, setRevision] = useState(0);
  const [record, setRecord] = useState<RecordSelection | null>(null),
    [reportee, setReportee] = useState<{ id: string; name: string } | null>(
      null,
    );
  const period = { date };
  const params = new URLSearchParams({ scope });
  Object.entries(period).forEach(([key, value]) =>
    params.set(key, String(value)),
  );
  const resource = useOverviewResource<TeamSummary>(
    reportee ? null : `/api/v1/overview/team/summary?${params}`,
    revision,
  );
  const summary = useMemo<TeamSummary | null>(
    () =>
      resource.data
        ? { ...resource.data, modules: webOverviewCards(resource.data.modules) }
        : null,
    [resource.data],
  );
  const drillKey = `${JSON.stringify(period)}:${scope}:${record?.card.sectionKey}:${record?.status}:${record?.formUserId}:${record?.reporteeId}`;
  const openReportee = (id: string, name = "Reportee") => {
    setRecord(null);
    setReportee({ id, name });
  };
  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Team performance</p>
          <h1>Overview</h1>
          <p>Daily activity and the people who need a follow-up.</p>
        </div>
        <button
          className={`btn ${styles.refresh}`}
          disabled={resource.loading}
          onClick={() => {
            setRecord(null);
            setRevision((r) => r + 1);
          }}
        >
          <RefreshCw size={13} aria-hidden="true" />
          Refresh
        </button>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <div className={styles.segmented} aria-label="Quick date selection">
            <button
              className="btn"
              aria-pressed={date === today}
              onClick={() => {
                setDate(today);
                setRecord(null);
              }}
            >
              Today
            </button>
            <button
              className="btn"
              aria-pressed={date === yesterday}
              onClick={() => {
                setDate(yesterday);
                setRecord(null);
              }}
            >
              Yesterday
            </button>
          </div>
          {!reportee && (
            <div className={styles.segmented} aria-label="Reportee scope">
              <button
                className="btn"
                aria-pressed={scope === "direct"}
                onClick={() => {
                  setScope("direct");
                  setRecord(null);
                }}
              >
                Direct
              </button>
              <button
                className="btn"
                aria-pressed={scope === "all"}
                onClick={() => {
                  setScope("all");
                  setRecord(null);
                }}
              >
                + Sub
              </button>
            </div>
          )}
        </div>
        <div className={styles.dateControls}>
          <label>
            Date
            <input
              aria-label="Overview date"
              type="date"
              max={today}
              value={date}
              onChange={(e) => {
                if (!e.target.value) return;
                setDate(e.target.value);
                setRecord(null);
              }}
            />
          </label>
        </div>
      </div>
      <TeamFollowUpProvider
        summary={summary}
        date={!reportee ? date : undefined}
        scope={scope}
        refreshing={resource.loading}
        summaryError={resource.error ?? undefined}
        onOpenReportee={openReportee}
        onOpenFollowUp={() => setRecord(null)}
      >
        {reportee ? (
          <>
            <button
              className={`btn ${styles.back}`}
              onClick={() => {
                setReportee(null);
                setRecord(null);
              }}
            >
              ← Back to team
            </button>
            <ReporteeOverview
              key={reportee.id}
              userId={reportee.id}
              name={reportee.name}
              period={period}
              onOpenRecords={setRecord}
              refreshRevision={revision}
            />
          </>
        ) : resource.loading ? (
          <div className={styles.empty} role="status">
            Loading your team…
          </div>
        ) : resource.error ? (
          <div role="alert" className={styles.empty}>
            <p>{resource.error}</p>
            <button className="btn" onClick={() => setRevision((r) => r + 1)}>
              Retry
            </button>
          </div>
        ) : !summary?.modules.length ? (
          <div className={styles.empty}>
            <h2>No Sales, Stock or Form Builder forms to show</h2>
            <p>
              Enabled Sales, Stock and Form Builder forms will appear here when
              reportees are assigned.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.summaryLine}>
              <h2>Your team</h2>
              <span>{String(summary.totalReportees ?? "")} reports</span>
            </div>
            <SummaryCards cards={summary.modules} onOpenRecords={setRecord} />
            <TeamFollowUpTable />
          </>
        )}
        {record && !resource.loading && (
          <RecordDrill
            key={drillKey}
            selection={record}
            period={period}
            scope={scope}
            onClose={() => setRecord(null)}
            onChange={setRecord}
            onOpenReportee={openReportee}
          />
        )}
      </TeamFollowUpProvider>
    </div>
  );
}

/** WEB/BOTH applies to the page itself as well as navigation. No API starts before this gate. */
export function OverviewPage({ projectId }: { projectId?: string } = {}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <p role="status">Loading access…</p>;
  if (!isAuthenticated || !canAccessOverview(user))
    return (
      <div className={styles.page}>
        <h1>Overview unavailable</h1>
        <p>This page requires WEB or BOTH access on your designation.</p>
      </div>
    );
  if (projectId && user?.projectId !== projectId)
    return (
      <div className={styles.page}>
        <h1>Overview unavailable for this project</h1>
        <p>
          Open the project assigned to your current session to view your team.
        </p>
      </div>
    );
  return <OverviewContent />;
}
