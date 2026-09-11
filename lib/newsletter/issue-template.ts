import "server-only";

import { ventureBrand } from "@/lib/venture-brand";

export type NewsletterIssueRecord = {
  id: string;
  title: string;
  subject: string;
  preheader: string | null;
  intro: string | null;
  closing_note: string | null;
};

export type NewsletterIssueItemRecord = {
  id: string;
  section: string;
  custom_title: string | null;
  custom_description: string | null;
  custom_url: string | null;
  sort_order: number;
};

const SECTION_LABELS: Record<string, string> = {
  the_move: "THE MOVE",
  this_weekend: "THIS WEEKEND",
  lowkey: "LOWKEY",
  new_on_venture: "NEW ON VENTURE",
  next_week: "NEXT WEEK",
  boogie_bangers: "FROM BOOGIE BANGERS",
  custom: "MORE TO KNOW"
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeAppUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function absoluteUrl(appUrl: string, value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${normalizeAppUrl(appUrl)}${value.startsWith("/") ? value : `/${value}`}`;
}

function sectionLabel(section: string): string {
  return SECTION_LABELS[section] || section.replaceAll("_", " ").toUpperCase();
}

function cardBackground(section: string): string {
  if (section === "the_move") {
    return "#fff4b8";
  }

  if (section === "lowkey") {
    return "#eaf6ff";
  }

  if (section === "next_week") {
    return "#f1e8ff";
  }

  if (section === "boogie_bangers") {
    return "#fff0f0";
  }

  return "#ffffff";
}

export function buildNewsletterIssueCampaign({
  issue,
  items,
  appUrl
}: {
  issue: NewsletterIssueRecord;
  items: NewsletterIssueItemRecord[];
  appUrl: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const unsubscribeUrl = "{{{RESEND_UNSUBSCRIBE_URL}}}";
  const postalAddress = process.env.VENTURE_POSTAL_ADDRESS?.trim() ||
    "Winnipeg, Manitoba, Canada";
  const exploreUrl = absoluteUrl(appUrl, "/explore");
  const submitUrl = absoluteUrl(appUrl, "/submit");

  let previousSection = "";
  const itemHtml = items.map((item) => {
    const title = item.custom_title?.trim() || "Untitled pick";
    const description = item.custom_description?.trim() || "";
    const url = item.custom_url?.trim()
      ? absoluteUrl(appUrl, item.custom_url.trim())
      : exploreUrl;
    const showHeading = item.section !== previousSection;
    previousSection = item.section;

    return `${showHeading ? `
      <tr>
        <td style="padding:22px 26px 7px;">
          <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(sectionLabel(item.section))}</div>
        </td>
      </tr>` : ""}
      <tr>
        <td style="padding:7px 26px;">
          <div style="padding:19px;border:2px solid #241f20;border-radius:17px;background:${cardBackground(item.section)};">
            <h2 style="margin:0;font-size:22px;line-height:1.16;letter-spacing:-.02em;">${escapeHtml(title)}</h2>
            ${description ? `<p style="margin:10px 0 0;color:#5f5556;font-size:15px;line-height:1.62;">${escapeHtml(description)}</p>` : ""}
            <a href="${escapeHtml(url)}" style="display:inline-block;margin-top:13px;color:#8d0c10;font-size:14px;font-weight:900;">See details →</a>
          </div>
        </td>
      </tr>`;
  }).join("");

  const intro = issue.intro?.trim() || "Winnipeg, edited down to the moves worth knowing about.";
  const closing = issue.closing_note?.trim() ||
    "Know something Venture should have caught? Send it in and help make the next issue sharper.";
  const preheader = issue.preheader?.trim() || intro;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(issue.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff8ef;color:#241f20;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ef;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border:2px solid #241f20;border-radius:24px;overflow:hidden;box-shadow:8px 8px 0 #edb200;">
            <tr>
              <td style="padding:24px 26px;background:#ffcf00;border-bottom:2px solid #241f20;">
                <div style="font-size:30px;font-weight:900;letter-spacing:-.05em;">Venture</div>
                <div style="margin-top:5px;color:#d01013;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">THE WEEKEND DROP</div>
              </td>
            </tr>
            <tr>
              <td style="padding:29px 26px 14px;">
                <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;">${escapeHtml(issue.title)}</div>
                <h1 style="margin:10px 0 0;font-size:38px;line-height:1.03;letter-spacing:-.05em;">Hi {{{contact.first_name|there}}}, Winnipeg is busy.</h1>
                <p style="margin:17px 0 0;color:#5f5556;font-size:17px;line-height:1.68;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            ${itemHtml}
            <tr>
              <td style="padding:19px 26px 27px;">
                <div style="padding:19px;border:2px solid #241f20;border-radius:17px;background:#ffffff;">
                  <div style="color:#d01013;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">A NOTE FROM VENTURE</div>
                  <p style="margin:9px 0 0;color:#5f5556;font-size:15px;line-height:1.65;">${escapeHtml(closing)}</p>
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                  <tr>
                    <td style="padding:5px;">
                      <a href="${escapeHtml(exploreUrl)}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background:#ffcf00;color:#241f20;font-size:15px;font-weight:900;text-align:center;text-decoration:none;">Explore Winnipeg</a>
                    </td>
                    <td style="padding:5px;">
                      <a href="${escapeHtml(submitUrl)}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background:#d01013;color:#ffffff;font-size:15px;font-weight:900;text-align:center;text-decoration:none;">Submit a find</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:21px 26px;background:#241f20;color:#ffffff;text-align:center;">
                <div style="font-size:13px;font-weight:900;">${escapeHtml(ventureBrand.fullName)}</div>
                <div style="margin-top:7px;color:#d9d0d1;font-size:12px;line-height:1.55;">${escapeHtml(postalAddress)} · ${escapeHtml(ventureBrand.replyToEmail)}</div>
                <div style="margin-top:12px;font-size:12px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#ffcf00;">Manage your email preferences or unsubscribe</a>.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textParts: string[] = [
    issue.title,
    "",
    `Hi {{{contact.first_name|there}}}, Winnipeg is busy.`,
    "",
    intro,
    ""
  ];

  let previousTextSection = "";
  for (const item of items) {
    if (item.section !== previousTextSection) {
      textParts.push(sectionLabel(item.section), "");
      previousTextSection = item.section;
    }

    textParts.push(
      item.custom_title?.trim() || "Untitled pick",
      item.custom_description?.trim() || "",
      item.custom_url?.trim() ? absoluteUrl(appUrl, item.custom_url.trim()) : exploreUrl,
      ""
    );
  }

  textParts.push(
    closing,
    "",
    `Explore Winnipeg: ${exploreUrl}`,
    `Submit a find: ${submitUrl}`,
    "",
    ventureBrand.fullName,
    postalAddress,
    ventureBrand.replyToEmail,
    `Unsubscribe: ${unsubscribeUrl}`
  );

  return {
    subject: issue.subject,
    html,
    text: textParts.join("\n")
  };
}
