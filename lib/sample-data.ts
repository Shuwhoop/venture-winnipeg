import type { Listing } from "@/lib/types";

export const sampleListings: Listing[] = [
  {
    id: "event-bombargo",
    slug: "bombargo-guests",
    type: "event",
    name: "Bombargo + Guests",
    category: "Music",
    subtitle: "Live Music · Folk/Indie",
    statusLabel: "TODAY",
    statusTone: "purple",
    timeOrHours: "8:00 PM · Doors 7:00 PM",
    price: "$25–$38",
    distance: "2.4 km",
    verification: "verified_venture",
    lastChecked: "Checked today",
    imageClass: "image-concert",
    neighbourhood: "West End",
    description: "A lively Winnipeg concert listing used as sample content for the Venture production scaffold."
  },
  {
    id: "restaurant-deer-almond",
    slug: "deer-and-almond",
    type: "restaurant",
    name: "Deer + Almond",
    category: "Restaurants",
    subtitle: "Modern Canadian · $$$",
    statusLabel: "OPEN",
    statusTone: "green",
    timeOrHours: "Open until 10:00 PM",
    price: "$$$",
    distance: "1.1 km",
    verification: "verified_venture",
    lastChecked: "Hours checked today",
    rating: 4.7,
    ratingCount: 1842,
    imageClass: "image-food",
    neighbourhood: "Exchange District",
    description: "A creative dining destination shown here only as sample prototype data."
  },
  {
    id: "event-market",
    slug: "osborne-village-market",
    type: "event",
    name: "Osborne Village Market",
    category: "Markets",
    subtitle: "Local vendors · Community",
    statusLabel: "UNVERIFIED",
    statusTone: "amber",
    timeOrHours: "Saturday · 10:00 AM–3:00 PM",
    price: "Free",
    distance: "3.2 km",
    verification: "community_reported",
    lastChecked: "Needs source confirmation",
    imageClass: "image-market",
    neighbourhood: "Osborne Village",
    description: "A sample unverified listing demonstrating Venture's warning and ranking model."
  }
];

export function getListingBySlug(slug: string) {
  return sampleListings.find((listing) => listing.slug === slug);
}
