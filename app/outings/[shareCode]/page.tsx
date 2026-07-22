import Link from "next/link";

import {
  notFound
} from "next/navigation";

import {
  OutingDetailExperience
} from "@/components/outing-detail-experience";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import type {
  GeneratedOutingPlan
} from "@/lib/saved-outings";

export const dynamic =
  "force-dynamic";

type SharedOutingPageProps = {
  params: Promise<{
    shareCode: string;
  }>;
};

type SharedOutingRow = {
  share_code: string;
  planning_mode:
    | "solo"
    | "group";
  title: string;
  generated_plan:
    GeneratedOutingPlan;
};

async function getSharedOuting(
  shareCode: string
): Promise<SharedOutingRow | null> {
  if (
    !/^[a-f0-9]{12}$/.test(
      shareCode
    )
  ) {
    return null;
  }

  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } =
    await supabase.rpc(
      "get_shared_outing",
      {
        requested_share_code:
          shareCode
      }
    );

  if (error) {
    console.error(
      "Could not read shared outing:",
      error
    );

    return null;
  }

  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    return null;
  }

  return data[0] as
    SharedOutingRow;
}

export default async function SharedOutingPage({
  params
}: SharedOutingPageProps) {
  const {
    shareCode
  } =
    await params;

  const sharedOuting =
    await getSharedOuting(
      shareCode
    );

  if (!sharedOuting) {
    notFound();
  }

  const plan =
    sharedOuting.generated_plan;

  return (
    <OutingDetailExperience
      plan={plan}
      eyebrow={
        sharedOuting.planning_mode ===
        "group"
          ? "SHARED GROUP OUTING"
          : "SHARED SOLO OUTING"
      }
      intro="A Venture route built from real Winnipeg listings, timing, and travel information."
      backHref="/"
      backLabel="Discover Venture"
      actions={
        <>
          <Link href="/build-outing">
            Build your own outing
          </Link>

          <Link href="/explore">
            Explore Winnipeg
          </Link>
        </>
      }
    />
  );
}
