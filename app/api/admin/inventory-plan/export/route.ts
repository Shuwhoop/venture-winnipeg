import { NextResponse } from "next/server";

import {
  getInventoryPlannerExportRows,
  getInventoryPlannerReport
} from "@/lib/admin/inventory-planner";
import { getVentureAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function toCsv(rows: Array<Record<string, string | number | boolean | null>>): string {
  if (rows.length === 0) {
    return "no_data\n";
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );

  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");
}

export async function GET() {
  const admin = await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 401 }
    );
  }

  try {
    const report = await getInventoryPlannerReport();
    const csv = toCsv(getInventoryPlannerExportRows(report));
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="venture-inventory-plan-${date}.csv"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    console.error("Inventory planner export failed", error);
    return NextResponse.json(
      { error: "Venture could not create the inventory planning export." },
      { status: 500 }
    );
  }
}
