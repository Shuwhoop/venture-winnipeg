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
  custom_image_url: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
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

const SECTION_KICKERS: Record<string, string> = {
  the_move: "★ if you do one thing",
  this_weekend: "↳ fill the calendar",
  lowkey: "☁ slower / cheaper / stranger",
  new_on_venture: "✦ fresh on our radar",
  next_week: "→ keep this one",
  boogie_bangers: "BB",
  custom: "+ one more thing"
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
  if (/^https?:\/\//i.test(value)) return value;
  return `${normalizeAppUrl(appUrl)}${value.startsWith("/") ? value : `/${value}`}`;
}

function sectionLabel(section: string): string {
  return SECTION_LABELS[section] || section.replaceAll("_", " ").toUpperCase();
}

function sectionKicker(section: string): string {
  return SECTION_KICKERS[section] || "Venture edit";
}

function cardBackground(section: string): string {
  if (section === "the_move") return "#fff0a8";
  if (section === "lowkey") return "#e9f7ff";
  if (section === "next_week") return "#f1e8ff";
  if (section === "boogie_bangers") return "#ffe7e7";
  return "#fffdf8";
}

function sectionBackground(section: string): string {
  if (section === "the_move") return "#ffcf00";
  if (section === "lowkey") return "#dff3ff";
  if (section === "next_week") return "#eadcff";
  if (section === "boogie_bangers") return "#ffd9d9";
  return "#ffd6b3";
}

function formatDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTime(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const shownHour = hour % 12 || 12;
  return `${shownHour}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${suffix}`;
}

function itemMeta(item: NewsletterIssueItemRecord): string {
  const parts: string[] = [];
  const date = formatDate(item.event_date);
  const start = formatTime(item.start_time);
  const end = formatTime(item.end_time);
  if (date) parts.push(date);
  if (start) parts.push(end ? `${start}–${end}` : start);
  if (item.venue_name?.trim()) parts.push(item.venue_name.trim());
  return parts.join(" · ");
}

export function buildNewsletterIssueCampaign({
  issue,
  items,
  appUrl
}: {
  issue: NewsletterIssueRecord;
  items: NewsletterIssueItemRecord[];
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const unsubscribeUrl = "{{{RESEND_UNSUBSCRIBE_URL}}}";
  const postalAddress = process.env.VENTURE_POSTAL_ADDRESS?.trim() || "Winnipeg, Manitoba, Canada";
  const newsletterUrl = absoluteUrl(appUrl, "/newsletter");
  const submitUrl = absoluteUrl(appUrl, "/submit");

  let previousSection = "";
  let storyNumber = 0;
  const itemHtml = items.map((item) => {
    storyNumber += 1;
    const title = item.custom_title?.trim() || "Untitled pick";
    const description = item.custom_description?.trim() || "";
    const meta = itemMeta(item);
    const imageUrl = item.custom_image_url?.trim() || "";
    const url = item.custom_url?.trim() ? absoluteUrl(appUrl, item.custom_url.trim()) : newsletterUrl;
    const showHeading = item.section !== previousSection;
    previousSection = item.section;

    return `${showHeading ? `
      <tr>
        <td bgcolor="${sectionBackground(item.section)}" style="padding:18px 26px 14px;background-color:${sectionBackground(item.section)};border-top:2px solid #241f20;border-bottom:2px solid #241f20;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#d01013;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;">${escapeHtml(sectionLabel(item.section))}</td>
              <td align="right" style="font-family:Georgia,serif;font-size:12px;line-height:16px;color:#241f20;font-style:italic;">${escapeHtml(sectionKicker(item.section))}</td>
            </tr>
          </table>
        </td>
      </tr>` : ""}
      <tr>
        <td style="padding:10px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${cardBackground(item.section)}" style="background-color:${cardBackground(item.section)};border:2px solid #241f20;border-radius:18px;overflow:hidden;">
            ${imageUrl ? `<tr><td style="padding:0;"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" width="628" height="330" border="0" style="display:block;width:100%;height:330px;object-fit:cover;border:0;" /></td></tr>` : ""}
            <tr>
              <td style="padding:19px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;color:#d01013;font-weight:900;letter-spacing:1px;text-transform:uppercase;">${meta ? escapeHtml(meta) : `VENTURE PICK ${String(storyNumber).padStart(2, "0")}`}</td>
                    <td align="right" style="font-family:Georgia,serif;font-size:12px;line-height:15px;color:#6d5f60;font-style:italic;">#${String(storyNumber).padStart(2, "0")}</td>
                  </tr>
                </table>
                <h2 style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:28px;color:#241f20;font-weight:900;letter-spacing:-0.6px;">${escapeHtml(title)}</h2>
                ${description ? `<p style="margin:11px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5f5556;">${escapeHtml(description)}</p>` : ""}
                <a href="${escapeHtml(url)}" style="display:inline-block;margin-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;color:#8d0c10;font-weight:900;text-decoration:none;">See the source →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("");

  const intro = issue.intro?.trim() || "Winnipeg, edited down to the moves worth knowing about.";
  const closing = issue.closing_note?.trim() || "Know something Venture should have caught? Send it in and help make the next issue sharper.";
  const preheader = issue.preheader?.trim() || intro;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${escapeHtml(issue.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#fff8ef;color:#241f20;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff8ef" style="background-color:#fff8ef;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:680px;background-color:#ffffff;border:2px solid #241f20;border-radius:24px;overflow:hidden;">
<tr>
<td bgcolor="#ffcf00" style="padding:24px 26px;background-color:#ffcf00;border-bottom:2px solid #241f20;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:36px;color:#241f20;font-weight:900;letter-spacing:-1.5px;">Venture</td><td align="right" style="font-family:Georgia,serif;font-size:13px;line-height:18px;color:#8d0c10;font-style:italic;">Winnipeg, Thursday.</td></tr>
  </table>
  <p style="margin:9px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;color:#d01013;font-weight:900;letter-spacing:1.7px;text-transform:uppercase;">THE THURSDAY VENTURE · THE WEEKEND DROP</p>
</td>
</tr>
<tr><td style="padding:30px 26px 22px;">
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;color:#d01013;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;">${escapeHtml(issue.title)}</p>
  <h1 style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:40px;line-height:41px;color:#241f20;font-weight:900;letter-spacing:-1.8px;">Hi {{{contact.first_name|there}}}.<br>Winnipeg has plans.</h1>
  <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:28px;color:#5f5556;">${escapeHtml(intro)}</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr><td bgcolor="#f5e9ff" style="padding:8px 11px;background-color:#f5e9ff;border:2px solid #241f20;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;color:#241f20;font-weight:900;">${items.length} things on our radar</td></tr></table>
</td></tr>
${itemHtml}
<tr><td style="padding:22px 26px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5e9ff" style="background-color:#f5e9ff;border:2px solid #241f20;border-radius:17px;">
    <tr><td style="padding:19px;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:15px;color:#d01013;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;">A NOTE FROM VENTURE</p><p style="margin:9px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#5f5556;">${escapeHtml(closing)}</p></td></tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
    <tr>
      <td width="50%" style="padding:5px;"><a href="${escapeHtml(newsletterUrl)}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background-color:#ffcf00;color:#241f20;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:18px;font-weight:900;text-align:center;text-decoration:none;">The Thursday Venture</a></td>
      <td width="50%" style="padding:5px;"><a href="${escapeHtml(submitUrl)}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background-color:#d01013;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:18px;font-weight:900;text-align:center;text-decoration:none;">Send us a find</a></td>
    </tr>
  </table>
</td></tr>
<tr><td bgcolor="#241f20" style="padding:21px 26px;background-color:#241f20;text-align:center;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#ffffff;font-weight:900;">${escapeHtml(ventureBrand.fullName)}</div>
<div style="margin-top:7px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#d9d0d1;">${escapeHtml(postalAddress)} · ${escapeHtml(ventureBrand.replyToEmail)}</div>
<div style="margin-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#ffffff;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#ffcf00;">Manage preferences or unsubscribe</a>.</div>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const textParts: string[] = [
    issue.title,
    "",
    "Hi {{{contact.first_name|there}}}. Winnipeg has plans.",
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
    const meta = itemMeta(item);
    textParts.push(
      item.custom_title?.trim() || "Untitled pick",
      meta,
      item.custom_description?.trim() || "",
      item.custom_url?.trim() ? absoluteUrl(appUrl, item.custom_url.trim()) : newsletterUrl,
      ""
    );
  }

  textParts.push(
    closing,
    "",
    `The Thursday Venture: ${newsletterUrl}`,
    `Send us a find: ${submitUrl}`,
    "",
    ventureBrand.fullName,
    postalAddress,
    ventureBrand.replyToEmail,
    `Unsubscribe: ${unsubscribeUrl}`
  );

  return { subject: issue.subject, html, text: textParts.join("\n") };
}
