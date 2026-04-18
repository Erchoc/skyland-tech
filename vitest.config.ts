// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.{ts,tsx,mjs}",
      "scripts/**/*.test.{ts,mjs}",
    ],
    environment: "node",
  },
});
