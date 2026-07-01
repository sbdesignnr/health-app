import type { MetadataRoute } from "next";

// PWA manifest – umožní "Pridať na plochu" na iOS/Androide.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Health Assistant",
    short_name: "Health",
    description: "Osobný zdravotný a fitness asistent",
    start_url: "/dnes",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      // TODO (asset): doplniť reálne ikony do public/icons/ (Fáza 4)
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
