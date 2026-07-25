import Link from "next/link";

import {
  notFound
} from "next/navigation";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  getAdminCommunityExperiences
} from "@/lib/community";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import {
  PrintRunSheetButton
} from "./print-run-sheet-button";

import styles from "./run-sheet.module.css";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params:
    Promise<{
      id: string;
    }>;
};

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Winnipeg",
      dateStyle:
        "full",
      timeStyle:
        "short"
    }
  ).format(
    new Date(value)
  );
}

function timeLabel(
  value: string | null
): string {
  if (!value) {
    return "Flexible";
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Winnipeg",
      hour:
        "numeric",
      minute:
        "2-digit"
    }
  ).format(
    new Date(value)
  );
}

function shortReference(
  value: string
): string {
  return value
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase();
}

export default async function CommunityRunSheetPage({
  params
}: PageProps) {
  await requireVentureAdmin();

  const { id } =
    await params;

  const experiences =
    await getAdminCommunityExperiences();

  const experience =
    experiences.find(
      (item) =>
        item.id === id
    );

  if (!experience) {
    notFound();
  }

  const supabase =
    getSupabaseAdminClient();

  const [
    rsvpResult,
    checkInResult
  ] =
    await Promise.all([
      supabase
        .from(
          "community_rsvps"
        )
        .select(
          "id, user_id, attendee_count, status, attending_alone, dietary_notes, accessibility_notes, created_at"
        )
        .eq(
          "experience_id",
          experience.id
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        ),

      supabase
        .from(
          "community_check_ins"
        )
        .select(
          "rsvp_id, checked_in_at"
        )
        .eq(
          "experience_id",
          experience.id
        )
    ]);

  if (
    rsvpResult.error ||
    checkInResult.error
  ) {
    throw new Error(
      rsvpResult.error?.message ??
      checkInResult.error?.message ??
      "Could not load the run sheet."
    );
  }

  const rsvps =
    rsvpResult.data ?? [];

  const checkIns =
    new Map(
      (
        checkInResult.data ??
        []
      ).map(
        (row) => [
          row.rsvp_id,
          row.checked_in_at
        ]
      )
    );

  const userEntries =
    await Promise.all(
      rsvps.map(
        async (rsvp) => {
          const {
            data
          } =
            await supabase
              .auth
              .admin
              .getUserById(
                rsvp.user_id
              );

          return [
            rsvp.user_id,
            data.user?.email ??
              ""
          ] as const;
        }
      )
    );

  const emailByUserId =
    new Map(userEntries);

  const activeRsvps =
    rsvps.filter(
      (rsvp) =>
        [
          "confirmed",
          "attended",
          "waitlisted"
        ].includes(
          rsvp.status
        )
    );

  return (
    <main
      className={styles.page}
    >
      <nav
        className={styles.controls}
      >
        <Link href="/admin/community">
          Back to builder
        </Link>

        <PrintRunSheetButton />
      </nav>

      <header
        className={styles.hero}
      >
        <p>
          VENTURE HOST RUN SHEET
        </p>

        <h1>
          {experience.title}
        </h1>

        <div>
          <span>
            {formatDate(
              experience.startsAt
            )}
          </span>

          <span>
            {experience.neighbourhood ??
              "Winnipeg"}
          </span>

          <span>
            Capacity{" "}
            {experience.capacity}
          </span>
        </div>
      </header>

      <section
        className={styles.summary}
      >
        <article>
          <span>MEETING POINT</span>
          <strong>
            {experience.meetingPoint ??
              "Not entered"}
          </strong>
          <p>
            {experience.meetingInstructions ??
              "No meeting instructions entered."}
          </p>
        </article>

        <article>
          <span>HOST</span>
          <strong>
            {experience.hostName ??
              "Venture team"}
          </strong>
          <p>
            {experience.hostDescription ??
              "No host notes entered."}
          </p>
        </article>

        <article>
          <span>WHAT TO WATCH</span>
          <strong>
            Access and dietary needs
          </strong>
          <p>
            Review the private guest notes before the group arrives.
          </p>
        </article>
      </section>

      <section
        className={styles.section}
      >
        <header>
          <span>ITINERARY</span>
          <h2>
            The day in order
          </h2>
        </header>

        <div
          className={styles.timeline}
        >
          {experience.stops.map(
            (stop, index) => (
              <article
                key={stop.id}
              >
                <b>{index + 1}</b>

                <div>
                  <small>
                    {timeLabel(
                      stop.startsAt
                    )}
                    {stop.endsAt
                      ? `–${timeLabel(
                          stop.endsAt
                        )}`
                      : ""}
                  </small>

                  <strong>
                    {stop.listingName}
                  </strong>

                  {stop.neighbourhood ? (
                    <p>
                      {stop.neighbourhood}
                    </p>
                  ) : null}

                  {stop.notes ? (
                    <p>
                      {stop.notes}
                    </p>
                  ) : null}
                </div>
              </article>
            )
          )}
        </div>
      </section>

      <section
        className={styles.section}
      >
        <header>
          <span>GUESTS</span>
          <h2>
            Attendance and private notes
          </h2>
        </header>

        {activeRsvps.length > 0 ? (
          <div
            className={styles.guestTable}
          >
            <div
              className={styles.tableHeader}
            >
              <span>Guest</span>
              <span>People</span>
              <span>Status</span>
              <span>Private notes</span>
            </div>

            {activeRsvps.map(
              (rsvp) => (
                <article
                  key={rsvp.id}
                >
                  <div>
                    <strong>
                      {emailByUserId.get(
                        rsvp.user_id
                      ) ||
                        `User ${shortReference(
                          rsvp.user_id
                        )}`}
                    </strong>

                    <small>
                      {rsvp.attending_alone
                        ? "Arriving independently"
                        : "Arriving with someone"}
                    </small>
                  </div>

                  <span>
                    {rsvp.attendee_count}
                  </span>

                  <span>
                    {checkIns.has(
                      rsvp.id
                    )
                      ? "Checked in"
                      : rsvp.status}
                  </span>

                  <p>
                    {rsvp.dietary_notes
                      ? `Dietary: ${rsvp.dietary_notes}`
                      : ""}
                    {rsvp.dietary_notes &&
                    rsvp.accessibility_notes
                      ? " · "
                      : ""}
                    {rsvp.accessibility_notes
                      ? `Accessibility: ${rsvp.accessibility_notes}`
                      : ""}
                    {!rsvp.dietary_notes &&
                    !rsvp.accessibility_notes
                      ? "No private notes"
                      : ""}
                  </p>
                </article>
              )
            )}
          </div>
        ) : (
          <p
            className={styles.empty}
          >
            No active guests yet.
          </p>
        )}
      </section>
    </main>
  );
}
