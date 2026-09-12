import "server-only";

import {
  ventureBrand
} from "@/lib/venture-brand";


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


function emailShell({
  subject,
  eyebrow,
  heading,
  body,
  actionLabel,
  actionUrl,
  footer
}: {
  subject: string;
  eyebrow: string;
  heading: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  footer: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff8ef;color:#241f20;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ef;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:2px solid #241f20;border-radius:24px;overflow:hidden;box-shadow:8px 8px 0 #edb200;">
            <tr>
              <td style="padding:24px;background:#ffcf00;border-bottom:2px solid #241f20;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="64" valign="middle">
                      <div style="width:52px;height:52px;line-height:52px;text-align:center;border:3px solid #241f20;border-radius:16px;background:#ffcf00;color:#241f20;font-size:28px;font-weight:900;box-shadow:4px 4px 0 #d01013;">V</div>
                    </td>
                    <td valign="middle">
                      <div style="font-size:23px;font-weight:900;line-height:1;">Venture</div>
                      <div style="margin-top:5px;color:#d01013;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">The Thursday Venture</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 26px 12px;">
                <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">${eyebrow}</div>
                <h1 style="margin:10px 0 0;font-size:36px;line-height:1.02;letter-spacing:-.04em;">${heading}</h1>
                <p style="margin:16px 0 0;color:#615758;font-size:17px;line-height:1.65;">${body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 26px 30px;">
                <a href="${actionUrl}" style="display:block;padding:16px 18px;border:2px solid #241f20;border-radius:14px;background:#d01013;color:#ffffff;font-size:16px;font-weight:900;text-align:center;text-decoration:none;box-shadow:4px 4px 0 #edb200;">${actionLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 26px;background:#241f20;color:#ffffff;text-align:center;">
                <div style="font-size:13px;font-weight:900;">${ventureBrand.fullName}</div>
                <div style="margin-top:7px;color:#d9d0d1;font-size:12px;line-height:1.55;">${footer}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}


export function buildConfirmationEmail({
  firstName,
  confirmUrl
}: {
  firstName: string;
  confirmUrl: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName =
    escapeHtml(firstName);

  const subject =
    "Confirm The Thursday Venture ✦";

  const html = emailShell({
    subject,
    eyebrow:
      "ONE QUICK CHECK",
    heading:
      `Confirm your spot, ${safeName}.`,
    body:
      "Tap below to confirm that you want Venture’s weekly Winnipeg discoveries. Your subscription will not become active until you confirm.",
    actionLabel:
      "Confirm my subscription",
    actionUrl:
      confirmUrl,
    footer:
      "This confirmation link expires in 48 hours. If you did not request it, you can ignore this email."
  });

  const text = [
    `Hi ${firstName},`,
    "",
    "Confirm that you want The Thursday Venture, our weekly Winnipeg discovery email.",
    "",
    `Confirm your subscription: ${confirmUrl}`,
    "",
    "This link expires in 48 hours. If you did not request it, ignore this email."
  ].join("\n");

  return {
    subject,
    html,
    text
  };
}


export function buildWelcomeEmail({
  firstName,
  appUrl,
  unsubscribeUrl
}: {
  firstName: string;
  appUrl: string;
  unsubscribeUrl: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const safeName =
    escapeHtml(firstName);

  const exploreUrl =
    `${appUrl}/explore`;

  const subject =
    "You’re in. Welcome to Venture.";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#fff8ef;color:#241f20;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Winnipeg, every Thursday.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8ef;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:2px solid #241f20;border-radius:24px;overflow:hidden;box-shadow:8px 8px 0 #edb200;">
            <tr>
              <td style="padding:24px;background:#ffcf00;border-bottom:2px solid #241f20;">
                <div style="font-size:24px;font-weight:900;">Venture</div>
                <div style="margin-top:5px;color:#d01013;font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">Winnipeg / Every Thursday</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 26px 12px;">
                <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">YOU’RE CONFIRMED</div>
                <h1 style="margin:10px 0 0;font-size:36px;line-height:1.02;letter-spacing:-.04em;">Hi ${safeName}, you’re in.</h1>
                <p style="margin:16px 0 0;color:#615758;font-size:17px;line-height:1.65;">Every Thursday, Venture will send you a curated look at what’s happening around Winnipeg.</p>
                <p style="margin:12px 0 0;color:#615758;font-size:17px;line-height:1.65;">Events worth knowing about. Places worth trying. Food, nightlife, culture, and the people making the city move.</p>
                <p style="margin:12px 0 0;color:#615758;font-size:17px;line-height:1.65;">Not everything. Just the stuff we think is worth your time.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 26px;">
                <div style="padding:18px;border:2px solid #241f20;border-radius:18px;background:#fff8d8;">
                  <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">THE PROMISE</div>
                  <p style="margin:9px 0 0;font-size:16px;line-height:1.6;"><strong>One useful email a week. No clutter.</strong><br />No paid placement disguised as a recommendation. If something is sponsored, we’ll tell you.</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:17px 31px 33px;">
                <a href="${exploreUrl}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background:#ffcf00;color:#241f20;font-size:15px;font-weight:900;text-align:center;text-decoration:none;box-shadow:4px 4px 0 #d01013;">Explore Winnipeg</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 26px;background:#241f20;color:#ffffff;text-align:center;">
                <div style="font-size:14px;font-weight:900;">Same city. Different perspective.</div>
                <div style="margin-top:6px;color:#ffffff;font-size:12px;line-height:1.55;">See you Thursday.</div>
                <div style="margin-top:12px;font-size:13px;font-weight:900;">${ventureBrand.fullName}</div>
                <div style="margin-top:7px;color:#d9d0d1;font-size:12px;line-height:1.55;">Winnipeg, Manitoba · Replies go to ${ventureBrand.replyToEmail}</div>
                <div style="margin-top:12px;font-size:12px;"><a href="${unsubscribeUrl}" style="color:#ffcf00;">Unsubscribe</a> at any time.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hi ${firstName}, you’re in.`,
    "",
    "Every Thursday, Venture will send you a curated look at what’s happening around Winnipeg.",
    "",
    "Events worth knowing about. Places worth trying. Food, nightlife, culture, and the people making the city move.",
    "",
    "Not everything. Just the stuff we think is worth your time.",
    "",
    "THE PROMISE",
    "One useful email a week. No clutter.",
    "No paid placement disguised as a recommendation. If something is sponsored, we’ll tell you.",
    "",
    `Explore Winnipeg: ${exploreUrl}`,
    "",
    "Same city. Different perspective.",
    "See you Thursday.",
    ventureBrand.fullName,
    "",
    `Questions and replies: ${ventureBrand.replyToEmail}`,
    `Unsubscribe: ${unsubscribeUrl}`
  ].join("\n");

  return {
    subject,
    html,
    text
  };
}
