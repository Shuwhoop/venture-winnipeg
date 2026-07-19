import "server-only";

import {
  createHmac,
  timingSafeEqual
} from "node:crypto";


type NewsletterTokenPurpose =
  | "unsubscribe";


type NewsletterTokenPayload = {
  email: string;
  purpose: NewsletterTokenPurpose;
  expiresAt: number;
};


function getTokenSecret(): string {
  const secret =
    process.env.NEWSLETTER_TOKEN_SECRET;

  if (!secret) {
    throw new Error(
      "NEWSLETTER_TOKEN_SECRET is not configured."
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "NEWSLETTER_TOKEN_SECRET must be at least 32 characters."
    );
  }

  return secret;
}


function signPayload(
  encodedPayload: string
): string {
  return createHmac(
    "sha256",
    getTokenSecret()
  )
    .update(encodedPayload)
    .digest("base64url");
}


export function createNewsletterToken({
  email,
  purpose,
  lifetimeDays = 3650
}: {
  email: string;
  purpose: NewsletterTokenPurpose;
  lifetimeDays?: number;
}): string {
  const payload: NewsletterTokenPayload = {
    email:
      email.trim().toLowerCase(),
    purpose,
    expiresAt:
      Date.now() +
      lifetimeDays *
        24 *
        60 *
        60 *
        1000
  };

  const encodedPayload =
    Buffer.from(
      JSON.stringify(payload),
      "utf8"
    ).toString("base64url");

  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}


export function verifyNewsletterToken({
  token,
  purpose
}: {
  token: string;
  purpose: NewsletterTokenPurpose;
}): NewsletterTokenPayload | null {
  const [
    encodedPayload,
    signature
  ] = token.split(".");

  if (
    !encodedPayload ||
    !signature
  ) {
    return null;
  }

  const expectedSignature =
    signPayload(encodedPayload);

  const providedBuffer =
    Buffer.from(signature);

  const expectedBuffer =
    Buffer.from(expectedSignature);

  if (
    providedBuffer.length !==
    expectedBuffer.length
  ) {
    return null;
  }

  if (
    !timingSafeEqual(
      providedBuffer,
      expectedBuffer
    )
  ) {
    return null;
  }

  try {
    const payload =
      JSON.parse(
        Buffer.from(
          encodedPayload,
          "base64url"
        ).toString("utf8")
      ) as NewsletterTokenPayload;

    if (
      payload.purpose !==
        purpose ||
      payload.expiresAt <
        Date.now() ||
      typeof payload.email !==
        "string"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
