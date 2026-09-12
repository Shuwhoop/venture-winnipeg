import { NextResponse } from "next/server";

import { getPublicNewsletterIssue } from "@/lib/newsletter/public-issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const issue = await getPublicNewsletterIssue(slug);

    if (!issue) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, issue },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Public newsletter issue detail failed", error);
    return NextResponse.json(
      { error: "Venture could not load that issue." },
      { status: 500 },
    );
  }
}
