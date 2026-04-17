# Skyland Tech · 空岛云技术

> 一个基于 Astro 5 的现代化技术博客框架，承载个人技术与架构设计文章合集。

主题层与内容层解耦：`@pkg/theme` 提供可复用布局、组件与 content collection，`playground` 是真正跑的博客站点，双端通过 `injectThemePages()` 以"约定大于配置"的方式拼装路由。

## 特性

- **内容**：MDX + Frontmatter，内嵌 Mermaid 图表、medium-zoom 图片放大、Slidev 风演讲模式
- **PWA**：Workbox runtime caching，HTML / 字体 / 静态资源分层缓存策略
- **SEO**：自动 `sitemap.xml`、RSS feed
- **中文排版**：霞鹜文楷 Lite (LXGW WenKai) 本地字体 + preload 消减 FOUT
- **移动端**：点击反馈、分页/卡片触感优化、maskable PWA icon
- **工程化**：pnpm 10 monorepo、Biome 代码检查、GitHub Actions CI

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Astro 5 |
| UI | React 19、Tailwind v4 |
| 内容 | `@astrojs/mdx`、`@astrojs/rss`、`@astrojs/sitemap` |
| PWA | `@vite-pwa/astro`（Workbox） |
| 可视化 | `mermaid`、`medium-zoom` |
| 工具链 | pnpm 10、Biome、TypeScript 5.7 |

## 快速开始

```bash
# 环境要求：Node 24+ / pnpm 10+
pnpm install

pnpm dev       # 启动本地开发（默认读取 playground/posts）
pnpm mock      # 用 MOCK_POSTS=1 塞入假数据，验证分页等边界
pnpm build     # 产物输出到 playground/dist
pnpm start     # 本地预览产物
pnpm lint      # Biome 检查
pnpm lint:fix  # Biome 自动修复
```

## 目录结构

```
.
├── packages/
│   ├── theme/        # @pkg/theme — 可复用布局、组件、content collection 定义
│   └── cli/          # @pkg/cli  — 脚手架 CLI（init / 发布等，WIP）
├── playground/
│   ├── posts/        # 博客文章源（每篇一个目录 + index.mdx）
│   ├── src/          # 站点特定页面与配置
│   ├── public/       # 静态资源（icon、字体、favicon）
│   ├── astro.config.mjs
│   └── config.toml   # 站点信息（title、url、social、features 开关）
├── DESIGN.md         # 设计系统（HashiCorp 风格参考）
├── TODO.md           # 路线图 + 技术债
└── vercel.json
```

## 写一篇新文章

在 `playground/posts/<slug>/index.mdx` 新建：

```mdx
---
title: "标题"
subtitle: "副标题（可选）"
date: 2026-05-01
tags: ["平台工程", "基础设施"]
category: "架构设计"
series: "系列名（可选）"
seriesOrder: 1
author: "龙野"
draft: false               # true 时不会被构建进产物
description: "SEO 描述"
---

## 正文

支持所有 MDX 特性：代码块、Mermaid、React 组件、图片放大……
```

## 部署到 Vercel

仓库已预置 `vercel.json`，在 Vercel 控制台 **Import Git Repository** 即可，无需额外配置：

```json
{
  "buildCommand": "pnpm --filter playground build",
  "outputDirectory": "dist",
  "installCommand": "pnpm install"
}
```

首次部署后建议：

1. **Project Settings → General → Node.js Version** 调到 `24.x`（与 CI 对齐）
2. 绑定自定义域名后，同步更新：
   - `playground/astro.config.mjs` 的 `site`
   - `playground/config.toml` 的 `[site].url`
   - 否则 sitemap / RSS 里的绝对链接会错

## 设计与路线图

- **设计系统**：参见 [`DESIGN.md`](./DESIGN.md)（HashiCorp 风格 token 体系）
- **已规划/技术债**：参见 [`TODO.md`](./TODO.md)

## License

MIT
