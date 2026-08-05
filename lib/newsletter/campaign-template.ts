import "server-only";

import {
  ventureBrand
} from "@/lib/venture-brand";


import {
  type VentureNewsletterDraft
} from "@/lib/newsletter/campaign-draft";


function escapeHtml(
  value: string
): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function normalizeAppUrl(
  value: string
): string {
  return value.replace(/\/$/, "");
}


function absoluteUrl({
  appUrl,
  path
}: {
  appUrl: string;
  path: string;
}): string {
  if (
    /^https?:\/\//i.test(
      path
    )
  ) {
    return path;
  }

  const normalizedPath =
    path.startsWith("/")
      ? path
      : `/${path}`;

  return `${normalizeAppUrl(appUrl)}${normalizedPath}`;
}


function cleanDraft(
  draft: VentureNewsletterDraft
): VentureNewsletterDraft {
  const trim =
    (value: string) =>
      value.trim();

  return {
    issueLabel:
      trim(draft.issueLabel),
    subject:
      trim(draft.subject),
    preheader:
      trim(draft.preheader),
    intro:
      trim(draft.intro),
    venturePickTitle:
      trim(draft.venturePickTitle),
    venturePickBody:
      trim(draft.venturePickBody),
    venturePickUrl:
      trim(draft.venturePickUrl),
    weekendTitle:
      trim(draft.weekendTitle),
    weekendBody:
      trim(draft.weekendBody),
    weekendUrl:
      trim(draft.weekendUrl),
    budgetTitle:
      trim(draft.budgetTitle),
    budgetBody:
      trim(draft.budgetBody),
    budgetUrl:
      trim(draft.budgetUrl),
    closingNote:
      trim(draft.closingNote)
  };
}


export function validateNewsletterDraft(
  draft: VentureNewsletterDraft
): string[] {
  const cleaned =
    cleanDraft(draft);

  const required:
    Array<[
      keyof VentureNewsletterDraft,
      string
    ]> = [
      ["issueLabel", "Issue label"],
      ["subject", "Subject"],
      ["preheader", "Preheader"],
      ["intro", "Introduction"],
      ["venturePickTitle", "Venture Pick title"],
      ["venturePickBody", "Venture Pick description"],
      ["venturePickUrl", "Venture Pick link"],
      ["weekendTitle", "Weekend section title"],
      ["weekendBody", "Weekend section description"],
      ["weekendUrl", "Weekend section link"],
      ["budgetTitle", "Budget section title"],
      ["budgetBody", "Budget section description"],
      ["budgetUrl", "Budget section link"],
      ["closingNote", "Closing note"]
    ];

  const errors =
    required
      .filter(
        ([key]) =>
          !cleaned[key]
      )
      .map(
        ([, label]) =>
          `${label} is required.`
      );

  if (
    cleaned.subject.length >
    140
  ) {
    errors.push(
      "Subject must be 140 characters or shorter."
    );
  }

  return errors;
}


export function buildVentureNewsletterCampaign({
  draft,
  appUrl,
  firstName,
  testMode = false
}: {
  draft: VentureNewsletterDraft;
  appUrl: string;
  firstName?: string;
  testMode?: boolean;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const content =
    cleanDraft(draft);

  const greetingName =
    testMode
      ? escapeHtml(
          firstName ||
          "there"
        )
      : "{{{contact.first_name|there}}}";

  const unsubscribeUrl =
    testMode
      ? `${normalizeAppUrl(appUrl)}/newsletter`
      : "{{{RESEND_UNSUBSCRIBE_URL}}}";

  const postalAddress =
    process.env.VENTURE_POSTAL_ADDRESS
      ?.trim() ||
    "Winnipeg, Manitoba, Canada";

  const exploreUrl =
    absoluteUrl({
      appUrl,
      path:
        "/explore"
    });

  const buildUrl =
    absoluteUrl({
      appUrl,
      path:
        "/build-outing"
    });

  const pickUrl =
    absoluteUrl({
      appUrl,
      path:
        content.venturePickUrl
    });

  const weekendUrl =
    absoluteUrl({
      appUrl,
      path:
        content.weekendUrl
    });

  const budgetUrl =
    absoluteUrl({
      appUrl,
      path:
        content.budgetUrl
    });

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(content.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff8ef;color:#241f20;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ef;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:660px;background:#ffffff;border:2px solid #241f20;border-radius:24px;overflow:hidden;box-shadow:8px 8px 0 #edb200;">
            <tr>
              <td style="padding:24px 26px;background:#ffcf00;border-bottom:2px solid #241f20;">
                <div style="font-size:28px;font-weight:900;letter-spacing:-.04em;">Venture</div>
                <div style="margin-top:5px;color:#d01013;font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;">The Thursday Venture</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 26px 12px;">
                <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;">${escapeHtml(content.issueLabel)}</div>
                <h1 style="margin:10px 0 0;font-size:39px;line-height:1.02;letter-spacing:-.05em;">Hi ${greetingName}, your Winnipeg weekend starts here.</h1>
                <p style="margin:17px 0 0;color:#5f5556;font-size:17px;line-height:1.68;">${escapeHtml(content.intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 26px;">
                <div style="padding:21px;border:2px solid #241f20;border-radius:18px;background:#fff4b8;">
                  <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">VENTURE PICK</div>
                  <h2 style="margin:8px 0 0;font-size:25px;line-height:1.12;">${escapeHtml(content.venturePickTitle)}</h2>
                  <p style="margin:11px 0 0;color:#5f5556;font-size:16px;line-height:1.62;">${escapeHtml(content.venturePickBody)}</p>
                  <a href="${escapeHtml(pickUrl)}" style="display:inline-block;margin-top:16px;padding:13px 16px;border:2px solid #241f20;border-radius:12px;background:#d01013;color:#ffffff;font-size:14px;font-weight:900;text-decoration:none;">Build this kind of outing</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 26px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:7px;vertical-align:top;width:50%;">
                      <div style="height:100%;padding:18px;border:2px solid #241f20;border-radius:17px;background:#eaf6ff;">
                        <div style="color:#d01013;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">THIS WEEKEND</div>
                        <h2 style="margin:8px 0 0;font-size:21px;line-height:1.15;">${escapeHtml(content.weekendTitle)}</h2>
                        <p style="margin:10px 0 0;color:#5f5556;font-size:15px;line-height:1.58;">${escapeHtml(content.weekendBody)}</p>
                        <a href="${escapeHtml(weekendUrl)}" style="display:inline-block;margin-top:14px;color:#8d0c10;font-size:14px;font-weight:900;">Explore the weekend →</a>
                      </div>
                    </td>
                    <td style="padding:7px;vertical-align:top;width:50%;">
                      <div style="height:100%;padding:18px;border:2px solid #241f20;border-radius:17px;background:#f1e8ff;">
                        <div style="color:#d01013;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">UNDER CONTROL</div>
                        <h2 style="margin:8px 0 0;font-size:21px;line-height:1.15;">${escapeHtml(content.budgetTitle)}</h2>
                        <p style="margin:10px 0 0;color:#5f5556;font-size:15px;line-height:1.58;">${escapeHtml(content.budgetBody)}</p>
                        <a href="${escapeHtml(budgetUrl)}" style="display:inline-block;margin-top:14px;color:#8d0c10;font-size:14px;font-weight:900;">See affordable ideas →</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 26px 26px;">
                <div style="padding:19px;border:2px solid #241f20;border-radius:17px;background:#ffffff;">
                  <div style="color:#d01013;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">A NOTE FROM VENTURE</div>
                  <p style="margin:9px 0 0;color:#5f5556;font-size:15px;line-height:1.65;">${escapeHtml(content.closingNote)}</p>
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                  <tr>
                    <td style="padding:5px;">
                      <a href="${escapeHtml(exploreUrl)}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background:#ffcf00;color:#241f20;font-size:15px;font-weight:900;text-align:center;text-decoration:none;">Explore Winnipeg</a>
                    </td>
                    <td style="padding:5px;">
                      <a href="${escapeHtml(buildUrl)}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background:#d01013;color:#ffffff;font-size:15px;font-weight:900;text-align:center;text-decoration:none;">Build an outing</a>
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
                ${testMode ? '<div style="margin-top:8px;color:#ffcf00;font-size:11px;font-weight:900;">TEST EMAIL · NO CAMPAIGN WAS SENT</div>' : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hi ${testMode ? firstName || "there" : "{{{contact.first_name|there}}}"}, your Winnipeg weekend starts here.`,
    "",
    content.intro,
    "",
    `VENTURE PICK: ${content.venturePickTitle}`,
    content.venturePickBody,
    pickUrl,
    "",
    content.weekendTitle,
    content.weekendBody,
    weekendUrl,
    "",
    content.budgetTitle,
    content.budgetBody,
    budgetUrl,
    "",
    content.closingNote,
    "",
    `Explore Winnipeg: ${exploreUrl}`,
    `Build an outing: ${buildUrl}`,
    "",
    `${ventureBrand.fullName}`,
    postalAddress,
    ventureBrand.replyToEmail,
    `Unsubscribe: ${unsubscribeUrl}`,
    ...(testMode
      ? [
          "",
          "TEST EMAIL. No campaign was sent."
        ]
      : [])
  ].join("\n");

  return {
    subject:
      content.subject,
    html,
    text
  };
}
