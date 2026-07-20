import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type BetaPeriodDays = 7 | 30 | 90;

type BetaEventRow = {
  session_id: string;
  event_name: string;
  page_path: string;
  created_at: string;
};

type BetaFeedbackRow = {
  id: string;
  session_id: string;
  page_path: string;
  category: string;
  rating: number | null;
  message: string;
  contact_email: string | null;
  permission_to_contact: boolean;
  status: string;
  created_at: string;
};

export type BetaInsights = {
  configured: boolean;
  error: string | null;
  periodDays: BetaPeriodDays;
  since: string;
  metrics: {
    sessions: number;
    pageViews: number;
    feedbackCount: number;
    averageRating: number | null;
    feedbackOpenRate: number | null;
  };
  funnel: Array<{
    key: string;
    label: string;
    sessions: number;
    percentage: number;
  }>;
  topPages: Array<{
    path: string;
    views: number;
    sessions: number;
  }>;
  feedbackCategories: Array<{
    category: string;
    count: number;
  }>;
  recentFeedback: BetaFeedbackRow[];
};

function percent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

function matchesStage(
  path: string,
  stage: string
): boolean {
  if (stage === "visit") {
    return true;
  }

  if (stage === "discover") {
    return path === "/explore" ||
      path === "/tonight" ||
      path.startsWith("/listings/");
  }

  if (stage === "build") {
    return path === "/build-outing" ||
      path.startsWith("/build-outing/");
  }

  if (stage === "result") {
    return path === "/build-outing/results";
  }

  return path.startsWith("/outings/");
}

export async function getBetaInsights(
  periodDays: BetaPeriodDays
): Promise<BetaInsights> {
  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - periodDays);
  const since = sinceDate.toISOString();

  const empty: BetaInsights = {
    configured: true,
    error: null,
    periodDays,
    since,
    metrics: {
      sessions: 0,
      pageViews: 0,
      feedbackCount: 0,
      averageRating: null,
      feedbackOpenRate: null
    },
    funnel: [],
    topPages: [],
    feedbackCategories: [],
    recentFeedback: []
  };

  const supabase = getSupabaseAdminClient();

  const [eventsResult, feedbackResult] = await Promise.all([
    supabase
      .from("beta_events")
      .select("session_id, event_name, page_path, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("beta_feedback")
      .select(
        "id, session_id, page_path, category, rating, message, contact_email, permission_to_contact, status, created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500)
  ]);

  const missingTable =
    eventsResult.error?.code === "42P01" ||
    feedbackResult.error?.code === "42P01";

  if (missingTable) {
    return {
      ...empty,
      configured: false,
      error:
        "Run the beta feedback Supabase migration before collecting outside-test data."
    };
  }

  if (eventsResult.error || feedbackResult.error) {
    console.error("Beta insights query failed", {
      eventError: eventsResult.error,
      feedbackError: feedbackResult.error
    });

    return {
      ...empty,
      error:
        "Venture could not load beta insights right now."
    };
  }

  const events =
    (eventsResult.data || []) as BetaEventRow[];
  const feedback =
    (feedbackResult.data || []) as BetaFeedbackRow[];

  const pageViews = events.filter(
    (event) => event.event_name === "page_view"
  );

  const sessions = new Set(
    pageViews.map((event) => event.session_id)
  );

  const openedSessions = new Set(
    events
      .filter((event) => event.event_name === "feedback_opened")
      .map((event) => event.session_id)
  );

  const rated = feedback
    .map((item) => item.rating)
    .filter((value): value is number => value !== null);

  const pageMap = new Map<
    string,
    { views: number; sessions: Set<string> }
  >();

  for (const event of pageViews) {
    const current = pageMap.get(event.page_path) || {
      views: 0,
      sessions: new Set<string>()
    };

    current.views += 1;
    current.sessions.add(event.session_id);
    pageMap.set(event.page_path, current);
  }

  const stageDefinitions = [
    { key: "visit", label: "Visited Venture" },
    { key: "discover", label: "Explored listings" },
    { key: "build", label: "Opened outing builder" },
    { key: "result", label: "Reached outing result" },
    { key: "share", label: "Opened shared outing" }
  ];

  const stageSessionIds = new Map<string, Set<string>>();

  for (const stage of stageDefinitions) {
    stageSessionIds.set(stage.key, new Set<string>());
  }

  for (const event of pageViews) {
    for (const stage of stageDefinitions) {
      if (matchesStage(event.page_path, stage.key)) {
        stageSessionIds.get(stage.key)?.add(event.session_id);
      }
    }
  }

  const categoryCounts = new Map<string, number>();

  for (const item of feedback) {
    categoryCounts.set(
      item.category,
      (categoryCounts.get(item.category) || 0) + 1
    );
  }

  return {
    configured: true,
    error: null,
    periodDays,
    since,
    metrics: {
      sessions: sessions.size,
      pageViews: pageViews.length,
      feedbackCount: feedback.length,
      averageRating:
        rated.length > 0
          ? Number(
              (
                rated.reduce((sum, value) => sum + value, 0) /
                rated.length
              ).toFixed(1)
            )
          : null,
      feedbackOpenRate:
        sessions.size > 0
          ? percent(openedSessions.size, sessions.size)
          : null
    },
    funnel: stageDefinitions.map((stage) => {
      const count = stageSessionIds.get(stage.key)?.size || 0;

      return {
        key: stage.key,
        label: stage.label,
        sessions: count,
        percentage: percent(count, sessions.size)
      };
    }),
    topPages: Array.from(pageMap.entries())
      .map(([path, value]) => ({
        path,
        views: value.views,
        sessions: value.sessions.size
      }))
      .sort((first, second) => second.views - first.views)
      .slice(0, 12),
    feedbackCategories: Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((first, second) => second.count - first.count),
    recentFeedback: feedback.slice(0, 50)
  };
}
