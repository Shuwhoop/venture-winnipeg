import {
  getSupabaseAdminClient
} from "@/lib/supabase/admin";

import PhotoPortal from "./photo-portal";

import styles from "./page.module.css";

export const dynamic =
  "force-dynamic";

type PlaceRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  neighbourhood: string | null;
  primary_category: string;
  image_url: string | null;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  start_at: string;
  primary_category: string;
  image_url: string | null;
};

type MediaRow = {
  id: string;
  entity_type:
    | "place"
    | "event";
  entity_id: string;
  public_url: string;
  alt_text: string;
  caption: string | null;
  rights_basis: string;
  is_primary: boolean;
  created_at: string;
};

export default async function PhotoPortalPage() {
  const supabase =
    getSupabaseAdminClient();

  const [
    placesResult,
    eventsResult,
    mediaResult
  ] = await Promise.all([
    supabase
      .from("places")
      .select(
        "id,slug,name,status,neighbourhood,primary_category,image_url"
      )
      .in("status", [
        "draft",
        "published"
      ])
      .order("name", {
        ascending: true
      })
      .limit(1000),

    supabase
      .from("events")
      .select(
        "id,slug,title,status,start_at,primary_category,image_url"
      )
      .in("status", [
        "draft",
        "published"
      ])
      .order("start_at", {
        ascending: false
      })
      .limit(1000),

    supabase
      .from("listing_media")
      .select(
        "id,entity_type,entity_id,public_url,alt_text,caption,rights_basis,is_primary,created_at"
      )
      .eq("status", "active")
      .order("created_at", {
        ascending: false
      })
      .limit(24)
  ]);

  if (placesResult.error) {
    throw new Error(
      `Could not load restaurants: ${placesResult.error.message}`
    );
  }

  if (eventsResult.error) {
    throw new Error(
      `Could not load events: ${eventsResult.error.message}`
    );
  }

  if (mediaResult.error) {
    throw new Error(
      `Could not load listing photos: ${mediaResult.error.message}`
    );
  }

  const places =
    (placesResult.data ?? []) as PlaceRow[];

  const events =
    (eventsResult.data ?? []) as EventRow[];

  const listingNames =
    new Map<string, string>([
      ...places.map(
        (place) => [
          `place:${place.id}`,
          place.name
        ] as const
      ),
      ...events.map(
        (event) => [
          `event:${event.id}`,
          event.title
        ] as const
      )
    ]);

  const listings = [
    ...places.map((place) => ({
      id: place.id,
      entityType:
        "place" as const,
      name: place.name,
      slug: place.slug,
      status: place.status,
      meta: [
        place.primary_category,
        place.neighbourhood
      ].filter(Boolean).join(" · "),
      currentImageUrl:
        place.image_url
    })),
    ...events.map((event) => ({
      id: event.id,
      entityType:
        "event" as const,
      name: event.title,
      slug: event.slug,
      status: event.status,
      meta: [
        event.primary_category,
        new Intl.DateTimeFormat(
          "en-CA",
          {
            dateStyle:
              "medium",
            timeZone:
              "America/Winnipeg"
          }
        ).format(
          new Date(
            event.start_at
          )
        )
      ].join(" · "),
      currentImageUrl:
        event.image_url
    }))
  ];

  const recentMedia =
    ((mediaResult.data ?? []) as MediaRow[])
      .map((media) => ({
        ...media,
        listingName:
          listingNames.get(
            `${media.entity_type}:${media.entity_id}`
          ) ?? "Unknown listing"
      }));

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span>
          SUBMISSIONS · PHOTO PORTAL
        </span>

        <h1>
          Put the right image on the right listing.
        </h1>

        <p>
          Search for a restaurant or event, choose a photo, record where the image came from, and publish it without touching Supabase Storage by hand.
        </p>
      </header>

      <PhotoPortal
        listings={listings}
        recentMedia={recentMedia}
      />
    </main>
  );
}
