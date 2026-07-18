"use server";

import {
  redirect
} from "next/navigation";

import {
  isVentureAdminEmail
} from "@/lib/auth/admin";

import {
  getSupabaseServerClient
} from "@/lib/supabase/server";


function readCredential(
  formData: FormData,
  key: string,
  maximumLength: number
): string {
  const value =
    formData.get(key);

  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length >
      maximumLength
  ) {
    redirect(
      "/admin/login?error=invalid"
    );
  }

  return value.trim();
}


export async function loginAdmin(
  formData: FormData
) {
  const email =
    readCredential(
      formData,
      "email",
      320
    ).toLowerCase();

  const password =
    readCredential(
      formData,
      "password",
      512
    );

  const supabase =
    await getSupabaseServerClient();

  const {
    data,
    error
  } =
    await supabase
      .auth
      .signInWithPassword({
        email,
        password
      });

  if (
    error ||
    !data.user
  ) {
    redirect(
      "/admin/login?error=invalid"
    );
  }

  if (
    !isVentureAdminEmail(
      data.user.email
    )
  ) {
    await supabase
      .auth
      .signOut();

    redirect(
      "/admin/login?error=denied"
    );
  }

  redirect(
    "/admin/submissions"
  );
}


export async function logoutAdmin() {
  const supabase =
    await getSupabaseServerClient();

  await supabase
    .auth
    .signOut();

  redirect(
    "/admin/login?signedOut=1"
  );
}
