import { NextResponse } from "next/server";

import { getPublicNewsletterIssueSummaries } from "@/lib/newsletter/public-issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const issues = await getPublicNewsletterIssueSummaries();

    return NextResponse.json(
      { ok: true, issues },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Public newsletter issue feed failed", error);
    return NextResponse.json(
      { error: "Venture could not load the public issue feed." },
      { status: 500 },
    );
  }
}
