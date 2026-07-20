import {
  NextResponse
} from "next/server";

import {
  getAnalyticsExportRows,
  type AnalyticsExportDataset,
  type AnalyticsPeriodDays
} from "@/lib/admin/analytics-lab";
import {
  getVentureAdmin
} from "@/lib/auth/admin";

export const dynamic =
  "force-dynamic";

const ALLOWED_DATASETS =
  new Set<AnalyticsExportDataset>([
    "events",
    "sessions",
    "feedback",
    "inventory"
  ]);

function csvCell(
  value:
    | string
    | number
    | boolean
    | null
    | undefined
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text = String(value);

  if (
    /[",\n\r]/.test(text)
  ) {
    return `"${text.replaceAll(
      '"',
      '""'
    )}"`;
  }

  return text;
}

function toCsv(
  rows: Array<Record<
    string,
    string | number | boolean | null
  >>
): string {
  if (rows.length === 0) {
    return "no_data\n";
  }

  const headers =
    Array.from(
      rows.reduce(
        (set, row) => {
          for (
            const key of
            Object.keys(row)
          ) {
            set.add(key);
          }

          return set;
        },
        new Set<string>()
      )
    );

  return [
    headers
      .map(csvCell)
      .join(","),
    ...rows.map((row) =>
      headers
        .map(
          (header) =>
            csvCell(row[header])
        )
        .join(",")
    )
  ].join("\n");
}

export async function GET(
  request: Request
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator access is required."
      },
      {
        status: 401
      }
    );
  }

  const url =
    new URL(request.url);

  const rawDataset =
    url.searchParams.get("dataset");

  const dataset =
    ALLOWED_DATASETS.has(
      rawDataset as AnalyticsExportDataset
    )
      ? rawDataset as AnalyticsExportDataset
      : null;

  if (!dataset) {
    return NextResponse.json(
      {
        error:
          "Choose events, sessions, feedback, or inventory."
      },
      {
        status: 400
      }
    );
  }

  const rawDays =
    url.searchParams.get("days");

  const days:
    AnalyticsPeriodDays =
      rawDays === "7" ||
      rawDays === "90"
        ? Number(rawDays) as AnalyticsPeriodDays
        : 30;

  try {
    const rows =
      await getAnalyticsExportRows(
        dataset,
        days
      );

    const csv =
      toCsv(rows);

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    return new NextResponse(
      `\uFEFF${csv}`,
      {
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="venture-${dataset}-${days}d-${date}.csv"`,
          "Cache-Control":
            "private, no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Analytics export failed",
      error
    );

    return NextResponse.json(
      {
        error:
          "Venture could not create this analytics export."
      },
      {
        status: 500
      }
    );
  }
}
