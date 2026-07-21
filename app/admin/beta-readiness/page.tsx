import type {
  Metadata
} from "next";

import {
  getBetaReadinessReport
} from "@/lib/admin/beta-readiness";
import {
  requireVentureAdmin
} from "@/lib/auth/admin";

import {
  BetaReadinessClient
} from "./beta-readiness-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Beta Readiness | Venture Admin",
  description:
    "Private launch checklist combining live Venture metrics with manual beta checks."
};

export default async function BetaReadinessPage() {
  await requireVentureAdmin();
  const report =
    await getBetaReadinessReport();

  return (
    <BetaReadinessClient
      report={report}
    />
  );
}
