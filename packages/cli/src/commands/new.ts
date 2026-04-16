import { defineCommand } from "citty";
import { mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import consola from "consola";

export const newCommand = defineCommand({
  meta: { name: "new", description: "Create a new post" },
  args: {
    title: { type: "positional", description: "Post title", required: true },
  },
  run({ args }) {
    const cwd = process.cwd();
    const slug = args.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-|-$/g, "");

    const postsDir = resolve(cwd, "posts");
    const existing = existsSync(postsDir)
      ? readdirSync(postsDir).filter((f: string) => !f.startsWith(".")).length
      : 0;
    const prefix = String(existing + 1).padStart(2, "0");
    const dirName = `${prefix}-${slug}`;
    const postDir = resolve(postsDir, dirName);

    mkdirSync(resolve(postDir, "assets"), { recursive: true });

    const today = new Date().toISOString().split("T")[0];
    const frontmatter = `---
title: "${args.title}"
subtitle: ""
date: ${today}
author: ""
tags: []
category: "架构设计"
series: ""
seriesOrder: ${existing + 1}
draft: true
description: ""
---

# ${args.title}

开始写作...
`;

    writeFileSync(resolve(postDir, "index.mdx"), frontmatter);
    consola.success(`Created: posts/${dirName}/`);
    consola.info(`  ├── index.mdx`);
    consola.info(`  └── assets/`);
  },
});
