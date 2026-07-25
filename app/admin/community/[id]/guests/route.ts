import type { NextRequest } from "next/server";

import {
  getVentureAdmin
} from "@/lib/auth/admin";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

type RouteProps = {
  params:
    Promise<{
      id: string;
    }>;
};

function csvCell(
  value: unknown
): string {
  const text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
}

function safeFilename(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 80) ||
    "venture-community";
}

export async function GET(
  _request: NextRequest,
  {
    params
  }: RouteProps
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return new Response(
      "Admin access required.",
      {
        status: 401
      }
    );
  }

  const { id } =
    await params;

  const supabase =
    getSupabaseAdminClient();

  const [
    experienceResult,
    rsvpResult,
    checkInResult
  ] =
    await Promise.all([
      supabase
        .from(
          "community_experiences"
        )
        .select(
          "id, title, starts_at"
        )
        .eq("id", id)
        .single(),

      supabase
        .from(
          "community_rsvps"
        )
        .select(
          "id, user_id, attendee_count, status, attending_alone, dietary_notes, accessibility_notes, created_at"
        )
        .eq(
          "experience_id",
          id
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
          id
        )
    ]);

  if (
    experienceResult.error ||
    !experienceResult.data
  ) {
    return new Response(
      "Community experience not found.",
      {
        status: 404
      }
    );
  }

  if (
    rsvpResult.error ||
    checkInResult.error
  ) {
    return new Response(
      rsvpResult.error?.message ??
      checkInResult.error?.message ??
      "Could not export guests.",
      {
        status: 500
      }
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

  const header = [
    "email",
    "user_reference",
    "attendees",
    "status",
    "attending_alone",
    "dietary_notes",
    "accessibility_notes",
    "rsvp_created_at",
    "checked_in_at"
  ];

  const rows =
    rsvps.map(
      (rsvp) => [
        emailByUserId.get(
          rsvp.user_id
        ) ?? "",
        rsvp.user_id,
        rsvp.attendee_count,
        rsvp.status,
        rsvp.attending_alone
          ? "yes"
          : "no",
        rsvp.dietary_notes,
        rsvp.accessibility_notes,
        rsvp.created_at,
        checkIns.get(rsvp.id) ??
          ""
      ]
    );

  const csv =
    [
      header,
      ...rows
    ]
      .map(
        (row) =>
          row
            .map(csvCell)
            .join(",")
      )
      .join("\r\n");

  const filename =
    `${safeFilename(
      experienceResult.data.title
    )}-guests.csv`;

  return new Response(
    `\uFEFF${csv}`,
    {
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="${filename}"`,
        "Cache-Control":
          "private, no-store"
      }
    }
  );
}
