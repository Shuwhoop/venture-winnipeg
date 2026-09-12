import { NextResponse } from "next/server";

import { getVentureAdmin } from "@/lib/auth/admin";
import {
  newsletterEditorialSections,
  type NewsletterEditorialIssue,
  type NewsletterEditorialItem,
  type NewsletterEditorialSection
} from "@/lib/newsletter/editorial-draft";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function clean(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalDate(value: unknown): string | null {
  const text = clean(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function optionalTime(value: unknown): string | null {
  const text = clean(value, 8);
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(text)
    ? text.slice(0, 5)
    : null;
}

function section(value: unknown): NewsletterEditorialSection {
  return typeof value === "string" &&
    newsletterEditorialSections.includes(value as NewsletterEditorialSection)
    ? (value as NewsletterEditorialSection)
    : "this_weekend";
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return base || `venture-issue-${Date.now()}`;
}

function parseIssue(value: unknown): NewsletterEditorialIssue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rawItems = Array.isArray(record.items) ? record.items : [];

  const items: NewsletterEditorialItem[] = rawItems
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const row = item as Record<string, unknown>;

      return {
        id: clean(row.id, 100) || undefined,
        section: section(row.section),
        title: clean(row.title, 500),
        description: clean(row.description, 5000),
        url: clean(row.url, 1000),
        imageUrl: clean(row.imageUrl, 1500),
        editorNote: clean(row.editorNote, 2000),
        eventDate: optionalDate(row.eventDate) || "",
        startTime: optionalTime(row.startTime) || "",
        endTime: optionalTime(row.endTime) || "",
        venueName: clean(row.venueName, 500),
        sortOrder:
          typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)
            ? Math.max(0, Math.round(row.sortOrder))
            : (index + 1) * 10
      };
    })
    .filter((item) => item.title);

  return {
    id: clean(record.id, 100) || undefined,
    title: clean(record.title, 500),
    subject: clean(record.subject, 140),
    preheader: clean(record.preheader, 500),
    intro: clean(record.intro, 5000),
    closingNote: clean(record.closingNote, 5000),
    items
  };
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
    .select("id,title,subject,preheader,intro,closing_note,updated_at")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (issueResult.error) {
    console.error("Editorial issue lookup failed", issueResult.error);
    return NextResponse.json(
      { error: "Venture could not load the current editorial issue." },
      { status: 500 }
    );
  }

  if (!issueResult.data) {
    return NextResponse.json({ ok: true, issue: null });
  }

  const itemsResult = await supabase
    .from("newsletter_issue_items")
    .select(
      "id,section,custom_title,custom_description,custom_url,custom_image_url,editor_note,sort_order,event_date,start_time,end_time,venue_name"
    )
    .eq("issue_id", issueResult.data.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsResult.error) {
    console.error("Editorial item lookup failed", itemsResult.error);
    return NextResponse.json(
      { error: "Venture could not load the stories in this issue." },
      { status: 500 }
    );
  }

  const issue: NewsletterEditorialIssue = {
    id: issueResult.data.id,
    title: issueResult.data.title,
    subject: issueResult.data.subject,
    preheader: issueResult.data.preheader || "",
    intro: issueResult.data.intro || "",
    closingNote: issueResult.data.closing_note || "",
    items: (itemsResult.data || []).map((item) => ({
      id: item.id,
      section: section(item.section),
      title: item.custom_title || "",
      description: item.custom_description || "",
      url: item.custom_url || "",
      imageUrl: item.custom_image_url || "",
      editorNote: item.editor_note || "",
      eventDate: item.event_date || "",
      startTime: item.start_time ? String(item.start_time).slice(0, 5) : "",
      endTime: item.end_time ? String(item.end_time).slice(0, 5) : "",
      venueName: item.venue_name || "",
      sortOrder: item.sort_order
    }))
  };

  return NextResponse.json({
    ok: true,
    issue,
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

  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const issue = parseIssue(record.issue);

  if (!issue) {
    return NextResponse.json(
      { error: "Newsletter issue content is required." },
      { status: 400 }
    );
  }

  if (!issue.title) {
    return NextResponse.json(
      { error: "Give this issue a title before saving." },
      { status: 400 }
    );
  }

  if (!issue.subject) {
    return NextResponse.json(
      { error: "Add an email subject before saving." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const issueValues = {
    title: issue.title,
    subject: issue.subject,
    preheader: issue.preheader || null,
    intro: issue.intro || null,
    closing_note: issue.closingNote || null,
    status: "draft"
  };

  let issueId = issue.id || "";

  if (issueId) {
    const updateResult = await supabase
      .from("newsletter_issues")
      .update(issueValues)
      .eq("id", issueId)
      .select("id")
      .maybeSingle();

    if (updateResult.error || !updateResult.data) {
      console.error("Editorial issue update failed", updateResult.error);
      return NextResponse.json(
        { error: "Venture could not update this issue." },
        { status: 500 }
      );
    }
  } else {
    let slug = slugify(issue.title);
    const duplicateResult = await supabase
      .from("newsletter_issues")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (duplicateResult.data) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const insertResult = await supabase
      .from("newsletter_issues")
      .insert({ ...issueValues, slug })
      .select("id")
      .single();

    if (insertResult.error || !insertResult.data) {
      console.error("Editorial issue insert failed", insertResult.error);
      return NextResponse.json(
        { error: "Venture could not create this issue." },
        { status: 500 }
      );
    }

    issueId = insertResult.data.id;
  }

  const resetResult = await supabase
    .from("newsletter_issue_items")
    .delete()
    .eq("issue_id", issueId);

  if (resetResult.error) {
    console.error("Editorial item reset failed", resetResult.error);
    return NextResponse.json(
      { error: "The issue saved, but Venture could not refresh its stories." },
      { status: 500 }
    );
  }

  if (issue.items.length) {
    const rows = issue.items.map((item, index) => ({
      issue_id: issueId,
      section: item.section,
      custom_title: item.title,
      custom_description: item.description || null,
      custom_url: item.url || null,
      custom_image_url: item.imageUrl || null,
      editor_note: item.editorNote || null,
      event_date: optionalDate(item.eventDate),
      start_time: optionalTime(item.startTime),
      end_time: optionalTime(item.endTime),
      venue_name: item.venueName || null,
      sort_order: (index + 1) * 10
    }));

    const itemsResult = await supabase
      .from("newsletter_issue_items")
      .insert(rows);

    if (itemsResult.error) {
      console.error("Editorial item save failed", itemsResult.error);
      return NextResponse.json(
        { error: "The issue saved, but Venture could not save its stories." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    issueId,
    itemCount: issue.items.length,
    message: `Issue saved with ${issue.items.length} stor${
      issue.items.length === 1 ? "y" : "ies"
    }.`
  });
}
