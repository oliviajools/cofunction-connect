import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CoFunction Wissen",
    short_name: "CoFunction",
    description: "Wissen erfassen und teilen – CoFunction",
    start_url: "/erfassen",
    display: "standalone",
    background_color: "#f3f5f7",
    theme_color: "#586a7a",
    lang: "de",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
