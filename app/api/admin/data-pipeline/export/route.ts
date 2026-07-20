import {
  NextResponse
} from "next/server";

import {
  getPipelineExportRows,
  type PipelineExportDataset,
  type PipelinePeriodDays
} from "@/lib/admin/data-pipeline";
import {
  getVentureAdmin
} from "@/lib/auth/admin";

export const dynamic =
  "force-dynamic";

const DATASETS = new Set<PipelineExportDataset>([
  "events",
  "suspicious"
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

  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
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

  const headers = Array.from(
    rows.reduce(
      (set, row) => {
        Object.keys(row).forEach(
          (key) => set.add(key)
        );
        return set;
      },
      new Set<string>()
    )
  );

  return [
    headers.map(csvCell).join(","),
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
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const rawDataset =
    url.searchParams.get("dataset");
  const dataset = DATASETS.has(
    rawDataset as PipelineExportDataset
  )
    ? rawDataset as PipelineExportDataset
    : null;

  if (!dataset) {
    return NextResponse.json(
      {
        error:
          "Choose events or suspicious."
      },
      { status: 400 }
    );
  }

  const rawDays =
    url.searchParams.get("days");
  const days: PipelinePeriodDays =
    rawDays === "1" || rawDays === "7"
      ? Number(rawDays) as PipelinePeriodDays
      : 30;

  try {
    const rows =
      await getPipelineExportRows(
        dataset,
        days
      );
    const csv = toCsv(rows);
    const date = new Date()
      .toISOString()
      .slice(0, 10);

    return new NextResponse(
      `\uFEFF${csv}`,
      {
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",
          "Content-Disposition":
            `attachment; filename="venture-pipeline-${dataset}-${days}d-${date}.csv"`,
          "Cache-Control":
            "private, no-store"
        }
      }
    );
  } catch (error) {
    console.error(
      "Pipeline export failed",
      error
    );

    return NextResponse.json(
      {
        error:
          "Venture could not create this pipeline export."
      },
      { status: 500 }
    );
  }
}
