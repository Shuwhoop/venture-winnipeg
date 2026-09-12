import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TYPES = new Set(["event", "place", "find", "other"]);

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function validUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That submission could not be read." }, { status: 400 });
  }

  if (clean(body.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const submissionType = clean(body.submissionType, 20) || "find";
  const title = clean(body.title, 180);
  const sourceUrl = clean(body.sourceUrl, 600);
  const whenText = clean(body.whenText, 180);
  const whereText = clean(body.whereText, 220);
  const whyText = clean(body.whyText, 1800);
  const submitterName = clean(body.submitterName, 150);
  const submitterEmail = clean(body.submitterEmail, 320).toLowerCase();

  if (!TYPES.has(submissionType) || !title || !whyText || !validUrl(sourceUrl) || !validEmail(submitterEmail)) {
    return NextResponse.json(
      { error: "Add a title and a quick note about why Venture should know about it. Check any link or email too." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("newsletter_public_submissions")
    .insert({
      submission_type: submissionType,
      title,
      source_url: sourceUrl || null,
      when_text: whenText || null,
      where_text: whereText || null,
      why_text: whyText,
      submitter_name: submitterName || null,
      submitter_email: submitterEmail || null
    })
    .select("id")
    .single();

  if (result.error || !result.data) {
    console.error("Newsletter public submission failed", result.error);
    return NextResponse.json({ error: "Venture could not save that find right now." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    reference: result.data.id.replaceAll("-", "").slice(0, 8).toUpperCase()
  });
}
