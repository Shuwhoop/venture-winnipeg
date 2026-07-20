import { NextResponse } from "next/server";

import { previewInventoryImport } from "@/lib/admin/inventory-import";
import type { InventoryImportEntityType } from "@/lib/admin/inventory-import-types";
import { getVentureAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function parseEntityType(value: unknown): InventoryImportEntityType | null {
  return value === "place" || value === "event" ? value : null;
}

export async function POST(request: Request) {
  const admin = await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 401 }
    );
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "The import request did not come from Venture." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "The import preview request could not be read." },
      { status: 400 }
    );
  }

  const entityType = parseEntityType(body.entityType);
  const filename =
    typeof body.filename === "string"
      ? body.filename.trim().slice(0, 250)
      : "venture-import.csv";
  const csvText = typeof body.csvText === "string" ? body.csvText : "";

  if (!entityType) {
    return NextResponse.json(
      { error: "Choose whether the CSV contains places or events." },
      { status: 400 }
    );
  }

  if (!csvText.trim()) {
    return NextResponse.json(
      { error: "Choose a CSV file before previewing the import." },
      { status: 400 }
    );
  }

  try {
    const preview = await previewInventoryImport({
      entityType,
      filename,
      csvText
    });

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    console.error("Inventory import preview failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Venture could not preview this CSV."
      },
      { status: 400 }
    );
  }
}
