import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import AstroPWA from "@vite-pwa/astro";
import tailwindcss from "@tailwindcss/vite";
import { injectThemePages } from "@pkg/theme/integrations/inject-pages";

export default defineConfig({
  site: "https://example.com",
  integrations: [
    mdx(),
    react(),
    sitemap(),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: {
        name: "空岛云技术",
        short_name: "空岛云",
        description: "纯技术 + 架构设计文章合集",
        start_url: "/",
        display: "standalone",
        theme_color: "#15181e",
        background_color: "#15181e",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Precache all static HTML, CSS, JS
        globPatterns: ["**/*.{css,js,html,svg,png,jpg,jpeg,gif,webp,woff,woff2}"],
        // Runtime caching for fonts
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    injectThemePages(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
