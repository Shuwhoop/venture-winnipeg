import { NextResponse } from "next/server";

import { getVentureAdmin } from "@/lib/auth/admin";
import {
  buildNewsletterIssueCampaign,
  type NewsletterIssueItemRecord,
  type NewsletterIssueRecord
} from "@/lib/newsletter/issue-template";
import { sendNewsletterEmail } from "@/lib/newsletter/resend";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getVentureAdmin();
  if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 401 });

  const supabase = getSupabaseAdminClient();
  const issueResult = await supabase.from("newsletter_issues")
    .select("id,title,subject,preheader,intro,closing_note")
    .eq("status", "draft").order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (issueResult.error || !issueResult.data) {
    console.error("Newsletter editorial test issue lookup failed", issueResult.error);
    return NextResponse.json({ error: "Venture could not find a saved draft issue." }, { status: 404 });
  }

  const itemsResult = await supabase.from("newsletter_issue_items")
    .select("id,section,custom_title,custom_description,custom_url,custom_image_url,event_date,start_time,end_time,venue_name,sort_order")
    .eq("issue_id", issueResult.data.id).order("sort_order", { ascending: true });

  if (itemsResult.error || !itemsResult.data?.length) {
    console.error("Newsletter editorial test item lookup failed", itemsResult.error);
    return NextResponse.json({ error: "The latest saved issue has no editorial picks yet." }, { status: 409 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const campaign = buildNewsletterIssueCampaign({
    issue: issueResult.data as NewsletterIssueRecord,
    items: itemsResult.data as NewsletterIssueItemRecord[],
    appUrl
  });

  const safeHtml = campaign.html.replaceAll("{{{contact.first_name|there}}}", "there")
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", `${appUrl.replace(/\/$/, "")}/newsletter`);
  const safeText = campaign.text.replaceAll("{{{contact.first_name|there}}}", "there")
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", `${appUrl.replace(/\/$/, "")}/newsletter`);

  const result = await sendNewsletterEmail({
    to: admin.email,
    subject: `[TEST] ${campaign.subject}`,
    html: safeHtml,
    text: safeText
  });

  if (!result.id) return NextResponse.json({ error: result.error || "The editorial test email could not be sent." }, { status: 502 });

  return NextResponse.json({
    ok: true,
    emailId: result.id,
    message: `Full editorial test sent to ${admin.email} with ${itemsResult.data.length} curated picks.`
  });
}
