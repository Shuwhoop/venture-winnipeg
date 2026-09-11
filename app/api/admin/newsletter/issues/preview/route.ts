import { NextResponse } from "next/server";

import { getVentureAdmin } from "@/lib/auth/admin";
import {
  buildNewsletterIssueCampaign,
  type NewsletterIssueItemRecord,
  type NewsletterIssueRecord
} from "@/lib/newsletter/issue-template";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function previewError(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Venture newsletter preview</title></head><body style="margin:0;padding:32px;background:#fff8ef;color:#241f20;font-family:Arial,Helvetica,sans-serif"><main style="max-width:680px;margin:0 auto;padding:24px;border:2px solid #241f20;border-radius:20px;background:#fff"><strong style="color:#d01013">VENTURE EDITORIAL PREVIEW</strong><h1 style="margin:10px 0 0">Preview unavailable</h1><p style="line-height:1.6">${message}</p></main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function GET(request: Request) {
  const admin = await getVentureAdmin();

  if (!admin) {
    return previewError("Administrator access is required.", 401);
  }

  const supabase = getSupabaseAdminClient();
  const issueResult = await supabase
    .from("newsletter_issues")
    .select("id,title,subject,preheader,intro,closing_note")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (issueResult.error || !issueResult.data) {
    console.error("Newsletter editorial preview issue lookup failed", issueResult.error);
    return previewError("Venture could not find a saved draft issue.", 404);
  }

  const itemsResult = await supabase
    .from("newsletter_issue_items")
    .select("id,section,custom_title,custom_description,custom_url,sort_order")
    .eq("issue_id", issueResult.data.id)
    .order("sort_order", { ascending: true });

  if (itemsResult.error || !itemsResult.data?.length) {
    console.error("Newsletter editorial preview item lookup failed", itemsResult.error);
    return previewError("The latest saved issue has no editorial picks yet.", 409);
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const campaign = buildNewsletterIssueCampaign({
    issue: issueResult.data as NewsletterIssueRecord,
    items: itemsResult.data as NewsletterIssueItemRecord[],
    appUrl
  });

  const previewBanner = `<div style="max-width:680px;margin:0 auto 14px;padding:12px 16px;border:2px solid #241f20;border-radius:14px;background:#ffcf00;color:#241f20;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:900;text-align:center">EDITORIAL PREVIEW · ${itemsResult.data.length} CURATED PICKS · NOTHING HAS BEEN SENT</div>`;

  const html = campaign.html
    .replaceAll("{{{contact.first_name|there}}}", "there")
    .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", `${appUrl.replace(/\/$/, "")}/newsletter`)
    .replace(/(<body[^>]*>)/i, `$1${previewBanner}`);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}
