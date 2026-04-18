export type AnalyticsProvider = "umami" | "none";
export type AnimationVariant = "slide-up" | "fade" | "wipe" | "typewriter" | "none";
export type AnimationLocation = "hero" | "article-title" | "article-subtitle" | "nav-logo";
export type ReducedMotionMode = "respect" | "force-off";
export type SearchEngine = "pagefind" | "none";
export type SubsetStrategy = "scan" | "baseline" | "hybrid";

export interface ThemeConfig {
  site: { title: string; description: string; author: string; url: string; lang: string };
  theme: { color: string; dark: boolean; layout: string };
  social: Record<string, string>;
  categories: { list: string[] };
  features: {
    pwa: boolean;
    slides: boolean;
    search: boolean;
    rss: boolean;
    animation: boolean;
  };
  animation: {
    variant: AnimationVariant;
    duration: number;
    stagger: number;
    apply_to: AnimationLocation[];
    reduced_motion: ReducedMotionMode;
  };
  search: {
    engine: SearchEngine;
    shortcut: string | string[];
    placeholder: string;
    weights: { title: number; tags: number; body: number };
  };
  fonts: {
    subset_strategy: SubsetStrategy;
    baseline_charset: string;
    scan_globs: string[];
    preload: boolean;
  };
  analytics: {
    provider: AnalyticsProvider;
    site_id: string;
    script_src: string;
    host_url: string;
    track_search: boolean;
    respect_dnt: boolean;
  };
}
