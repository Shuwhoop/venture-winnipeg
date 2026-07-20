import type {
  Metadata
} from "next";

import {
  getDataPipelineLab
} from "@/lib/admin/data-pipeline";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  PipelineShell,
  pipelineStyles as styles,
  readPipelinePeriod
} from "../pipeline-shell";

export const dynamic =
  "force-dynamic";

export const metadata: Metadata = {
  title:
    "Analytics Events | Venture Admin",
  description:
    "Private Venture analytics event inspector."
};

type PageProps = {
  searchParams: Promise<{
    days?: string | string[];
  }>;
};

function formatLatency(
  value: number | null
): string {
  if (value === null) {
    return "not measured";
  }

  if (value < 0) {
    return `${Math.abs(value)} ms ahead`;
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(1)} s`;
}

export default async function PipelineEventsPage({
  searchParams
}: PageProps) {
  await requireVentureAdmin();

  const params = await searchParams;
  const periodDays =
    readPipelinePeriod(params.days);
  const lab =
    await getDataPipelineLab(periodDays);

  return (
    <PipelineShell
      active="/admin/data-pipeline/events"
      periodDays={periodDays}
      title="Event Inspector"
      intro="Inspect recent analytics payloads, event versions, ingestion latency, environment labels, and any quality flags without exposing this data publicly."
      migrationRequired={
        lab.migrationRequired
      }
      truncated={lab.truncated}
    >
      {lab.error ? (
        <section className={styles.error}>
          {lab.error}
        </section>
      ) : null}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.kicker}>
              EVENT MIX
            </p>
            <h2>Most common events</h2>
            <p className={styles.cardCopy}>
              Counts are based on the selected period. The inspector below shows the 80 most recent records.
            </p>
          </div>
        </div>

        {lab.eventNames.length === 0 ? (
          <p className={styles.empty}>
            No events have arrived in this period.
          </p>
        ) : (
          <div className={styles.barList}>
            {lab.eventNames
              .slice(0, 12)
              .map((event) => (
                <div
                  className={styles.barRow}
                  key={event.name}
                >
                  <span>{event.name}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width:
                          `${event.percentage}%`
                      }}
                    />
                  </div>
                  <strong>
                    {event.events} · {event.percentage}%
                  </strong>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className={styles.stack}>
        {lab.recent.length === 0 ? (
          <article className={styles.card}>
            <h2>No events yet</h2>
            <p className={styles.cardCopy}>
              Use the pipeline test on the Overview page or browse Venture in a normal session.
            </p>
          </article>
        ) : (
          lab.recent.map((event) => (
            <article
              className={styles.eventCard}
              key={event.id}
            >
              <div className={styles.eventHeader}>
                <div>
                  <p className={styles.kicker}>
                    EVENT #{event.id}
                  </p>
                  <h2>{event.eventName}</h2>
                  <p className={styles.eventPath}>
                    {event.pagePath}
                  </p>
                </div>

                <time
                  className={styles.muted}
                  dateTime={event.createdAt}
                >
                  {new Date(
                    event.createdAt
                  ).toLocaleString()}
                </time>
              </div>

              <div className={styles.badges}>
                <span className={styles.badge}>
                  v{event.eventVersion}
                </span>
                <span className={styles.badge}>
                  {event.environment}
                </span>
                <span className={styles.badge}>
                  {event.source}
                </span>
                <span className={styles.badge}>
                  {formatLatency(
                    event.latencyMs
                  )}
                </span>
              </div>

              {event.issues.length > 0 ? (
                <div className={styles.issueBadges}>
                  {event.issues.map((item) => (
                    <span
                      key={item.code}
                      className={`${styles.issueBadge} ${
                        item.severity === "error"
                          ? styles.errorBadge
                          : item.severity === "info"
                            ? styles.infoBadge
                            : ""
                      }`}
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              ) : (
                <div className={styles.badges}>
                  <span className={styles.badge}>
                    No quality flags
                  </span>
                </div>
              )}

              <div className={styles.eventMeta}>
                <span>
                  Session: <code>{event.sessionId}</code>
                </span>
                <span>
                  Visitor: <code>{event.visitorId || "missing"}</code>
                </span>
                <span>
                  Client time: <code>{event.clientCreatedAt || "not supplied"}</code>
                </span>
              </div>

              <details className={styles.details}>
                <summary>
                  Inspect properties
                </summary>
                <pre>
                  {JSON.stringify(
                    event.properties,
                    null,
                    2
                  )}
                </pre>
              </details>
            </article>
          ))
        )}
      </section>

      <section className={styles.exportActions}>
        <a
          href={`/api/admin/data-pipeline/export?dataset=events&days=${periodDays}`}
        >
          Export inspected events CSV
        </a>
      </section>
    </PipelineShell>
  );
}
