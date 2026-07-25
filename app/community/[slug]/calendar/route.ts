import type { NextRequest } from "next/server";

import {
  getCommunityExperienceBySlug
} from "@/lib/community";

export const dynamic =
  "force-dynamic";

type RouteProps = {
  params:
    Promise<{
      slug: string;
    }>;
};

function icsEscape(
  value: string
): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

function icsDate(
  value: string
): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  _request: NextRequest,
  {
    params
  }: RouteProps
) {
  const { slug } =
    await params;

  const experience =
    await getCommunityExperienceBySlug(
      slug
    );

  if (!experience) {
    return new Response(
      "Community experience not found.",
      {
        status: 404
      }
    );
  }

  const description = [
    experience.summary,
    experience.meetingInstructions,
    ...experience.stops.map(
      (stop, index) =>
        `${index + 1}. ${stop.listingName}${stop.notes ? `: ${stop.notes}` : ""}`
    ),
    `Full plan: https://venture.boogiebangers.com/community/${experience.slug}`
  ]
    .filter(Boolean)
    .join("\n");

  const location =
    experience.meetingPoint ??
    experience.neighbourhood ??
    "Winnipeg";

  const end =
    experience.endsAt ??
    new Date(
      new Date(
        experience.startsAt
      ).getTime() +
        3 * 60 * 60 * 1000
    ).toISOString();

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Venture by Boogie Bangers//Community//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:community-${experience.id}@venture.boogiebangers.com`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(experience.startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(experience.title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `LOCATION:${icsEscape(location)}`,
    `URL:https://venture.boogiebangers.com/community/${experience.slug}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return new Response(
    ics,
    {
      headers: {
        "Content-Type":
          "text/calendar; charset=utf-8",
        "Content-Disposition":
          `attachment; filename="venture-${experience.slug}.ics"`,
        "Cache-Control":
          "public, max-age=300"
      }
    }
  );
}
