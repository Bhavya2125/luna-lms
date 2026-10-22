import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Luna Wave",
    short_name: "Luna Wave",
    description: "Colleges, sponsors and artists in one pipeline.",
    id: "/",
    start_url: "/colleges",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Colleges", url: "/colleges" },
      { name: "Sponsors", url: "/sponsors" },
      { name: "Artist roster", url: "/roster" },
    ],
  };
}
