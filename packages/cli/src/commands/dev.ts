import { defineCommand } from "citty";
import consola from "consola";
import { execa } from "execa";
import { loadConfig } from "../utils/config.js";

export const devCommand = defineCommand({
  meta: { name: "dev", description: "Start dev server" },
  args: {
    port: { type: "string", default: "4321", description: "Port number" },
  },
  async run({ args }) {
    const cwd = process.cwd();
    const config = loadConfig(cwd);
    consola.start(`Starting dev server for "${config.site.title}"...`);

    await execa("npx", ["astro", "dev", "--port", args.port], {
      cwd,
      stdio: "inherit",
      env: { SITE_CONFIG: JSON.stringify(config) },
    });
  },
});
