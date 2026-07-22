"use server";

import {
  revalidatePath
} from "next/cache";

import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

const allowedStatuses = new Set([
  "new",
  "reviewing",
  "fulfilled",
  "dismissed"
]);

export async function updateExploreRequestStatus(
  formData: FormData
) {
  await requireVentureAdmin();

  const id = String(
    formData.get("id") || ""
  ).trim();

  const status = String(
    formData.get("status") || ""
  ).trim();

  if (
    !id ||
    !allowedStatuses.has(status)
  ) {
    return;
  }

  const supabase =
    getSupabaseAdminClient();

  const { error } = await supabase
    .from("explore_listing_requests")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Venture could not update the request: ${error.message}`
    );
  }

  revalidatePath(
    "/admin/submissions/requests"
  );
}
