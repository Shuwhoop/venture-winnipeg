import { NextResponse } from "next/server";

import { getVentureAdmin } from "@/lib/auth/admin";
import {
  buildNewsletterIssueCampaign,
  type NewsletterIssueItemRecord,
  type NewsletterIssueRecord
} from "@/lib/newsletter/issue-template";
import { ensureNewsletterResources } from "@/lib/newsletter/production";
import {
  createResendBroadcastDraft,
  isNewsletterPostalAddressConfigured
} from "@/lib/newsletter/resend";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getVentureAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });

  if (!isNewsletterPostalAddressConfigured()) {
    return NextResponse.json({ error: "Add VENTURE_POSTAL_ADDRESS before creating a public campaign draft." }, { status: 409 });
  }

  const supabase = getSupabaseAdminClient();
  const issueResult = await supabase.from("newsletter_issues")
    .select("id,title,subject,preheader,intro,closing_note,resend_broadcast_id")
    .eq("status", "draft").order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (issueResult.error || !issueResult.data) {
    console.error("Newsletter editorial issue lookup failed", issueResult.error);
    return NextResponse.json({ error: "Venture could not find a saved draft issue." }, { status: 404 });
  }

  if (issueResult.data.resend_broadcast_id) {
    return NextResponse.json({ error: "This saved issue already has a Resend draft. Review that draft instead of creating a duplicate." }, { status: 409 });
  }

  const itemsResult = await supabase.from("newsletter_issue_items")
    .select("id,section,custom_title,custom_description,custom_url,custom_image_url,event_date,start_time,end_time,venue_name,sort_order")
    .eq("issue_id", issueResult.data.id).order("sort_order", { ascending: true });

  if (itemsResult.error || !itemsResult.data?.length) {
    console.error("Newsletter editorial item lookup failed", itemsResult.error);
    return NextResponse.json({ error: "The saved issue has no editorial picks yet." }, { status: 409 });
  }

  const resources = await ensureNewsletterResources();
  if (resources.error || !resources.segment || !resources.topic) {
    return NextResponse.json({ error: resources.error || "Newsletter audience resources are incomplete." }, { status: 502 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const campaign = buildNewsletterIssueCampaign({
    issue: issueResult.data as NewsletterIssueRecord,
    items: itemsResult.data as NewsletterIssueItemRecord[],
    appUrl
  });

  const broadcast = await createResendBroadcastDraft({
    segmentId: resources.segment.id,
    topicId: resources.topic.id,
    name: issueResult.data.title,
    subject: campaign.subject,
    html: campaign.html,
    text: campaign.text
  });

  if (!broadcast.id) return NextResponse.json({ error: broadcast.error || "Resend could not create the editorial draft." }, { status: 502 });

  const updateResult = await supabase.from("newsletter_issues")
    .update({ resend_broadcast_id: broadcast.id }).eq("id", issueResult.data.id);
  if (updateResult.error) console.error("Newsletter broadcast id save failed", updateResult.error);

  return NextResponse.json({
    ok: true,
    broadcastId: broadcast.id,
    message: `Resend draft created from ${itemsResult.data.length} curated Venture picks. Review it in Resend before sending.`
  });
}
