# 技术文章发布框架 — 设计文档

> 日期：2026-04-16
> 状态：已确认

## 概述

构建一个开箱即用的技术文章发布框架（CLI 工具），用户通过一条命令安装，维护一个 `config.toml` 配置文件和 `posts/` 文章目录，即可在本地启动杂志/作品集风格的技术博客站点，并一键部署到 Vercel。

年度目标：发布 20 篇纯技术 + 架构设计文章（空岛云技术系列）。

## 方案选型

**选定方案：Astro 纯自建 + 自定义设计系统（方案 B）**

- Astro 裸框架 + Tailwind CSS + MDX + React 岛屿组件
- 设计自由度 100%，杂志/作品集风格完全定制
- 不依赖 Starlight 等主题框架，避免和默认行为冲突

## 项目架构

### Monorepo 结构（pnpm workspace）

```
<root>/
├── packages/
│   ├── cli/                      # CLI 工具 — npm 发布包
│   │   ├── src/
│   │   │   ├── index.ts          # CLI 入口 (citty)
│   │   │   ├── commands/
│   │   │   │   ├── init.ts       # <pkg> init
│   │   │   │   ├── dev.ts        # <pkg> dev → astro dev
│   │   │   │   ├── build.ts      # <pkg> build → astro build
│   │   │   │   ├── start.ts      # <pkg> start
│   │   │   │   └── new.ts        # <pkg> new "title"
│   │   │   └── utils/
│   │   │       ├── config.ts     # 读取 config.toml → 注入 Astro 配置
│   │   │       └── scaffold.ts   # init 模板生成
│   │   └── package.json
│   │
│   ├── theme/                    # @<pkg>/theme — 核心主题包
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/           # Card, Tag, Button...
│   │   │   │   ├── article/      # TOC, CodeBlock, ImageZoom...
│   │   │   │   ├── interactive/  # Mermaid, Chart, Demo (React 岛屿)
│   │   │   │   ├── slide/        # Slide 演讲模式组件
│   │   │   │   └── layout/       # Header, Footer, Navigation
│   │   │   ├── layouts/
│   │   │   │   ├── BaseLayout.astro
│   │   │   │   ├── ArticleLayout.astro
│   │   │   │   └── SlideLayout.astro
│   │   │   ├── pages/
│   │   │   │   ├── index.astro           # 杂志风格首页
│   │   │   │   ├── posts/[...slug].astro # 文章动态路由
│   │   │   │   ├── tags/[tag].astro      # 标签归档页
│   │   │   │   └── slides/[...slug].astro# Slide 模式路由
│   │   │   ├── styles/
│   │   │   │   └── global.css
│   │   │   └── integrations/     # Astro 集成（PWA、Mermaid 等）
│   │   └── package.json
│   │
│   └── create-<pkg>/             # npm create <pkg> — 可选初始化方式
│       └── ...
│
├── playground/                   # 本地开发测试用示例站点
│   ├── config.toml
│   └── posts/
│
├── .github/workflows/
│   ├── ci.yml                    # 类型检查 + lint
│   └── release.yml               # changesets 自动发布到 npm
├── pnpm-workspace.yaml
└── package.json
```

> 注：`<pkg>` 为项目/CLI 名称占位符，待定。

## 用户使用体验

### 安装与初始化

```bash
# 全局安装
pnpm add -g <pkg>

# 初始化项目
<pkg> init my-blog
cd my-blog
```

### 用户项目结构

```
my-blog/
├── config.toml           # 唯一配置文件
├── posts/                # 文章目录
│   ├── 01-origin/
│   │   ├── index.mdx
│   │   └── assets/
│   └── 02-why-kongdao/
│       ├── index.mdx
│       └── assets/
└── public/               # 可选，自定义静态资源
```

### 命令

```bash
<pkg> dev                 # 本地开发，热更新
<pkg> build               # 生产构建
<pkg> start               # 预览生产构建
<pkg> new "文章标题"       # 快速创建新文章

# 也兼容 pnpm scripts
pnpm dev / pnpm build / pnpm start
```

## 配置文件设计（config.toml）

```toml
[site]
title = "空岛云技术"
description = "纯技术 + 架构设计文章合集"
author = "龙野"
url = "https://ata.example.com"
lang = "zh-CN"

[theme]
color = "#6366f1"          # 主题色，自动生成配色方案
dark = true                # 默认启用暗色模式
layout = "magazine"        # magazine | grid | minimal

[social]
github = "https://github.com/xxx"

[categories]
list = ["架构设计", "工程实践", "性能优化", "基础设施"]

[features]
pwa = true
slides = true
search = true
rss = true
```

## 文章 Frontmatter Schema

```yaml
---
title: "空岛云技术：一切的起点"
subtitle: "从零到一构建云原生 PaaS 平台"
date: 2026-01-15
updatedDate: 2026-02-10          # 可选
author: "龙野"
cover: "./assets/cover.png"
tags: ["架构设计", "云原生", "Node.js"]
category: "架构设计"              # 架构设计 | 工程实践 | 性能优化 | 基础设施
series: "空岛云技术"
seriesOrder: 1
draft: false
description: "本文介绍空岛云平台的技术背景和整体架构设计思路..."
---
```

Content Collections Schema（`config.ts`）使用 Zod 校验所有字段。

## 页面与交互体验设计

### 首页（杂志/作品集风格）

- Hero 区域：大标题 + 副标题 + 粒子/渐变动画背景
- 精选文章：最新或置顶 1-2 篇，大卡片布局
- 文章网格：瀑布流或等高卡片（封面图 + 标题 + 标签 + 阅读时间 + 日期）
- 系列导航：按 series 分组展示
- 暗色/亮色切换：右上角 toggle，默认跟随系统

### 文章详情页

- 顶部全宽封面图 + 标题覆盖（Medium 风格）
- 元信息栏：作者、日期、阅读时间、标签
- Tailwind Typography prose 排版 + Shiki 代码高亮
- 右侧浮动 TOC，滚动高亮当前章节，移动端收起为抽屉
- 系列导航：底部上一篇/下一篇
- 图片点击放大（medium-zoom）

### Slide 演讲模式

- URL 路径 `/slides/<slug>` 进入演讲视图
- MDX 中用 `---` 或 `<Slide>` 组件标记分页
- 键盘左右翻页，F 全屏，Esc 退出
- 手机端支持触摸滑动
- 保留代码高亮和 Mermaid 渲染

### 交互式组件（React 岛屿）

| 组件 | 用途 | 水合策略 |
|------|------|----------|
| `<Mermaid>` | 架构图、流程图、时序图 | `client:visible` |
| `<Chart>` | 性能数据可视化 | `client:visible` |
| `<CodeSandbox>` | 嵌入式代码 Demo | `client:idle` |
| `<AnimatedDiagram>` | 动画演示 | `client:visible` |
| `<ThemeToggle>` | 暗色模式切换 | `client:load` |

## 响应式设计

| 断点 | 设备 | 布局 |
|------|------|------|
| `< 640px` | 手机 H5 | 单列卡片、TOC 抽屉、汉堡菜单、Slide 触摸滑动 |
| `640-1024px` | iPad 竖屏 | 双列卡片、TOC 顶部折叠 |
| `1024-1440px` | iPad 横屏/笔记本 | 三列卡片、右侧浮动 TOC |
| `> 1440px` | 大屏 | `max-w-7xl` 居中、四列卡片可选 |

- 文章正文 `65ch` 最大行宽
- 图片和代码块允许 full-bleed 突破正文宽度
- Slide 模式自动适配屏幕比例

## PWA 支持

- `vite-plugin-pwa` 集成
- Service Worker 缓存已访问文章（离线可读）
- 可安装到桌面，全屏体验
- `manifest.json` 配置图标、主题色、启动画面
- 离线 fallback 页面

## 部署方案

- **Vercel**：push 自动构建部署，PR 自动预览
- **GitHub Actions CI**：轻量质量检查（类型检查 + lint）
- **GitHub Actions Release**：changesets 自动发布 npm 包

```
push to main ──→ Vercel 自动构建部署（生产环境）
push to PR   ──→ Vercel 预览部署 + CI lint 检查
```

## 技术选型清单

### 核心框架

| 技术 | 用途 |
|------|------|
| Astro 5 | 站点引擎 |
| React 19 | 交互组件（岛屿水合） |
| Tailwind CSS 4 | 样式系统 |
| MDX | 文章格式 |
| TypeScript | 全局类型安全 |

### CLI 工具链

| 技术 | 用途 |
|------|------|
| citty | CLI 框架 |
| smol-toml | 解析 config.toml |
| consola | 终端美化输出 |
| giget | init 命令拉取模板 |

### 内容增强

| 技术 | 用途 |
|------|------|
| Shiki | 代码高亮（Astro 内置） |
| mermaid | 架构图/流程图/时序图 |
| rehype-pretty-code | 代码块增强 |
| reading-time | 阅读时间 |
| medium-zoom | 图片放大 |

### 演讲模式

| 技术 | 用途 |
|------|------|
| reveal.js | Slide 引擎 |

### PWA & 部署

| 技术 | 用途 |
|------|------|
| vite-plugin-pwa | PWA 支持 |
| @astrojs/vercel | Vercel 适配器 |
| @astrojs/sitemap | SEO sitemap |
| astro-og-canvas | OG 社交分享图 |

### 工程化

| 技术 | 用途 |
|------|------|
| pnpm workspace | monorepo |
| biome | lint + format |
| changesets | 版本管理 + npm 发布 |
| lefthook | git hooks |

## CLI 核心机制

1. `<pkg> dev` → 读取 `config.toml` → 生成临时 Astro 配置 → 调用 `astro dev`
2. 用户 `posts/` 目录映射为 Astro Content Collections 数据源
3. `@<pkg>/theme` 提供所有页面、组件、样式
4. 未来可支持自定义组件覆盖（类 Docusaurus swizzle）
