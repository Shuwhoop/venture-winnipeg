import "server-only";

import {
  redirect
} from "next/navigation";

import {
  getSupabaseServerClient
} from "@/lib/supabase/server";


export type VentureAdmin = {
  id: string;
  email: string;
};


function normalizeEmail(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}


export function getVentureAdminEmails():
  Set<string> {
  const configured =
    process.env
      .VENTURE_ADMIN_EMAILS
      ?.trim();

  if (!configured) {
    throw new Error(
      "VENTURE_ADMIN_EMAILS is missing. Add one or more comma-separated administrator email addresses."
    );
  }

  const emails =
    configured
      .split(",")
      .map(
        normalizeEmail
      )
      .filter(Boolean);

  if (
    emails.length === 0
  ) {
    throw new Error(
      "VENTURE_ADMIN_EMAILS does not contain a valid administrator email address."
    );
  }

  return new Set(
    emails
  );
}


export function isVentureAdminEmail(
  email:
    string | null | undefined
): boolean {
  if (!email) {
    return false;
  }

  return getVentureAdminEmails()
    .has(
      normalizeEmail(
        email
      )
    );
}


export async function getVentureAdmin():
  Promise<VentureAdmin | null> {
  const supabase =
    await getSupabaseServerClient();

  const {
    data,
    error
  } =
    await supabase
      .auth
      .getClaims();

  if (
    error ||
    !data?.claims
  ) {
    return null;
  }

  const claims =
    data.claims as Record<
      string,
      unknown
    >;

  const id =
    typeof claims.sub ===
      "string"
      ? claims.sub
      : "";

  const email =
    typeof claims.email ===
      "string"
      ? normalizeEmail(
          claims.email
        )
      : "";

  if (
    !id ||
    !isVentureAdminEmail(
      email
    )
  ) {
    return null;
  }

  return {
    id,
    email
  };
}


export async function requireVentureAdmin():
  Promise<VentureAdmin> {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    redirect(
      "/admin/login?error=required"
    );
  }

  return admin;
}
