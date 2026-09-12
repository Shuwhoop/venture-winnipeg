import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const KINDS = new Set([
  "event",
  "food",
  "nightlife",
  "culture",
  "community",
  "place",
  "other"
]);

function text(value: unknown, max: number, required = false): string | null {
  if (typeof value !== "string") return required ? null : "";
  const cleaned = value.trim();
  if ((required && !cleaned) || cleaned.length > max) return null;
  return cleaned;
}

function validEmail(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return NextResponse.json({ error: "Venture could not read that submission." }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const kind = typeof body.kind === "string" && KINDS.has(body.kind)
    ? body.kind
    : "other";
  const title = text(body.title, 200, true);
  const sourceUrl = text(body.sourceUrl, 700) ?? null;
  const note = text(body.note, 2400) ?? null;
  const submitterName = text(body.submitterName, 120, true);
  const submitterEmail = text(body.submitterEmail, 320, true);

  if (
    !title ||
    sourceUrl === null ||
    note === null ||
    !submitterName ||
    !submitterEmail ||
    !validEmail(submitterEmail) ||
    !validUrl(sourceUrl)
  ) {
    return NextResponse.json(
      { error: "Check the title, link and contact details, then try again." },
      { status: 400 }
    );
  }

  if (!sourceUrl && !note) {
    return NextResponse.json(
      { error: "Add a link or a quick note so Venture knows what to look for." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("newsletter_public_tips")
    .insert({
      kind,
      title,
      source_url: sourceUrl || null,
      note: note || null,
      submitter_name: submitterName,
      submitter_email: submitterEmail,
      status: "pending"
    })
    .select("id")
    .single();

  if (result.error || !result.data) {
    console.error("Newsletter public tip insert failed", result.error);
    return NextResponse.json(
      { error: "Venture could not save that find right now." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      reference: result.data.id.replaceAll("-", "").slice(0, 8).toUpperCase()
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
