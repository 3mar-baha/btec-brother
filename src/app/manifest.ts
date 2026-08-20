import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BTEC Hub",
    short_name: "BTEC Hub",
    description: "منصة داخلية لإدارة تكليفات BTEC",
    start_url: "/market",
    display: "standalone",
    background_color: "#f9f7f3",
    theme_color: "#ea2804",
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
