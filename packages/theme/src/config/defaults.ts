import type { ThemeConfig } from "./schema.ts";

export const DEFAULTS: ThemeConfig = {
  site: { title: "", description: "", author: "", url: "", lang: "zh-CN" },
  theme: { color: "#2264d6", dark: true, layout: "magazine" },
  social: {},
  categories: { list: [] },
  features: { pwa: true, slides: true, search: true, rss: true, animation: true },
  animation: {
    variant: "slide-up",
    duration: 550,
    stagger: 100,
    apply_to: ["hero", "article-title", "article-subtitle", "nav-logo"],
    reduced_motion: "respect",
  },
  search: {
    engine: "pagefind",
    shortcut: "mod+k",
    placeholder: "搜索文章...",
    weights: { title: 10, tags: 5, body: 1 },
  },
  fonts: {
    subset_strategy: "hybrid",
    baseline_charset: "cjk-3500",
    scan_globs: ["playground/posts/**/*.mdx", "packages/theme/src/**/*.{astro,tsx,ts}"],
    preload: true,
  },
};
