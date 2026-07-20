export const BETA_EVENT_NAMES = [
  "session_started",
  "page_view",
  "discovery_viewed",
  "listing_detail_opened",
  "listing_map_selected",
  "listing_saved",
  "listing_unsaved",
  "saved_page_viewed",
  "outing_builder_opened",
  "outing_result_viewed",
  "experiment_exposure",
  "outing_generated",
  "outing_saved",
  "outing_unsaved",
  "outing_stop_replaced",
  "outing_stop_added",
  "outing_shared",
  "shared_outing_viewed",
  "newsletter_signup",
  "report_submitted",
  "feedback_opened",
  "feedback_submitted",
  "pipeline_test"
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

export type BetaPrimitive =
  | string
  | number
  | boolean
  | null;

export type BetaEventPayload = {
  sessionId: string;
  visitorId?: string | null;
  eventName: BetaEventName;
  pagePath: string;
  clientCreatedAt?: string;
  eventVersion?: number;
  properties?: Record<string, BetaPrimitive>;
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
