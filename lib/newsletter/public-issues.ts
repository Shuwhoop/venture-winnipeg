import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type PublicNewsletterIssueSummary = {
  id: string;
  title: string;
  slug: string;
  subject: string;
  preheader: string | null;
  intro: string | null;
  status: "in_progress" | "published";
  sentAt: string | null;
  updatedAt: string;
};

export type PublicNewsletterIssueItem = {
  id: string;
  section: string;
  title: string;
  description: string;
  url: string | null;
  imageUrl: string | null;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  sortOrder: number;
};

export type PublicNewsletterIssue = PublicNewsletterIssueSummary & {
  closingNote: string | null;
  items: PublicNewsletterIssueItem[];
};

type IssueRow = {
  id: string;
  title: string;
  slug: string;
  subject: string;
  preheader: string | null;
  intro: string | null;
  status: string;
  sent_at: string | null;
  updated_at: string;
  closing_note?: string | null;
};

function toSummary(row: IssueRow): PublicNewsletterIssueSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    subject: row.subject,
    preheader: row.preheader,
    intro: row.intro,
    status: row.status === "draft" ? "in_progress" : "published",
    sentAt: row.sent_at,
    updatedAt: row.updated_at,
  };
}

async function getLatestDraftRow() {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("newsletter_issues")
    .select("id,title,slug,subject,preheader,intro,status,sent_at,updated_at,closing_note")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    console.error("Public newsletter draft lookup failed", result.error);
    throw new Error("Venture could not load the current issue.");
  }

  return (result.data as IssueRow | null) ?? null;
}

export async function getPublicNewsletterIssueSummaries(): Promise<PublicNewsletterIssueSummary[]> {
  const supabase = getSupabaseAdminClient();

  const [latestDraft, sentResult] = await Promise.all([
    getLatestDraftRow(),
    supabase
      .from("newsletter_issues")
      .select("id,title,slug,subject,preheader,intro,status,sent_at,updated_at")
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .limit(24),
  ]);

  if (sentResult.error) {
    console.error("Public newsletter archive lookup failed", sentResult.error);
    throw new Error("Venture could not load the issue archive.");
  }

  const sent = ((sentResult.data || []) as IssueRow[]).map(toSummary);
  const current = latestDraft ? [toSummary(latestDraft)] : [];

  return [...current, ...sent.filter((issue) => issue.id !== latestDraft?.id)];
}

export async function getPublicNewsletterIssue(slug: string): Promise<PublicNewsletterIssue | null> {
  const supabase = getSupabaseAdminClient();

  const issueResult = await supabase
    .from("newsletter_issues")
    .select("id,title,slug,subject,preheader,intro,status,sent_at,updated_at,closing_note")
    .eq("slug", slug)
    .maybeSingle();

  if (issueResult.error) {
    console.error("Public newsletter issue lookup failed", issueResult.error);
    throw new Error("Venture could not load that issue.");
  }

  const row = (issueResult.data as IssueRow | null) ?? null;
  if (!row) return null;

  if (row.status === "draft") {
    const latestDraft = await getLatestDraftRow();
    if (!latestDraft || latestDraft.id !== row.id) return null;
  } else if (row.status !== "sent") {
    return null;
  }

  const itemsResult = await supabase
    .from("newsletter_issue_items")
    .select(
      "id,section,custom_title,custom_description,custom_url,custom_image_url,event_date,start_time,end_time,venue_name,sort_order"
    )
    .eq("issue_id", row.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsResult.error) {
    console.error("Public newsletter issue item lookup failed", itemsResult.error);
    throw new Error("Venture could not load that issue's stories.");
  }

  const items: PublicNewsletterIssueItem[] = (itemsResult.data || [])
    .filter((item) => Boolean(item.custom_title?.trim()))
    .map((item) => ({
      id: item.id,
      section: item.section,
      title: item.custom_title?.trim() || "Untitled Venture find",
      description: item.custom_description?.trim() || "",
      url: item.custom_url?.trim() || null,
      imageUrl: item.custom_image_url?.trim() || null,
      eventDate: item.event_date || null,
      startTime: item.start_time || null,
      endTime: item.end_time || null,
      venueName: item.venue_name?.trim() || null,
      sortOrder: item.sort_order ?? 0,
    }));

  return {
    ...toSummary(row),
    closingNote: row.closing_note || null,
    items,
  };
}
