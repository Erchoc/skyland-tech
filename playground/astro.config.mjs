import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import AstroPWA from "@vite-pwa/astro";
import tailwindcss from "@tailwindcss/vite";
import { injectThemePages } from "@pkg/theme/integrations/inject-pages";

const ACCENT = "#2264d6";
const DARK_BG = "#15181e";
const ONE_WEEK = 60 * 60 * 24 * 7;
const ONE_YEAR = 60 * 60 * 24 * 365;

export default defineConfig({
  site: "https://skyland-tech.vercel.app",
  integrations: [
    mdx(),
    react(),
    sitemap(),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: {
        name: "技术分享",
        description: "纯技术 + 架构设计文章合集",
        start_url: "/",
        display: "standalone",
        theme_color: ACCENT,
        background_color: DARK_BG,
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
        globPatterns: ["**/*.{css,js,svg,png,jpg,jpeg,gif,webp}"],
        // HTML 和字体走 runtime caching（不 precache）：避免 SW install 阻塞 → 白屏
        navigationPreload: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/\/_astro\//, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 120, maxAgeSeconds: ONE_WEEK },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:woff2?|ttf)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-local",
              expiration: { maxEntries: 5, maxAgeSeconds: ONE_YEAR },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: ONE_YEAR },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: ONE_YEAR },
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
