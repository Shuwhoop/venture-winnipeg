"use client";

import Link from "next/link";

import {
  useEffect,
  useState
} from "react";

import {
  getSupabaseBrowserClient
} from "@/lib/supabase/client";

import styles from "./community-rsvp-dashboard.module.css";

type DashboardItem = {
  id: string;
  experienceId: string;
  attendeeCount: number;
  status: string;
  startsAt: string;
  title: string;
  slug: string;
  neighbourhood: string | null;
};

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Winnipeg",
      weekday:
        "short",
      month:
        "short",
      day:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit"
    }
  ).format(
    new Date(value)
  );
}

export function CommunityRsvpDashboard() {
  const [
    items,
    setItems
  ] =
    useState<DashboardItem[]>([]);

  const [
    status,
    setStatus
  ] =
    useState<
      "loading" |
      "guest" |
      "ready" |
      "unavailable"
    >("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const supabase =
          getSupabaseBrowserClient();

        const {
          data:
            userData
        } =
          await supabase
            .auth
            .getUser();

        const user =
          userData.user;

        if (!user) {
          if (active) {
            setStatus("guest");
          }

          return;
        }

        const {
          data:
            rsvpRows,
          error:
            rsvpError
        } =
          await supabase
            .from(
              "community_rsvps"
            )
            .select(
              "id, experience_id, attendee_count, status"
            )
            .eq(
              "user_id",
              user.id
            )
            .neq(
              "status",
              "cancelled"
            )
            .order(
              "created_at",
              {
                ascending:
                  false
              }
            );

        if (rsvpError) {
          throw rsvpError;
        }

        const rows =
          rsvpRows ?? [];

        const experienceIds =
          Array.from(
            new Set(
              rows.map(
                (row) =>
                  row.experience_id
              )
            )
          );

        if (
          experienceIds.length ===
          0
        ) {
          if (active) {
            setItems([]);
            setStatus("ready");
          }

          return;
        }

        const {
          data:
            experienceRows,
          error:
            experienceError
        } =
          await supabase
            .from(
              "community_experiences"
            )
            .select(
              "id, title, slug, starts_at, neighbourhood"
            )
            .in(
              "id",
              experienceIds
            );

        if (experienceError) {
          throw experienceError;
        }

        const experienceMap =
          new Map(
            (
              experienceRows ??
              []
            ).map(
              (experience) => [
                experience.id,
                experience
              ]
            )
          );

        const nextItems =
          rows.flatMap(
            (row) => {
              const experience =
                experienceMap.get(
                  row.experience_id
                );

              if (!experience) {
                return [];
              }

              return [
                {
                  id:
                    row.id,
                  experienceId:
                    row.experience_id,
                  attendeeCount:
                    row.attendee_count,
                  status:
                    row.status,
                  startsAt:
                    experience.starts_at,
                  title:
                    experience.title,
                  slug:
                    experience.slug,
                  neighbourhood:
                    experience.neighbourhood
                }
              ];
            }
          );

        if (active) {
          setItems(nextItems);
          setStatus("ready");
        }
      } catch {
        if (active) {
          setStatus(
            "unavailable"
          );
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (
    status === "loading"
  ) {
    return (
      <section
        className={
          styles.panel
        }
      >
        <span>
          VENTURE IS BUILDING
        </span>
        <h2>
          Loading community plans
        </h2>
      </section>
    );
  }

  if (
    status ===
    "unavailable"
  ) {
    return null;
  }

  return (
    <section
      className={
        styles.panel
      }
      id="community-plans"
    >
      <header>
        <div>
          <span>
            VENTURE IS BUILDING
          </span>
          <h2>
            My community plans
          </h2>
          <p>
            Monthly Venture experiences you
            have confirmed or joined the
            waitlist for.
          </p>
        </div>

        <Link href="/community">
          Explore
        </Link>
      </header>

      {status === "guest" ? (
        <div
          className={
            styles.empty
          }
        >
          <strong>
            Sign in to keep community RSVPs
          </strong>
          <p>
            Guest discovery remains open.
            An account is only needed when
            you reserve a space.
          </p>
          <Link
            href="/sign-in?next=/profile"
          >
            Sign in
          </Link>
        </div>
      ) : items.length > 0 ? (
        <div
          className={
            styles.list
          }
        >
          {items.map(
            (item) => (
              <Link
                className={
                  styles.item
                }
                href={`/community/${item.slug}`}
                key={item.id}
              >
                <div>
                  <small>
                    {formatDate(
                      item.startsAt
                    )}
                  </small>

                  <strong>
                    {item.title}
                  </strong>

                  <p>
                    {item.neighbourhood ??
                      "Winnipeg"}
                    {" · "}
                    {
                      item.attendeeCount
                    }{" "}
                    {
                      item.attendeeCount ===
                      1
                        ? "person"
                        : "people"
                    }
                  </p>
                </div>

                <span>
                  {item.status}
                </span>
              </Link>
            )
          )}
        </div>
      ) : (
        <div
          className={
            styles.empty
          }
        >
          <strong>
            No community plans yet
          </strong>
          <p>
            The next monthly Venture build
            will appear here after you RSVP.
          </p>
          <Link href="/community">
            See what Venture is building
          </Link>
        </div>
      )}
    </section>
  );
}
