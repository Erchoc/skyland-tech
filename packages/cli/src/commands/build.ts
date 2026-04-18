import { defineCommand } from "citty";
import consola from "consola";
import { execa } from "execa";
import { loadConfig } from "../utils/config.js";

export const buildCommand = defineCommand({
  meta: { name: "build", description: "Build for production" },
  async run() {
    const cwd = process.cwd();
    const config = loadConfig(cwd);
    consola.start(`Building "${config.site.title}"...`);

    await execa("npx", ["astro", "build"], {
      cwd,
      stdio: "inherit",
      env: { SITE_CONFIG: JSON.stringify(config) },
    });

    consola.success("Build complete!");
  },
});
