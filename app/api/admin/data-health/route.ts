import { NextResponse } from "next/server";

import {
  DATA_HEALTH_ISSUES,
  getDataHealthReport,
  type DataHealthEntityType,
  type DataHealthIssueCode
} from "@/lib/admin/data-health";
import { getVentureAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function getStringParameter(
  searchParams: URLSearchParams,
  key: string
): string | undefined {
  const value = searchParams.get(key)?.trim();
  return value || undefined;
}

export async function GET(request: Request) {
  const admin = await getVentureAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        error: "Administrator access is required."
      },
      {
        status: 401
      }
    );
  }

  const url = new URL(request.url);
  const entityType = getStringParameter(url.searchParams, "type");
  const issue = getStringParameter(url.searchParams, "issue");
  const status = getStringParameter(url.searchParams, "status");
  const search = getStringParameter(url.searchParams, "search");
  const limit = Number(getStringParameter(url.searchParams, "limit") ?? 200);

  const report = await getDataHealthReport({
    entityType:
      entityType === "place" || entityType === "event"
        ? (entityType as DataHealthEntityType)
        : "all",
    issue: DATA_HEALTH_ISSUES.includes(issue as DataHealthIssueCode)
      ? (issue as DataHealthIssueCode)
      : "all",
    status:
      status === "published" ||
      status === "draft" ||
      status === "closed" ||
      status === "expired"
        ? status
        : "all",
    search,
    limit
  });

  return NextResponse.json(report, {
    headers: {
      "Cache-Control": "private, no-store"
    }
  });
}
