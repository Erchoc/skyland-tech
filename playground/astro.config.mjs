import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

function injectThemePages() {
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

export default defineConfig({
  integrations: [mdx(), react(), injectThemePages()],
  vite: {
    plugins: [tailwindcss()],
  },
});
