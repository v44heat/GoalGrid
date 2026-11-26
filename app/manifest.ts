import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. This is what lets phones offer "Install app" / "Add to Home Screen".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "eFootball League Manager",
    short_name: "eFootball",
    description: "Fixtures, results and standings for our private eFootball league.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#07140e",
    theme_color: "#07140e",
    categories: ["sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Standings", url: "/standings" },
      { name: "Fixtures", url: "/fixtures" },
      { name: "Results", url: "/results" },
      { name: "My account", url: "/account" },
    ],
  };
}
