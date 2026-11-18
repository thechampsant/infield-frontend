"use client";
import { useState } from "react";
import {
  recordDrillUrl,
  submissionDetailUrl,
  type Period,
  type RecordSelection,
} from "@/lib/overview/record-drills";
import { useOverviewResource } from "@/lib/overview/use-overview-resource";
import { displayTime } from "@/lib/team-follow-ups/presentation";
import type { TeamScope } from "@/lib/team-follow-ups/types";
import styles from "./overview.module.css";

type Data = Record<string, unknown>;
function object(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Data)
    : {};
}
function text(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const record = value as Data;
    return text(record.label ?? record.name ?? record.value);
  }
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}
function array(value: unknown): Data[] {
  return Array.isArray(value) ? value.map(object) : [];
}

export function SubmissionDetail({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const [revision, setRevision] = useState(0);
  const resource = useOverviewResource<Data>(url, revision);
  const detail = object(resource.data?.submission ?? resource.data);
  const fields = array(detail.fields);
  const timeline = array(detail.timeline);
  return (
    <section className={styles.drill} aria-label="Submission detail">
      <div className={styles.row}>
        <h3>{text(detail.number) || "Submission details"}</h3>
        <button className="btn" onClick={onClose}>
          Close details
        </button>
      </div>
      {resource.loading ? (
        <p role="status">Loading submission…</p>
      ) : resource.error ? (
        <p role="alert">
          {resource.error}{" "}
          <button className="btn" onClick={() => setRevision((r) => r + 1)}>
            Retry
          </button>
        </p>
      ) : (
        <>
          {text(detail.statusLabel) && <p>{text(detail.statusLabel)}</p>}
          {detail.recordType === "zero_sales" && (
            <p>
              {text(detail.declaredAtLabel) ||
                displayTime(text(detail.declaredAt))}{" "}
              · day locked
            </p>
          )}
          {text(detail.confirmationText) && (
            <p>{text(detail.confirmationText)}</p>
          )}
          {fields.length > 0 && (
            <dl className={styles.details}>
              {fields.map((field, i) => (
                <div key={text(field.key) || i}>
                  <dt>{text(field.label)}</dt>
                  <dd>{text(field.value) || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
          {array(detail.sections).map((section, i) => (
            <section key={i}>
              <h4>{text(section.title ?? section.label)}</h4>
              <dl className={styles.details}>
                {array(section.fields).map((field, j) => (
                  <div key={j}>
                    <dt>{text(field.label)}</dt>
                    <dd>{text(field.value) || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {array(detail.products).length > 0 && (
            <div className={styles.scroll}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {array(detail.products).map((product, i) => (
                    <tr key={i}>
                      <td>{text(product.name ?? product.productName)}</td>
                      <td>{text(product.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {timeline.length > 0 && (
            <>
              <h4>Activity</h4>
              <ol>
                {timeline.map((entry, i) => (
                  <li key={i}>
                    {text(entry.label)} ·{" "}
                    {text(object(entry.actor).name) ||
                      (entry.isSystem ? "System" : "")}
                    {text(entry.atLabel) && ` · ${text(entry.atLabel)}`}
                    {text(entry.rejectionReasonLabel ?? entry.remarks) && (
                      <p>{text(entry.rejectionReasonLabel ?? entry.remarks)}</p>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
          {detail.synced === true && <p>Synced to Server</p>}
        </>
      )}
    </section>
  );
}

export function RecordDrill({
  selection,
  period,
  scope,
  onClose,
  onChange,
  onOpenReportee,
}: {
  selection: RecordSelection;
  period: Period;
  scope: TeamScope;
  onClose: () => void;
  onChange: (selection: RecordSelection) => void;
  onOpenReportee: (id: string, name?: string) => void;
}) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [revision, setRevision] = useState(0),
    [detail, setDetail] = useState<string | null>(null);
  const url = recordDrillUrl(selection, period, scope, page, search);
  const resource = useOverviewResource<Data>(url, revision);
  const data = resource.data;
  const rows = array(
    data?.items ??
      data?.users ??
      data?.visits ??
      data?.claims ??
      data?.submissions,
  );
  const pagination = object(data?.pagination);
  const usersMode =
    !!selection.card.isFormBuilder &&
    !selection.formUserId &&
    !selection.reporteeId;
  const chips = array(data?.chips);
  return (
    <section className={styles.drill} aria-busy={resource.loading}>
      <div className={styles.row}>
        <div>
          <h2>
            {selection.card.label} ·{" "}
            {selection.card.isFormBuilder
              ? "Submitted"
              : selection.status.replaceAll("_", " ")}
          </h2>
          <p>
            Submission records
            {!selection.reporteeId &&
              ` · ${scope === "all" ? "+ Sub" : "Direct"}`}
          </p>
        </div>
        <button className="btn" onClick={onClose}>
          Close list
        </button>
      </div>
      {chips.length > 0 && (
        <div className={styles.chips}>
          {chips.map((chip) => (
            <button
              className="btn"
              key={text(chip.key)}
              aria-pressed={selection.status === chip.key}
              onClick={() => onChange({ ...selection, status: text(chip.key) })}
            >
              {text(chip.label)} {text(chip.count)}
            </button>
          ))}
        </div>
      )}
      {!selection.formUserId && !selection.reporteeId && (
        <label className={styles.search}>
          Search records
          <input
            type="search"
            maxLength={100}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
              setDetail(null);
            }}
          />
        </label>
      )}
      {resource.loading ? (
        <p role="status">Loading records…</p>
      ) : resource.error ? (
        <p role="alert">
          {resource.error}{" "}
          <button className="btn" onClick={() => setRevision((r) => r + 1)}>
            Retry
          </button>
        </p>
      ) : !rows.length ? (
        <p>{search ? "No match" : "No submissions for this selection"}</p>
      ) : (
        <>
          <div
            className={styles.scroll}
            role="region"
            aria-label={`${selection.card.label} submission records`}
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>{usersMode ? "Submissions" : "Record"}</th>
                  <th>Status</th>
                  <th>Time / Date</th>
                  <th>Store</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const owner = object(row.user ?? row);
                  const record = object(row.static ?? row);
                  const store = object(row.store ?? record.store);
                  const target = submissionDetailUrl(selection.card, row);
                  const id = text(owner.userId);
                  return (
                    <tr
                      key={
                        text(row.id ?? row.submissionId ?? row.userId) || index
                      }
                    >
                      <td>
                        {id ? (
                          <button
                            className={`btn ${styles.link}`}
                            onClick={() => onOpenReportee(id, text(owner.name))}
                          >
                            {text(owner.name)}
                          </button>
                        ) : (
                          text(owner.name)
                        )}
                        <small>{text(owner.employeeId)}</small>
                      </td>
                      <td>
                        {text(
                          row.submissionCount ??
                            record.number ??
                            record.claimNo ??
                            record.visitNo ??
                            row.title,
                        )}
                      </td>
                      <td>
                        {text(
                          row.statusLabel ??
                            record.statusLabel ??
                            object(row.status).label ??
                            record.status,
                        )}
                      </td>
                      <td>
                        {text(
                          row.submittedTimeLabel ??
                            row.lastSubmittedTimeLabel ??
                            row.checkInTimeLabel,
                        ) ||
                          displayTime(
                            text(row.submittedAt ?? row.lastSubmittedAt),
                          )}
                        <small>{text(row.salesDate ?? row.stockDate)}</small>
                      </td>
                      <td>{text(store.storeName ?? record.storeName)}</td>
                      <td>
                        {usersMode && id ? (
                          <button
                            className="btn"
                            onClick={() =>
                              onChange({ ...selection, formUserId: id })
                            }
                          >
                            View submissions
                          </button>
                        ) : target ? (
                          <button
                            className="btn"
                            onClick={() => setDetail(target)}
                          >
                            View details
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data?.pagination != null && (
            <div className={styles.row}>
              <span>
                {text(data.totalCount)} records · Page {text(pagination.page)}
              </span>
              <div>
                <button
                  className="btn"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => {
                    setPage((p) => p - 1);
                    setDetail(null);
                  }}
                >
                  Previous
                </button>{" "}
                <button
                  className="btn"
                  disabled={!pagination.hasNextPage}
                  onClick={() => {
                    setPage((p) => p + 1);
                    setDetail(null);
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {detail && (
        <SubmissionDetail
          key={detail}
          url={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}
