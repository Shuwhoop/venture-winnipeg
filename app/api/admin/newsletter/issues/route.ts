import { NextResponse } from "next/server";

import { getVentureAdmin } from "@/lib/auth/admin";
import { parseVentureNewsletterDraft } from "@/lib/newsletter/campaign-input";
import type { VentureNewsletterDraft } from "@/lib/newsletter/campaign-draft";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function slugifyIssueLabel(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return base || "venture-newsletter-draft";
}

function itemValue(
  items: Array<{
    section: string;
    custom_title: string | null;
    custom_description: string | null;
    custom_url: string | null;
    editor_note: string | null;
  }>,
  section: string,
  note?: string
) {
  return items.find((item) => {
    if (item.section !== section) {
      return false;
    }

    return note ? item.editor_note === note : true;
  });
}

export async function GET() {
  const admin = await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdminClient();

  const issueResult = await supabase
    .from("newsletter_issues")
    .select(
      "id,title,slug,subject,preheader,intro,closing_note,updated_at"
    )
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (issueResult.error) {
    console.error("Newsletter draft lookup failed", issueResult.error);

    return NextResponse.json(
      { error: "Venture could not load the latest saved draft." },
      { status: 500 }
    );
  }

  if (!issueResult.data) {
    return NextResponse.json({ ok: true, draft: null });
  }

  const itemsResult = await supabase
    .from("newsletter_issue_items")
    .select(
      "section,custom_title,custom_description,custom_url,editor_note,sort_order"
    )
    .eq("issue_id", issueResult.data.id)
    .order("sort_order", { ascending: true });

  if (itemsResult.error) {
    console.error("Newsletter draft item lookup failed", itemsResult.error);

    return NextResponse.json(
      { error: "Venture could not load the saved draft content." },
      { status: 500 }
    );
  }

  const items = itemsResult.data || [];
  const venturePick = itemValue(items, "the_move");
  const weekend = itemValue(items, "this_weekend");
  const budget = itemValue(items, "custom", "budget");

  const draft: VentureNewsletterDraft = {
    issueLabel: issueResult.data.title,
    subject: issueResult.data.subject,
    preheader: issueResult.data.preheader || "",
    intro: issueResult.data.intro || "",
    venturePickTitle: venturePick?.custom_title || "",
    venturePickBody: venturePick?.custom_description || "",
    venturePickUrl: venturePick?.custom_url || "",
    weekendTitle: weekend?.custom_title || "",
    weekendBody: weekend?.custom_description || "",
    weekendUrl: weekend?.custom_url || "",
    budgetTitle: budget?.custom_title || "",
    budgetBody: budget?.custom_description || "",
    budgetUrl: budget?.custom_url || "",
    closingNote: issueResult.data.closing_note || ""
  };

  return NextResponse.json({
    ok: true,
    draft,
    issueId: issueResult.data.id,
    slug: issueResult.data.slug,
    savedAt: issueResult.data.updated_at
  });
}

export async function POST(request: Request) {
  const admin = await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  const parsed = parseVentureNewsletterDraft(record.draft);

  if (!parsed.draft) {
    return NextResponse.json(
      {
        error: parsed.errors[0] || "Newsletter content is incomplete.",
        details: parsed.errors
      },
      { status: 400 }
    );
  }

  const draft = parsed.draft;
  const slug = slugifyIssueLabel(draft.issueLabel);
  const supabase = getSupabaseAdminClient();

  const existingResult = await supabase
    .from("newsletter_issues")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingResult.error) {
    console.error("Newsletter draft lookup before save failed", existingResult.error);

    return NextResponse.json(
      { error: "Venture could not prepare this issue for saving." },
      { status: 500 }
    );
  }

  const issueValues = {
    title: draft.issueLabel,
    slug,
    subject: draft.subject,
    preheader: draft.preheader || null,
    intro: draft.intro || null,
    closing_note: draft.closingNote || null,
    status: "draft"
  };

  let issueId: string;

  if (existingResult.data) {
    const updateResult = await supabase
      .from("newsletter_issues")
      .update(issueValues)
      .eq("id", existingResult.data.id)
      .select("id")
      .single();

    if (updateResult.error || !updateResult.data) {
      console.error("Newsletter draft update failed", updateResult.error);

      return NextResponse.json(
        { error: "Venture could not update this newsletter draft." },
        { status: 500 }
      );
    }

    issueId = updateResult.data.id;
  } else {
    const insertResult = await supabase
      .from("newsletter_issues")
      .insert(issueValues)
      .select("id")
      .single();

    if (insertResult.error || !insertResult.data) {
      console.error("Newsletter draft insert failed", insertResult.error);

      return NextResponse.json(
        { error: "Venture could not save this newsletter draft." },
        { status: 500 }
      );
    }

    issueId = insertResult.data.id;
  }

  const deleteResult = await supabase
    .from("newsletter_issue_items")
    .delete()
    .eq("issue_id", issueId);

  if (deleteResult.error) {
    console.error("Newsletter draft item reset failed", deleteResult.error);

    return NextResponse.json(
      { error: "The issue saved, but Venture could not refresh its sections." },
      { status: 500 }
    );
  }

  const items = [
    {
      issue_id: issueId,
      section: "the_move",
      custom_title: draft.venturePickTitle,
      custom_description: draft.venturePickBody,
      custom_url: draft.venturePickUrl,
      editor_note: "venture-pick",
      sort_order: 0
    },
    {
      issue_id: issueId,
      section: "this_weekend",
      custom_title: draft.weekendTitle,
      custom_description: draft.weekendBody,
      custom_url: draft.weekendUrl,
      editor_note: "weekend",
      sort_order: 0
    },
    {
      issue_id: issueId,
      section: "custom",
      custom_title: draft.budgetTitle,
      custom_description: draft.budgetBody,
      custom_url: draft.budgetUrl,
      editor_note: "budget",
      sort_order: 0
    }
  ];

  const itemsResult = await supabase
    .from("newsletter_issue_items")
    .insert(items);

  if (itemsResult.error) {
    console.error("Newsletter draft item save failed", itemsResult.error);

    return NextResponse.json(
      { error: "The issue saved, but Venture could not save its sections." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    issueId,
    slug,
    message: "Draft saved to Venture."
  });
}
