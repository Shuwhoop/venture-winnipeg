export const QUICK_REPAIR_VERIFICATION_OPTIONS = [
  "unverified",
  "community_reported",
  "official_source",
  "verified_venture",
  "verified_business"
] as const;

export type QuickRepairVerificationStatus =
  (typeof QUICK_REPAIR_VERIFICATION_OPTIONS)[number];

export type QuickRepairRecord = {
  key: string;
  entityType: "place" | "event";
  id: string;
  name: string;
  category: string;
  status: string;
  verificationStatus: string;
  neighbourhood: string | null;
  sourceCheckedAt: string | null;
  primarySourceUrl: string | null;
  issues: Array<{
    code: string;
    label: string;
    severity: "high" | "medium" | "low";
  }>;
  publicPath: string;
};

export type QuickRepairChange = {
  entityType: "place" | "event";
  id: string;
  neighbourhood?: string;
  primaryCategory?: string;
  verificationStatus?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  applyWinnipegDefaults?: boolean;
};

export type QuickRepairItemResult = {
  key: string;
  ok: boolean;
  message: string;
};

export type QuickRepairBatchResult = {
  ok: boolean;
  saved: number;
  failed: number;
  results: QuickRepairItemResult[];
};
