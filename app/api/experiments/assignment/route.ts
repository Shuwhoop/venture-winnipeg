import {
  createHash
} from "node:crypto";

import {
  NextResponse
} from "next/server";

import {
  checkBetaRateLimit,
  cleanVisitorId,
  getClientAddress,
  isAllowedBetaOrigin
} from "@/lib/beta/server";
import type {
  ExperimentAssignment,
  ExperimentVariant
} from "@/lib/experiments/types";
import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

const SLUG_PATTERN =
  /^[a-z0-9][a-z0-9-]{2,79}$/;

type ExperimentRow = {
  slug: string;
  status: string;
  variants: unknown;
  traffic_percentage: number;
  assignment_version: number;
  starts_at: string | null;
  ends_at: string | null;
};

function response(
  value: ExperimentAssignment,
  status = 200
) {
  return NextResponse.json(
    value,
    {
      status,
      headers: {
        "Cache-Control":
          "private, no-store"
      }
    }
  );
}

function cleanVariants(
  value: unknown
): ExperimentVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        return null;
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      const key =
        typeof record.key === "string"
          ? record.key.trim().slice(0, 40)
          : "";

      const label =
        typeof record.label === "string"
          ? record.label.trim().slice(0, 80)
          : key;

      const weight =
        Number(record.weight);

      if (
        !key ||
        !/^[a-z0-9][a-z0-9_-]*$/.test(key) ||
        !Number.isFinite(weight) ||
        weight <= 0
      ) {
        return null;
      }

      return {
        key,
        label: label || key,
        weight
      };
    })
    .filter(
      (
        item
      ): item is ExperimentVariant =>
        item !== null
    );
}

function bucketFor(
  value: string
): number {
  const digest =
    createHash("sha256")
      .update(value)
      .digest();

  return digest.readUInt32BE(0);
}

function chooseVariant(
  variants: ExperimentVariant[],
  value: number
): ExperimentVariant {
  const total =
    variants.reduce(
      (sum, variant) =>
        sum + variant.weight,
      0
    );

  const target =
    (value / 0xffffffff) *
    total;

  let cursor = 0;

  for (const variant of variants) {
    cursor += variant.weight;

    if (target < cursor) {
      return variant;
    }
  }

  return variants[
    variants.length - 1
  ];
}

export async function POST(
  request: Request
) {
  if (!isAllowedBetaOrigin(request)) {
    return response(
      {
        enabled: false,
        experimentSlug: "",
        variant: null,
        variantLabel: null,
        assignmentVersion: null,
        reason: "disabled"
      },
      403
    );
  }

  const rateKey =
    `experiment-assignment:${getClientAddress(request)}`;

  if (!checkBetaRateLimit({
    key: rateKey,
    limit: 120,
    windowMinutes: 60
  })) {
    return response(
      {
        enabled: false,
        experimentSlug: "",
        variant: null,
        variantLabel: null,
        assignmentVersion: null,
        reason: "disabled"
      },
      429
    );
  }

  let body: Record<string, unknown>;

  try {
    body =
      await request
        .json() as Record<string, unknown>;
  } catch {
    return response(
      {
        enabled: false,
        experimentSlug: "",
        variant: null,
        variantLabel: null,
        assignmentVersion: null,
        reason: "error"
      },
      400
    );
  }

  const experimentSlug =
    typeof body.experimentSlug === "string"
      ? body.experimentSlug
          .trim()
          .toLowerCase()
      : "";

  const visitorId =
    cleanVisitorId(
      body.visitorId
    );

  if (
    !SLUG_PATTERN.test(
      experimentSlug
    ) ||
    !visitorId
  ) {
    return response(
      {
        enabled: false,
        experimentSlug,
        variant: null,
        variantLabel: null,
        assignmentVersion: null,
        reason: "error"
      },
      400
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const {
    data,
    error
  } =
    await supabase
      .from("venture_experiments")
      .select(
        "slug,status,variants,traffic_percentage,assignment_version,starts_at,ends_at"
      )
      .eq("slug", experimentSlug)
      .maybeSingle();

  if (error) {
    return response({
      enabled: false,
      experimentSlug,
      variant: null,
      variantLabel: null,
      assignmentVersion: null,
      reason:
        error.code === "42P01"
          ? "migration-required"
          : "error"
    });
  }

  const experiment =
    data as ExperimentRow | null;

  if (!experiment) {
    return response({
      enabled: false,
      experimentSlug,
      variant: null,
      variantLabel: null,
      assignmentVersion: null,
      reason: "not-found"
    });
  }

  if (experiment.status !== "running") {
    return response({
      enabled: false,
      experimentSlug,
      variant: null,
      variantLabel: null,
      assignmentVersion:
        experiment.assignment_version,
      reason: "not-running"
    });
  }

  const now = Date.now();

  if (
    (
      experiment.starts_at &&
      new Date(
        experiment.starts_at
      ).getTime() > now
    ) ||
    (
      experiment.ends_at &&
      new Date(
        experiment.ends_at
      ).getTime() <= now
    )
  ) {
    return response({
      enabled: false,
      experimentSlug,
      variant: null,
      variantLabel: null,
      assignmentVersion:
        experiment.assignment_version,
      reason: "outside-schedule"
    });
  }

  const trafficBucket =
    bucketFor(
      `${experimentSlug}:${experiment.assignment_version}:${visitorId}:traffic`
    ) % 100;

  if (
    trafficBucket >=
    experiment.traffic_percentage
  ) {
    return response({
      enabled: false,
      experimentSlug,
      variant: null,
      variantLabel: null,
      assignmentVersion:
        experiment.assignment_version,
      reason: "not-in-traffic"
    });
  }

  const variants =
    cleanVariants(
      experiment.variants
    );

  if (variants.length < 2) {
    return response({
      enabled: false,
      experimentSlug,
      variant: null,
      variantLabel: null,
      assignmentVersion:
        experiment.assignment_version,
      reason: "error"
    });
  }

  const variant =
    chooseVariant(
      variants,
      bucketFor(
        `${experimentSlug}:${experiment.assignment_version}:${visitorId}:variant`
      )
    );

  return response({
    enabled: true,
    experimentSlug,
    variant:
      variant.key,
    variantLabel:
      variant.label,
    assignmentVersion:
      experiment.assignment_version,
    reason: "assigned"
  });
}
