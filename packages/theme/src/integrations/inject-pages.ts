import type { AstroIntegration } from "astro";
import type { ThemeConfig } from "../config/schema.ts";

export function injectThemePages(config?: ThemeConfig): AstroIntegration {
  return {
    name: "theme-inject-pages",
    hooks: {
      "astro:config:setup"({ injectRoute }) {
        injectRoute({ pattern: "/", entrypoint: "@pkg/theme/pages/index.astro" });
        injectRoute({
          pattern: "/posts/[...slug]",
          entrypoint: "@pkg/theme/pages/posts/[...slug].astro",
        });
        injectRoute({ pattern: "/tags", entrypoint: "@pkg/theme/pages/tags/index.astro" });
        injectRoute({ pattern: "/tags/[tag]", entrypoint: "@pkg/theme/pages/tags/[tag].astro" });
        injectRoute({ pattern: "/page/[page]", entrypoint: "@pkg/theme/pages/page/[page].astro" });
        if (config?.features.rss !== false) {
          injectRoute({ pattern: "/rss.xml", entrypoint: "@pkg/theme/pages/rss.xml.ts" });
        }
        if (config?.features.slides !== false) {
          injectRoute({
            pattern: "/slides/[...slug]",
            entrypoint: "@pkg/theme/pages/slides/[...slug].astro",
          });
        }
      },
    },
  };
}
