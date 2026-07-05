import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plant Care",
    short_name: "Plants",
    description: "Personal plant care scheduler",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f0fdf4",
    theme_color: "#166534",
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
