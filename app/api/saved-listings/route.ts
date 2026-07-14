import {
  NextResponse
} from "next/server";

import {
  getPublishedEventListingBySlug
} from "@/lib/data/events";

import {
  getPublishedPlaceListingBySlug
} from "@/lib/data/places";

type SavedListingRequest = {
  slug?: string;
  type?: string;
};

type RequestBody = {
  items?: SavedListingRequest[];
};

const slugPattern =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as RequestBody;

    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        {
          error:
            "Saved listings are invalid."
        },
        {
          status: 400
        }
      );
    }

    const validItems =
      body.items
        .filter((item) => {
          return (
            typeof item.slug ===
              "string" &&
            slugPattern.test(item.slug) &&
            (
              item.type === "event" ||
              item.type ===
                "restaurant"
            )
          );
        })
        .slice(0, 100);

    const listings =
      await Promise.all(
        validItems.map(
          async (item) => {
            if (
              item.type === "event"
            ) {
              return getPublishedEventListingBySlug(
                item.slug!
              );
            }

            return getPublishedPlaceListingBySlug(
              item.slug!
            );
          }
        )
      );

    return NextResponse.json({
      listings: listings.filter(
        (listing) => listing !== null
      )
    });
  } catch (error) {
    console.error(
      "Unable to load saved listings:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Saved listings could not be loaded."
      },
      {
        status: 500
      }
    );
  }
}