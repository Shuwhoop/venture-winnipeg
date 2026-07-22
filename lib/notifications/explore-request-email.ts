import "server-only";

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

export async function sendExploreRequestEmail({
  reference,
  searchQuery,
  requestedType,
  neighbourhood,
  details,
  contactEmail,
  sourcePage
}: {
  reference: string;
  searchQuery: string;
  requestedType: string;
  neighbourhood: string | null;
  details: string | null;
  contactEmail: string | null;
  sourcePage: string;
}): Promise<void> {
  const apiKey =
    process.env.RESEND_API_KEY?.trim();

  const firstAdminEmail =
    process.env.VENTURE_ADMIN_EMAILS
      ?.split(",")[0]
      ?.trim();

  const recipient =
    process.env.VENTURE_NOTIFICATION_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_VENTURE_CONTACT_EMAIL?.trim() ||
    firstAdminEmail;

  if (!apiKey || !recipient) {
    return;
  }

  const from =
    process.env.VENTURE_EMAIL_FROM?.trim() ||
    "Venture by Boogie Bangers <onboarding@resend.dev>";

  const subject =
    `Explore request: ${searchQuery}`;

  const text = [
    `Reference: ${reference}`,
    `Requested listing: ${searchQuery}`,
    `Type: ${requestedType}`,
    `Neighbourhood: ${neighbourhood || "Not provided"}`,
    `Details: ${details || "Not provided"}`,
    `Contact email: ${contactEmail || "Not provided"}`,
    `Source page: ${sourcePage}`
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#fff8ef;color:#241f20;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:620px;margin:0 auto;border:2px solid #241f20;border-radius:22px;background:#ffffff;overflow:hidden;box-shadow:7px 7px 0 #edb200;">
      <div style="padding:20px;background:#ffcf00;border-bottom:2px solid #241f20;">
        <div style="font-size:12px;font-weight:900;letter-spacing:.1em;color:#d01013;">VENTURE EXPLORE REQUEST</div>
        <h1 style="margin:8px 0 0;font-size:30px;line-height:1.05;">${escapeHtml(searchQuery)}</h1>
      </div>
      <div style="padding:22px;line-height:1.6;">
        <p><strong>Reference:</strong> ${escapeHtml(reference)}</p>
        <p><strong>Type:</strong> ${escapeHtml(requestedType)}</p>
        <p><strong>Neighbourhood:</strong> ${escapeHtml(neighbourhood || "Not provided")}</p>
        <p><strong>Details:</strong> ${escapeHtml(details || "Not provided")}</p>
        <p><strong>Contact:</strong> ${escapeHtml(contactEmail || "Not provided")}</p>
        <p><strong>Source page:</strong> ${escapeHtml(sourcePage)}</p>
      </div>
    </div>
  </body>
</html>`;

  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent":
            "Venture-by-Boogie-Bangers/1.0"
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject,
          html,
          text,
          reply_to:
            contactEmail ||
            process.env.VENTURE_EMAIL_REPLY_TO ||
            recipient
        })
      }
    );

    if (!response.ok) {
      console.error(
        "Explore request email failed:",
        response.status,
        await response.text()
      );
    }
  } catch (error) {
    console.error(
      "Explore request email failed:",
      error
    );
  }
}
