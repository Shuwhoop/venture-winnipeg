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

  const buildUrl =
    `${appUrl}/build-outing`;

  const subject =
    "Welcome to Venture by Boogie Bangers ✦";

  const html = `<!doctype html>
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
              <td style="padding:24px;background:linear-gradient(135deg,#ffcf00,#fff1b8);border-bottom:2px solid #241f20;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="64" valign="middle">
                      <div style="width:52px;height:52px;line-height:52px;text-align:center;border:3px solid #241f20;border-radius:16px;background:#ffcf00;color:#241f20;font-size:28px;font-weight:900;">V</div>
                    </td>
                    <td valign="middle">
                      <div style="font-size:23px;font-weight:900;line-height:1;">Venture</div>
                      <div style="margin-top:5px;color:#d01013;font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">by Boogie Bangers</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 26px 12px;">
                <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">Welcome to the city circle</div>
                <h1 style="margin:10px 0 0;font-size:36px;line-height:1.02;letter-spacing:-.04em;">Hi ${safeName}, you’re in.</h1>
                <p style="margin:16px 0 0;color:#615758;font-size:17px;line-height:1.65;">Welcome to Venture by Boogie Bangers, a warmer way to discover Winnipeg and turn ordinary plans into better memories.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:10px 26px 4px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding:10px 4px;">
                      <div style="font-size:28px;">🍽️</div>
                      <div style="margin-top:5px;font-size:12px;font-weight:900;">LOCAL FOOD</div>
                    </td>
                    <td align="center" style="padding:10px 4px;">
                      <div style="font-size:28px;">🎟️</div>
                      <div style="margin-top:5px;font-size:12px;font-weight:900;">CITY EVENTS</div>
                    </td>
                    <td align="center" style="padding:10px 4px;">
                      <div style="font-size:28px;">✨</div>
                      <div style="margin-top:5px;font-size:12px;font-weight:900;">NEW MEMORIES</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 26px;">
                <div style="padding:20px;border:2px solid #241f20;border-radius:18px;background:#fff8d8;">
                  <div style="color:#d01013;font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;">A note from the founder</div>
                  <p style="margin:10px 0 0;font-size:16px;line-height:1.65;"><strong>I’m Prince Malimbiza.</strong> My vision is to make it easier for people to come together, discover more of the city, create more memories, and support the local restaurants, venues, organizers, and communities that give Winnipeg its spark.</p>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:8px 26px 18px;">
                <h2 style="margin:0;font-size:24px;letter-spacing:-.03em;">What arrives on Thursday</h2>
                <p style="margin:10px 0 0;color:#615758;font-size:16px;line-height:1.6;">A useful roundup of standout events, local food and drink spots, complete outing ideas, and major Venture updates. No clutter, just a good launchpad for the weekend.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:2px 26px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:5px;">
                      <a href="${exploreUrl}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background:#ffcf00;color:#241f20;font-size:15px;font-weight:900;text-align:center;text-decoration:none;">Explore Winnipeg</a>
                    </td>
                    <td style="padding:5px;">
                      <a href="${buildUrl}" style="display:block;padding:15px 16px;border:2px solid #241f20;border-radius:13px;background:#d01013;color:#ffffff;font-size:15px;font-weight:900;text-align:center;text-decoration:none;">Build an outing</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 26px;background:#241f20;color:#ffffff;text-align:center;">
                <div style="font-size:13px;font-weight:900;">${ventureBrand.fullName}</div>
                <div style="margin-top:6px;color:#d9d0d1;font-size:12px;line-height:1.5;">Winnipeg, Manitoba · Replies go to ${ventureBrand.replyToEmail}</div>
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
    "Welcome to Venture by Boogie Bangers, a warmer way to discover Winnipeg and turn ordinary plans into better memories.",
    "",
    "I’m Prince Malimbiza. My vision is to make it easier for people to come together, discover more of the city, create more memories, and support the local restaurants, venues, organizers, and communities that give Winnipeg its spark.",
    "",
    "Every Thursday, you’ll receive standout events, local food and drink spots, complete outing ideas, and major Venture updates.",
    "",
    `Explore Winnipeg: ${exploreUrl}`,
    `Build an outing: ${buildUrl}`,
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
