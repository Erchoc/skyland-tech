import { defineCommand } from "citty";
import consola from "consola";
import { execa } from "execa";

export const startCommand = defineCommand({
  meta: { name: "start", description: "Preview production build" },
  args: {
    port: { type: "string", default: "4321", description: "Port number" },
  },
  async run({ args }) {
    consola.start("Starting preview server...");
    await execa("npx", ["astro", "preview", "--port", args.port], {
      cwd: process.cwd(),
      stdio: "inherit",
    });
  },
});
