import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { injectThemePages } from "@pkg/theme/integrations/inject-pages";

export default defineConfig({
  site: "https://example.com",
  integrations: [mdx(), react(), injectThemePages()],
  vite: {
    plugins: [tailwindcss()],
  },
});
