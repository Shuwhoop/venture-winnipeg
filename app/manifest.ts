import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Venture by Boogie Bangers",
    short_name: "Venture",
    description:
      "Discover trustworthy events, restaurants, and complete outings across Winnipeg.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fff5e8",
    theme_color: "#0b2347",
    categories: ["lifestyle", "travel", "entertainment", "food"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Explore Winnipeg",
        short_name: "Explore",
        description: "Browse places and upcoming events.",
        url: "/explore?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Build an outing",
        short_name: "Build",
        description: "Create a complete Winnipeg outing.",
        url: "/build-outing?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Saved plans",
        short_name: "Saved",
        description: "Open saved places and outings.",
        url: "/saved?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      }
    ]
  };
}
