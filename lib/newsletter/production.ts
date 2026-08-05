import "server-only";

import {
  addResendContactToSegment,
  createOrReactivateResendContact,
  createResendSegment,
  createResendTopic,
  getNewsletterSegmentName,
  getNewsletterTopicName,
  listResendBroadcasts,
  listResendSegments,
  listResendTopics,
  type ResendBroadcastSummary,
  type ResendResource,
  updateResendContactTopic
} from "@/lib/newsletter/resend";

import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";


export type NewsletterResourceState = {
  segment: ResendResource | null;
  topic: ResendResource | null;
  error: string;
};


export type NewsletterProductionOverview = {
  resources: NewsletterResourceState;
  broadcasts: ResendBroadcastSummary[];
  broadcastsError: string;
  activeSubscribers: number;
  subscriberError: string;
};


function sleep(
  milliseconds: number
): Promise<void> {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}


function findByName(
  items: ResendResource[],
  name: string
): ResendResource | null {
  const normalized =
    name.trim().toLowerCase();

  return items.find(
    (item) =>
      item.name
        .trim()
        .toLowerCase() ===
      normalized
  ) || null;
}


export async function getNewsletterResourceState():
  Promise<NewsletterResourceState> {
  if (!process.env.RESEND_API_KEY) {
    return {
      segment:
        null,
      topic:
        null,
      error:
        "RESEND_API_KEY is not configured."
    };
  }

  const [
    segments,
    topics
  ] = await Promise.all([
    listResendSegments(),
    listResendTopics()
  ]);

  return {
    segment:
      findByName(
        segments.items,
        getNewsletterSegmentName()
      ),
    topic:
      findByName(
        topics.items,
        getNewsletterTopicName()
      ),
    error:
      segments.error ||
      topics.error
  };
}


export async function ensureNewsletterResources():
  Promise<NewsletterResourceState> {
  const existing =
    await getNewsletterResourceState();

  if (existing.error) {
    return existing;
  }

  let segment =
    existing.segment;

  let topic =
    existing.topic;

  if (!segment) {
    const result =
      await createResendSegment(
        getNewsletterSegmentName()
      );

    if (!result.id) {
      return {
        segment:
          null,
        topic,
        error:
          result.error ||
          "Venture could not create the Resend segment."
      };
    }

    segment = {
      id:
        result.id,
      name:
        getNewsletterSegmentName()
    };
  }

  if (!topic) {
    const result =
      await createResendTopic(
        getNewsletterTopicName()
      );

    if (!result.id) {
      return {
        segment,
        topic:
          null,
        error:
          result.error ||
          "Venture could not create the Resend topic."
      };
    }

    topic = {
      id:
        result.id,
      name:
        getNewsletterTopicName()
    };
  }

  return {
    segment,
    topic,
    error:
      ""
  };
}


export async function getNewsletterProductionOverview():
  Promise<NewsletterProductionOverview> {
  const supabase =
    getSupabaseAdminClient();

  const [
    resources,
    broadcasts,
    subscriberResult
  ] = await Promise.all([
    getNewsletterResourceState(),
    process.env.RESEND_API_KEY
      ? listResendBroadcasts()
      : Promise.resolve({
          items: [],
          error:
            "RESEND_API_KEY is not configured."
        }),
    supabase
      .from(
        "newsletter_subscribers"
      )
      .select(
        "id",
        {
          count:
            "exact",
          head:
            true
        }
      )
      .eq(
        "status",
        "active"
      )
  ]);

  return {
    resources,
    broadcasts:
      broadcasts.items,
    broadcastsError:
      broadcasts.error,
    activeSubscribers:
      subscriberResult.count ||
      0,
    subscriberError:
      subscriberResult.error
        ?.message ||
      ""
  };
}


export async function syncNewsletterAudience({
  batchSize = 25,
  offset = 0
}: {
  batchSize?: number;
  offset?: number;
} = {}): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  remaining: number;
  nextOffset: number;
  errors: string[];
  resources: NewsletterResourceState;
}> {
  const resources =
    await ensureNewsletterResources();

  if (
    resources.error ||
    !resources.segment ||
    !resources.topic
  ) {
    return {
      processed:
        0,
      succeeded:
        0,
      failed:
        0,
      remaining:
        0,
      nextOffset:
        0,
      errors: [
        resources.error ||
        "Newsletter resources are incomplete."
      ],
      resources
    };
  }

  const safeBatchSize =
    Math.max(
      1,
      Math.min(
        batchSize,
        25
      )
    );

  const supabase =
    getSupabaseAdminClient();

  const safeOffset =
    Math.max(
      0,
      Math.floor(
        offset
      )
    );

  const result =
    await supabase
      .from(
        "newsletter_subscribers"
      )
      .select(
        "id, first_name, email, resend_contact_id",
        {
          count:
            "exact"
        }
      )
      .eq(
        "status",
        "active"
      )
      .order(
        "confirmed_at",
        {
          ascending:
            true,
          nullsFirst:
            true
        }
      )
      .range(
        safeOffset,
        safeOffset +
        safeBatchSize -
        1
      );

  if (result.error) {
    return {
      processed:
        0,
      succeeded:
        0,
      failed:
        0,
      remaining:
        0,
      nextOffset:
        safeOffset,
      errors: [
        result.error.message
      ],
      resources
    };
  }

  const subscribers =
    result.data ||
    [];

  let succeeded =
    0;

  let failed =
    0;

  const errors:
    string[] = [];

  for (
    const subscriber of
    subscribers
  ) {
    const contact =
      await createOrReactivateResendContact({
        email:
          subscriber.email,
        firstName:
          subscriber.first_name ||
          "Subscriber"
      });

    let error =
      contact.error ||
      "";

    if (!error) {
      const segmentResult =
        await addResendContactToSegment({
          email:
            subscriber.email,
          segmentId:
            resources.segment.id
        });

      error =
        segmentResult.error;
    }

    if (!error) {
      const topicResult =
        await updateResendContactTopic({
          email:
            subscriber.email,
          topicId:
            resources.topic.id,
          subscription:
            "opt_in"
        });

      error =
        topicResult.error;
    }

    if (error) {
      failed += 1;
      errors.push(
        `${subscriber.email}: ${error}`
      );
    } else {
      succeeded += 1;

      await supabase
        .from(
          "newsletter_subscribers"
        )
        .update({
          resend_contact_id:
            contact.id ||
            subscriber.resend_contact_id ||
            null,
          welcome_error:
            null,
          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          "id",
          subscriber.id
        );
    }

    await sleep(220);
  }

  return {
    processed:
      subscribers.length,
    succeeded,
    failed,
    remaining:
      Math.max(
        0,
        (result.count || 0) -
        safeOffset -
        subscribers.length
      ),
    nextOffset:
      safeOffset +
      subscribers.length,
    errors:
      errors.slice(
        0,
        8
      ),
    resources
  };
}


export async function syncSingleNewsletterSubscriber({
  email,
  firstName,
  contactId
}: {
  email: string;
  firstName: string;
  contactId?: string;
}): Promise<{
  contactId?: string;
  error: string;
}> {
  const resources =
    await getNewsletterResourceState();

  if (resources.error) {
    return {
      contactId,
      error:
        resources.error
    };
  }

  if (
    !resources.segment ||
    !resources.topic
  ) {
    return {
      contactId,
      error:
        ""
    };
  }

  const contact =
    contactId
      ? {
          id:
            contactId,
          error:
            undefined
        }
      : await createOrReactivateResendContact({
          email,
          firstName
        });

  if (contact.error) {
    return {
      contactId:
        contact.id,
      error:
        contact.error
    };
  }

  const segment =
    await addResendContactToSegment({
      email,
      segmentId:
        resources.segment.id
    });

  if (!segment.ok) {
    return {
      contactId:
        contact.id,
      error:
        segment.error
    };
  }

  const topic =
    await updateResendContactTopic({
      email,
      topicId:
        resources.topic.id,
      subscription:
        "opt_in"
    });

  return {
    contactId:
      contact.id,
    error:
      topic.error
  };
}
