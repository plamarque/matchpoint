import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/maskable.svg", "icons/icon.svg"],
      manifest: {
        id: base,
        name: "Matchpoint",
        short_name: "Matchpoint",
        description: "Tableau d'affichage PWA pour matches d'improvisation.",
        theme_color: "#081724",
        background_color: "#081724",
        display: "standalone",
        // Pas d'orientation forcée : l'affichage peut rester en paysage (écran/projecteur),
        // la télécommande (/control, /remote) reste utilisable en portrait sur téléphone.
        start_url: base,
        scope: base,
        lang: "fr",
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
          { src: `${base}icons/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: `${base}icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: `${base}icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: `${base}icons/maskable.svg`, sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,json}"],
        navigateFallback: base === "/" ? "/index.html" : `${base}index.html`,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true,
        type: "module"
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
