import { defineCommand } from "citty";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import consola from "consola";

const defaultConfig = `[site]
title = "My Tech Blog"
description = "技术文章合集"
author = ""
url = "https://example.com"
lang = "zh-CN"

[theme]
color = "#6366f1"
dark = true
layout = "magazine"

[social]
github = ""

[categories]
list = ["架构设计", "工程实践", "性能优化", "基础设施"]

[features]
pwa = true
slides = true
search = true
rss = true
`;

const defaultPackageJson = (name: string) => JSON.stringify({
  name,
  private: true,
  type: "module",
  scripts: {
    dev: "pkg dev",
    build: "pkg build",
    start: "pkg start",
  },
  dependencies: {
    "@pkg/cli": "latest",
    "@pkg/theme": "latest",
  },
}, null, 2);

export const initCommand = defineCommand({
  meta: { name: "init", description: "Initialize a new project" },
  args: {
    dir: { type: "positional", description: "Project directory", required: true },
  },
  run({ args }) {
    const projectDir = resolve(process.cwd(), args.dir);

    mkdirSync(resolve(projectDir, "posts"), { recursive: true });
    mkdirSync(resolve(projectDir, "public"), { recursive: true });

    writeFileSync(resolve(projectDir, "config.toml"), defaultConfig);
    writeFileSync(resolve(projectDir, "package.json"), defaultPackageJson(args.dir));
    writeFileSync(resolve(projectDir, ".gitignore"), "node_modules/\ndist/\n.astro/\n.vercel/\n");

    consola.success(`Project created at ${args.dir}/`);
    consola.info("");
    consola.info("  Next steps:");
    consola.info(`  cd ${args.dir}`);
    consola.info("  pnpm install");
    consola.info("  pnpm dev");
  },
});
