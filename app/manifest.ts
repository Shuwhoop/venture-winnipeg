import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Venture",
    short_name: "Venture",
    description: "Discover trustworthy events, restaurants, and complete outings in Winnipeg.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6d28d9",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
