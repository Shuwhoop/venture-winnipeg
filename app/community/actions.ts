"use server";

import {
  revalidatePath
} from "next/cache";

import {
  redirect
} from "next/navigation";

import {
  getSupabaseServerClient
} from "@/lib/supabase/server";

function requiredText(
  formData: FormData,
  key: string,
  maxLength: number
): string {
  const value =
    formData.get(key);

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${key} is required.`
    );
  }

  return value
    .trim()
    .slice(0, maxLength);
}

function optionalText(
  formData: FormData,
  key: string,
  maxLength: number
): string {
  const value =
    formData.get(key);

  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function attendeeCount(
  formData: FormData
): number {
  const value =
    Number(
      formData.get("attendeeCount")
    );

  return value === 2
    ? 2
    : 1;
}

async function getSignedInUserId(
  nextPath: string
): Promise<{
  supabase:
    Awaited<
      ReturnType<
        typeof getSupabaseServerClient
      >
    >;
  userId: string;
}> {
  const supabase =
    await getSupabaseServerClient();

  const {
    data,
    error
  } =
    await supabase
      .auth
      .getClaims();

  const claims =
    data?.claims as
      | Record<string, unknown>
      | undefined;

  const userId =
    typeof claims?.sub === "string"
      ? claims.sub
      : "";

  if (
    error ||
    !userId
  ) {
    redirect(
      `/sign-in?next=${encodeURIComponent(
        nextPath
      )}`
    );
  }

  return {
    supabase,
    userId
  };
}

export async function joinCommunityExperience(
  formData: FormData
) {
  const experienceId =
    requiredText(
      formData,
      "experienceId",
      80
    );

  const slug =
    requiredText(
      formData,
      "slug",
      160
    );

  const nextPath =
    `/community/${slug}`;

  const {
    supabase
  } =
    await getSignedInUserId(
      nextPath
    );

  const guidelinesAgreed =
    formData.get(
      "guidelinesAgreed"
    ) === "on";

  const {
    data,
    error
  } =
    await supabase
      .rpc(
        "rsvp_to_community_experience",
        {
          p_experience_id:
            experienceId,
          p_attendee_count:
            attendeeCount(
              formData
            ),
          p_attending_alone:
            formData.get(
              "attendingAlone"
            ) === "on",
          p_dietary_notes:
            optionalText(
              formData,
              "dietaryNotes",
              500
            ),
          p_accessibility_notes:
            optionalText(
              formData,
              "accessibilityNotes",
              500
            ),
          p_guidelines_agreed:
            guidelinesAgreed
        }
      );

  if (error) {
    redirect(
      `${nextPath}?error=${encodeURIComponent(
        error.message
      )}#rsvp`
    );
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  const status =
    result &&
    typeof result === "object" &&
    "rsvp_status" in result
      ? String(
          result.rsvp_status
        )
      : "confirmed";

  revalidatePath(nextPath);
  revalidatePath("/profile");

  redirect(
    `${nextPath}?rsvp=${encodeURIComponent(
      status
    )}#rsvp`
  );
}

export async function cancelCommunityRsvp(
  formData: FormData
) {
  const experienceId =
    requiredText(
      formData,
      "experienceId",
      80
    );

  const slug =
    requiredText(
      formData,
      "slug",
      160
    );

  const nextPath =
    `/community/${slug}`;

  const {
    supabase
  } =
    await getSignedInUserId(
      nextPath
    );

  const { error } =
    await supabase.rpc(
      "cancel_community_rsvp",
      {
        p_experience_id:
          experienceId
      }
    );

  if (error) {
    redirect(
      `${nextPath}?error=${encodeURIComponent(
        error.message
      )}#rsvp`
    );
  }

  revalidatePath(nextPath);
  revalidatePath("/profile");

  redirect(
    `${nextPath}?rsvp=cancelled#rsvp`
  );
}
