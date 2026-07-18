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


function getSubmissionId(
  formData: FormData
): string {
  const value =
    formData.get(
      "submissionId"
    );

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      "The submission ID is missing."
    );
  }

  return value.trim();
}


export async function reopenRejectedSubmission(
  formData: FormData
) {
  await requireVentureAdmin();

  const submissionId =
    getSubmissionId(
      formData
    );

  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } =
    await supabase
      .from(
        "listing_submissions"
      )
      .update({
        status:
          "in_review",

        reviewed_at:
          null
      })
      .eq(
        "id",
        submissionId
      )
      .eq(
        "status",
        "rejected"
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not reopen the submission: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "Only rejected submissions can be reopened from history."
    );
  }

  revalidatePath(
    "/admin/submissions"
  );

  revalidatePath(
    "/admin/submissions/history"
  );
}
