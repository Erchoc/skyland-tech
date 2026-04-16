import type { AstroIntegration } from "astro";

export function injectThemePages(): AstroIntegration {
  return {
    name: "theme-inject-pages",
    hooks: {
      "astro:config:setup"({ injectRoute }) {
        injectRoute({ pattern: "/", entrypoint: "@pkg/theme/pages/index.astro" });
        injectRoute({ pattern: "/posts/[...slug]", entrypoint: "@pkg/theme/pages/posts/[...slug].astro" });
        injectRoute({ pattern: "/tags", entrypoint: "@pkg/theme/pages/tags/index.astro" });
        injectRoute({ pattern: "/tags/[tag]", entrypoint: "@pkg/theme/pages/tags/[tag].astro" });
      },
    },
  };
}
