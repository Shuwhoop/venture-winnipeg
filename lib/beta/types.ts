export const BETA_EVENT_NAMES = [
  "page_view",
  "feedback_opened",
  "feedback_submitted"
] as const;

export type BetaEventName =
  (typeof BETA_EVENT_NAMES)[number];

export const BETA_FEEDBACK_CATEGORIES = [
  "bug",
  "confusing",
  "idea",
  "listing",
  "outing",
  "other"
] as const;

export type BetaFeedbackCategory =
  (typeof BETA_FEEDBACK_CATEGORIES)[number];

export type BetaEventPayload = {
  sessionId: string;
  eventName: BetaEventName;
  pagePath: string;
  properties?: Record<
    string,
    string | number | boolean | null
  >;
  website?: string;
};

export type BetaFeedbackPayload = {
  sessionId: string;
  pagePath: string;
  category: BetaFeedbackCategory;
  rating: number | null;
  message: string;
  contactEmail: string | null;
  permissionToContact: boolean;
  website?: string;
};
