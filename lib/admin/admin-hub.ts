import "server-only";

import {
  getDataHealthReport
} from "@/lib/admin/data-health";
import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export type AdminHubOverview = {
  totalListings: number;
  pitchReady: number;
  needsAttention: number;
  futureEvents: number;
  openReports: number;
  pendingClaims: number;
  pendingSubmissions: number;
  claimsMigrationRequired: boolean;
};

async function exactCount(
  table: string,
  column: string,
  value: string
): Promise<number> {
  const supabase =
    getSupabaseAdminClient();
  const { count, error } =
    await supabase
      .from(table)
      .select("id", {
        count: "exact",
        head: true
      })
      .eq(column, value);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getAdminHubOverview():
  Promise<AdminHubOverview> {
  const report =
    await getDataHealthReport({
      limit: 1
    });

  const [
    reportsResult,
    submissionsResult,
    claimsResult
  ] = await Promise.allSettled([
    exactCount(
      "reports",
      "status",
      "open"
    ),
    exactCount(
      "listing_submissions",
      "status",
      "pending"
    ),
    exactCount(
      "business_claim_requests",
      "status",
      "pending"
    )
  ]);

  return {
    totalListings:
      report.metrics.totalRecords,
    pitchReady:
      report.metrics.pitchReady,
    needsAttention:
      report.metrics.needsAttention,
    futureEvents:
      report.metrics.futureEvents,
    openReports:
      reportsResult.status === "fulfilled"
        ? reportsResult.value
        : 0,
    pendingClaims:
      claimsResult.status === "fulfilled"
        ? claimsResult.value
        : 0,
    pendingSubmissions:
      submissionsResult.status === "fulfilled"
        ? submissionsResult.value
        : 0,
    claimsMigrationRequired:
      claimsResult.status === "rejected"
  };
}
