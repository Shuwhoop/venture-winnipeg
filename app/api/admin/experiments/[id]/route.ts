import {
  NextResponse
} from "next/server";

import {
  getVentureAdmin
} from "@/lib/auth/admin";
import type {
  ExperimentStatus
} from "@/lib/experiments/types";
import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

export const dynamic =
  "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUSES =
  new Set<ExperimentStatus>([
    "draft",
    "running",
    "paused",
    "archived"
  ]);

function sameOrigin(
  request: Request
): boolean {
  const origin =
    request.headers.get("origin");

  return (
    !origin ||
    origin ===
      new URL(request.url).origin
  );
}

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const admin =
    await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Administrator access is required."
      },
      {
        status: 401
      }
    );
  }

  if (!sameOrigin(request)) {
    return NextResponse.json(
      {
        error:
          "This update request was rejected."
      },
      {
        status: 403
      }
    );
  }

  const {
    id
  } =
    await context.params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      {
        error:
          "The experiment ID is invalid."
      },
      {
        status: 400
      }
    );
  }

  let body: Record<string, unknown>;

  try {
    body =
      await request
        .json() as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        error:
          "The update request could not be read."
      },
      {
        status: 400
      }
    );
  }

  const status =
    typeof body.status === "string"
      ? body.status as ExperimentStatus
      : null;

  if (
    !status ||
    !STATUSES.has(status)
  ) {
    return NextResponse.json(
      {
        error:
          "Choose draft, running, paused, or archived."
      },
      {
        status: 400
      }
    );
  }

  const supabase =
    getSupabaseAdminClient();

  const current =
    await supabase
      .from("venture_experiments")
      .select(
        "id,status,starts_at,ends_at"
      )
      .eq("id", id)
      .maybeSingle();

  if (current.error) {
    return NextResponse.json(
      {
        error:
          current.error.code ===
            "42P01"
            ? "Apply the Experiment Lab migration first."
            : "Venture could not read this experiment."
      },
      {
        status:
          current.error.code ===
            "42P01"
            ? 503
            : 500
      }
    );
  }

  if (!current.data) {
    return NextResponse.json(
      {
        error:
          "The experiment was not found."
      },
      {
        status: 404
      }
    );
  }

  const now =
    new Date().toISOString();

  const update: {
    status: ExperimentStatus;
    starts_at?: string;
    ends_at?: string | null;
  } = {
    status
  };

  if (
    status === "running" &&
    !current.data.starts_at
  ) {
    update.starts_at = now;
  }

  if (status === "running") {
    update.ends_at = null;
  }

  if (status === "archived") {
    update.ends_at = now;
  }

  const result =
    await supabase
      .from("venture_experiments")
      .update(update)
      .eq("id", id)
      .select(
        "id,slug,status,updated_at"
      )
      .single();

  if (result.error) {
    return NextResponse.json(
      {
        error:
          "Venture could not update this experiment."
      },
      {
        status: 500
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      experiment:
        result.data,
      updatedBy:
        admin.email
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store"
      }
    }
  );
}
