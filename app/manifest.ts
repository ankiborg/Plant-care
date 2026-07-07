import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fern — plant care",
    short_name: "Fern",
    description: "A calm home for your plants.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f3ec",
    theme_color: "#1f4732",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
