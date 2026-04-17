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
      // prompt 而非 autoUpdate：避免 SW 更新时自动重载造成的刷新白屏
      registerType: "prompt",
      manifest: {
        name: "技术分享",
        short_name: "技术分享",
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
        // precache 只保留小静态资源：HTML 和字体都走 runtime
        // - HTML 踢出：98 个文章页过多，且 HTML 走 precache 会被 SW 冷启动阻塞 → 白屏
        // - 字体踢出：5.2MB 进 precache 会拖慢 SW install → 首次装 PWA 长时间 pending
        globPatterns: ["**/*.{css,js,svg,png,jpg,jpeg,gif,webp}"],
        // navigation preload：让 HTML 请求和 SW 启动并行，消除 SW 冷启动间隙的白屏
        navigationPreload: true,
        // 离线/SW 未就绪时所有 navigation 兜底到首页，避免浏览器 hang 住
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/\/_astro\//, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          // HTML / 页面导航：NetworkFirst + 3s 超时，网络挂了回退 cache
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 本地字体：CacheFirst，一次加载永久命中
          {
            urlPattern: /\.(?:woff2?|ttf)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts-local",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts（DM Sans / JetBrains Mono 走 CDN）
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
