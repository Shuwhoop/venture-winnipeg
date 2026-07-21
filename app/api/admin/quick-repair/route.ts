import { NextResponse } from "next/server";

import { updateQuickRepairs } from "@/lib/admin/quick-repair";
import type { QuickRepairChange } from "@/lib/admin/quick-repair-types";
import { getVentureAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
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
      { error: "The repair request did not come from Venture." },
      { status: 403 }
    );
  }

  let body: { changes?: QuickRepairChange[] };

  try {
    body = (await request.json()) as { changes?: QuickRepairChange[] };
  } catch {
    return NextResponse.json(
      { error: "The repair request could not be read." },
      { status: 400 }
    );
  }

  try {
    const result = await updateQuickRepairs({
      changes: Array.isArray(body.changes) ? body.changes : [],
      admin
    });

    return NextResponse.json(result, {
      status: result.failed > 0 ? 207 : 200,
      headers: {
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    console.error("Quick repair failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Venture could not save these repairs."
      },
      { status: 400 }
    );
  }
}
