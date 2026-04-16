# 技术文章发布框架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建开箱即用的技术文章发布框架 CLI，用户维护 config.toml + posts/ 即可本地运行杂志风格技术博客

**Architecture:** pnpm monorepo 三包结构（cli + theme + create-xxx），CLI 是 Astro 的薄封装，读取用户 config.toml 注入 Astro 配置，theme 包提供所有页面/组件/样式

**Tech Stack:** Astro 5, React 19, Tailwind CSS 4, MDX, TypeScript, citty, smol-toml, biome, changesets

---

## Phase 1: Monorepo 基础骨架

### Task 1: 初始化 monorepo 根目录

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `biome.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: 初始化 git 仓库**

```bash
git init
```

- [ ] **Step 2: 创建根 package.json**

```json
{
  "name": "tech-blog-framework",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm -C playground dev",
    "build": "pnpm -C playground build",
    "start": "pnpm -C playground start",
    "lint": "biome check .",
    "lint:fix": "biome check --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@10.32.1"
}
```

- [ ] **Step 3: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "playground"
```

- [ ] **Step 4: 创建 biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "double", "semicolons": "always" }
  }
}
```

- [ ] **Step 5: 创建根 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  },
  "exclude": ["node_modules", "dist", "**/dist"]
}
```

- [ ] **Step 6: 创建 .gitignore**

```
node_modules/
dist/
.astro/
.vercel/
.output/
*.tsbuildinfo
.DS_Store
.temp/
```

- [ ] **Step 7: 安装依赖**

Run: `pnpm install`

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: init monorepo skeleton"
```

---

### Task 2: 创建 theme 包骨架

**Files:**
- Create: `packages/theme/package.json`
- Create: `packages/theme/tsconfig.json`
- Create: `packages/theme/src/styles/global.css`
- Create: `packages/theme/src/content.config.ts`

- [ ] **Step 1: 创建 theme package.json**

```json
{
  "name": "@pkg/theme",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./styles/*": "./src/styles/*",
    "./layouts/*": "./src/layouts/*",
    "./components/*": "./src/components/*",
    "./pages/*": "./src/pages/*",
    "./content-config": "./src/content.config.ts"
  },
  "peerDependencies": {
    "astro": "^5.0.0"
  },
  "dependencies": {
    "@astrojs/mdx": "^4.0.0",
    "@astrojs/react": "^4.0.0",
    "@astrojs/sitemap": "^3.2.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "medium-zoom": "^1.1.0",
    "reading-time": "^1.5.0",
    "mermaid": "^11.0.0"
  }
}
```

- [ ] **Step 2: 创建 theme tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 global.css（Tailwind 4 入口）**

```css
@import "tailwindcss";

@theme {
  --color-primary: #6366f1;
  --color-primary-light: #818cf8;
  --color-primary-dark: #4f46e5;
  --font-sans: "Inter", "Noto Sans SC", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
}

@layer base {
  :root {
    --bg: #ffffff;
    --text: #1a1a2e;
    --surface: #f8f9fa;
    --border: #e2e8f0;
  }

  .dark {
    --bg: #0f0f1a;
    --text: #e2e8f0;
    --surface: #1a1a2e;
    --border: #2d2d44;
  }

  html {
    background-color: var(--bg);
    color: var(--text);
    scroll-behavior: smooth;
  }

  body {
    font-family: var(--font-sans);
    min-height: 100dvh;
  }
}
```

- [ ] **Step 4: 创建 Content Collections schema**

```typescript
// packages/theme/src/content.config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "*/index.mdx", base: "./posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string(),
      cover: image().optional(),
      tags: z.array(z.string()).default([]),
      category: z.enum(["架构设计", "工程实践", "性能优化", "基础设施"]),
      series: z.string().optional(),
      seriesOrder: z.number().optional(),
      draft: z.boolean().default(false),
      description: z.string(),
    }),
});

export const collections = { posts };
```

- [ ] **Step 5: Commit**

```bash
git add packages/theme/
git commit -m "feat: add theme package skeleton with content schema"
```

---

### Task 3: 创建 theme 基础布局

**Files:**
- Create: `packages/theme/src/layouts/BaseLayout.astro`
- Create: `packages/theme/src/components/layout/Header.astro`
- Create: `packages/theme/src/components/layout/Footer.astro`
- Create: `packages/theme/src/components/ui/ThemeToggle.tsx`

- [ ] **Step 1: 创建 BaseLayout.astro**

```astro
---
// packages/theme/src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description?: string;
}

const { title, description = "" } = Astro.props;
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content={description} />
    <title>{title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <script is:inline>
      const theme = localStorage.getItem("theme") ??
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    </script>
  </head>
  <body class="min-h-dvh bg-[var(--bg)] text-[var(--text)] transition-colors">
    <slot />
  </body>
</html>
```

- [ ] **Step 2: 创建 Header.astro**

```astro
---
// packages/theme/src/components/layout/Header.astro
import ThemeToggle from "../ui/ThemeToggle.tsx";

interface Props {
  title: string;
}

const { title } = Astro.props;
---

<header class="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-lg">
  <nav class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
    <a href="/" class="text-xl font-bold tracking-tight">{title}</a>
    <div class="flex items-center gap-6">
      <a href="/" class="text-sm hover:text-primary transition-colors">首页</a>
      <a href="/tags" class="text-sm hover:text-primary transition-colors hidden sm:block">标签</a>
      <ThemeToggle client:load />
    </div>
  </nav>
</header>
```

- [ ] **Step 3: 创建 Footer.astro**

```astro
---
// packages/theme/src/components/layout/Footer.astro
const year = new Date().getFullYear();
---

<footer class="border-t border-[var(--border)] py-8 mt-20">
  <div class="mx-auto max-w-7xl px-6 text-center text-sm text-[var(--text)]/60">
    <p>&copy; {year} · Built with Astro</p>
  </div>
</footer>
```

- [ ] **Step 4: 创建 ThemeToggle.tsx（React 岛屿）**

```tsx
// packages/theme/src/components/ui/ThemeToggle.tsx
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="切换主题"
      class="rounded-lg p-2 hover:bg-[var(--surface)] transition-colors"
    >
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/theme/src/
git commit -m "feat: add base layout with header, footer, theme toggle"
```

---

### Task 4: 创建首页（杂志/作品集风格）

**Files:**
- Create: `packages/theme/src/pages/index.astro`
- Create: `packages/theme/src/components/ui/PostCard.astro`
- Create: `packages/theme/src/components/ui/HeroSection.astro`
- Create: `packages/theme/src/utils/reading-time.ts`

- [ ] **Step 1: 创建 reading-time 工具**

```typescript
// packages/theme/src/utils/reading-time.ts
export function getReadingTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const cjkChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalWords = words + cjkChars;
  const minutes = Math.max(1, Math.ceil(totalWords / 300));
  return `${minutes} min`;
}
```

- [ ] **Step 2: 创建 HeroSection.astro**

```astro
---
// packages/theme/src/components/ui/HeroSection.astro
interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
---

<section class="relative overflow-hidden py-24 sm:py-32 lg:py-40">
  <div class="absolute inset-0 -z-10">
    <div class="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary-dark/10 dark:from-primary/10 dark:to-primary-dark/5" />
    <div class="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
    <div class="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-primary-light/10 blur-3xl" />
  </div>
  <div class="mx-auto max-w-4xl px-6 text-center">
    <h1 class="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
      {title}
    </h1>
    <p class="mt-6 text-lg text-[var(--text)]/70 sm:text-xl leading-relaxed">
      {description}
    </p>
  </div>
</section>
```

- [ ] **Step 3: 创建 PostCard.astro**

```astro
---
// packages/theme/src/components/ui/PostCard.astro
import type { ImageMetadata } from "astro";

interface Props {
  title: string;
  description: string;
  date: Date;
  tags: string[];
  cover?: ImageMetadata;
  slug: string;
  readingTime: string;
  featured?: boolean;
}

const { title, description, date, tags, cover, slug, readingTime, featured } = Astro.props;

const formattedDate = date.toLocaleDateString("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
---

<a
  href={`/posts/${slug}`}
  class:list={[
    "group block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all hover:shadow-xl hover:-translate-y-1",
    featured && "sm:col-span-2 sm:grid sm:grid-cols-2",
  ]}
>
  {cover && (
    <div class="aspect-video overflow-hidden">
      <img
        src={cover.src}
        width={cover.width}
        height={cover.height}
        alt={title}
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
    </div>
  )}
  <div class="p-6">
    <div class="flex items-center gap-3 text-xs text-[var(--text)]/50">
      <time datetime={date.toISOString()}>{formattedDate}</time>
      <span>·</span>
      <span>{readingTime}</span>
    </div>
    <h2 class:list={[
      "mt-3 font-bold leading-tight tracking-tight",
      featured ? "text-2xl sm:text-3xl" : "text-xl",
    ]}>
      {title}
    </h2>
    <p class="mt-2 line-clamp-2 text-sm text-[var(--text)]/60 leading-relaxed">
      {description}
    </p>
    <div class="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {tag}
        </span>
      ))}
    </div>
  </div>
</a>
```

- [ ] **Step 4: 创建首页 index.astro**

```astro
---
// packages/theme/src/pages/index.astro
import { getCollection } from "astro:content";
import BaseLayout from "../layouts/BaseLayout.astro";
import Header from "../components/layout/Header.astro";
import Footer from "../components/layout/Footer.astro";
import HeroSection from "../components/ui/HeroSection.astro";
import PostCard from "../components/ui/PostCard.astro";
import { getReadingTime } from "../utils/reading-time.ts";

const posts = (await getCollection("posts", ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

const [featured, ...rest] = posts;
---

<BaseLayout title="空岛云技术" description="纯技术 + 架构设计文章合集">
  <Header title="空岛云技术" />
  <main>
    <HeroSection title="空岛云技术" description="纯技术 + 架构设计文章合集" />

    <section class="mx-auto max-w-7xl px-6 pb-20">
      {featured && (
        <div class="mb-12">
          <h2 class="mb-6 text-sm font-semibold uppercase tracking-widest text-[var(--text)]/40">精选文章</h2>
          <PostCard
            title={featured.data.title}
            description={featured.data.description}
            date={featured.data.date}
            tags={featured.data.tags}
            cover={featured.data.cover}
            slug={featured.id}
            readingTime={getReadingTime(featured.body ?? "")}
            featured
          />
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <h2 class="mb-6 text-sm font-semibold uppercase tracking-widest text-[var(--text)]/40">所有文章</h2>
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <PostCard
                title={post.data.title}
                description={post.data.description}
                date={post.data.date}
                tags={post.data.tags}
                cover={post.data.cover}
                slug={post.id}
                readingTime={getReadingTime(post.body ?? "")}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 5: Commit**

```bash
git add packages/theme/src/
git commit -m "feat: add magazine-style homepage with hero and post cards"
```

---

### Task 5: 创建文章详情页

**Files:**
- Create: `packages/theme/src/layouts/ArticleLayout.astro`
- Create: `packages/theme/src/pages/posts/[...slug].astro`
- Create: `packages/theme/src/components/article/TableOfContents.astro`

- [ ] **Step 1: 创建 ArticleLayout.astro**

```astro
---
// packages/theme/src/layouts/ArticleLayout.astro
import BaseLayout from "./BaseLayout.astro";
import Header from "../components/layout/Header.astro";
import Footer from "../components/layout/Footer.astro";
import TableOfContents from "../components/article/TableOfContents.astro";
import type { MarkdownHeading, ImageMetadata } from "astro";

interface Props {
  title: string;
  subtitle?: string;
  description: string;
  date: Date;
  updatedDate?: Date;
  author: string;
  cover?: ImageMetadata;
  tags: string[];
  readingTime: string;
  headings: MarkdownHeading[];
  series?: string;
  prevPost?: { slug: string; title: string };
  nextPost?: { slug: string; title: string };
}

const {
  title, subtitle, description, date, updatedDate, author, cover,
  tags, readingTime, headings, series, prevPost, nextPost,
} = Astro.props;

const formattedDate = date.toLocaleDateString("zh-CN", {
  year: "numeric", month: "long", day: "numeric",
});
const formattedUpdated = updatedDate?.toLocaleDateString("zh-CN", {
  year: "numeric", month: "long", day: "numeric",
});
---

<BaseLayout title={`${title} — 空岛云技术`} description={description}>
  <Header title="空岛云技术" />
  <main>
    {cover && (
      <div class="relative h-64 sm:h-80 lg:h-[28rem] w-full overflow-hidden">
        <img
          src={cover.src}
          width={cover.width}
          height={cover.height}
          alt={title}
          class="h-full w-full object-cover"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent" />
      </div>
    )}

    <article class="mx-auto max-w-7xl px-6 lg:grid lg:grid-cols-[1fr_220px] lg:gap-12">
      <div class="mx-auto max-w-[65ch]">
        <header class={cover ? "-mt-20 relative" : "pt-12"}>
          {series && (
            <span class="text-xs font-semibold uppercase tracking-widest text-primary">{series}</span>
          )}
          <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p class="mt-3 text-xl text-[var(--text)]/60">{subtitle}</p>
          )}
          <div class="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--text)]/50">
            <span>{author}</span>
            <span>·</span>
            <time datetime={date.toISOString()}>{formattedDate}</time>
            {formattedUpdated && (
              <>
                <span>·</span>
                <span>更新于 {formattedUpdated}</span>
              </>
            )}
            <span>·</span>
            <span>{readingTime}</span>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <a
                href={`/tags/${tag}`}
                class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {tag}
              </a>
            ))}
          </div>
        </header>

        <div class="prose prose-lg dark:prose-invert mt-12 max-w-none prose-headings:scroll-mt-20 prose-img:rounded-xl prose-pre:bg-[var(--surface)] prose-a:text-primary">
          <slot />
        </div>

        {(prevPost || nextPost) && (
          <nav class="mt-16 grid gap-4 sm:grid-cols-2 border-t border-[var(--border)] pt-8">
            {prevPost && (
              <a href={`/posts/${prevPost.slug}`} class="group rounded-xl border border-[var(--border)] p-4 hover:border-primary transition-colors">
                <span class="text-xs text-[var(--text)]/40">上一篇</span>
                <p class="mt-1 font-medium group-hover:text-primary transition-colors">{prevPost.title}</p>
              </a>
            )}
            {nextPost && (
              <a href={`/posts/${nextPost.slug}`} class="group rounded-xl border border-[var(--border)] p-4 hover:border-primary transition-colors sm:text-right">
                <span class="text-xs text-[var(--text)]/40">下一篇</span>
                <p class="mt-1 font-medium group-hover:text-primary transition-colors">{nextPost.title}</p>
              </a>
            )}
          </nav>
        )}
      </div>

      <aside class="hidden lg:block">
        <div class="sticky top-24">
          <TableOfContents headings={headings} />
        </div>
      </aside>
    </article>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: 创建 TableOfContents.astro**

```astro
---
// packages/theme/src/components/article/TableOfContents.astro
import type { MarkdownHeading } from "astro";

interface Props {
  headings: MarkdownHeading[];
}

const { headings } = Astro.props;
const toc = headings.filter((h) => h.depth >= 2 && h.depth <= 3);
---

{toc.length > 0 && (
  <nav class="text-sm">
    <h3 class="mb-3 font-semibold text-[var(--text)]/40 text-xs uppercase tracking-widest">目录</h3>
    <ul class="space-y-2 border-l border-[var(--border)]">
      {toc.map((heading) => (
        <li style={`padding-left: ${(heading.depth - 2) * 12 + 12}px`}>
          <a
            href={`#${heading.slug}`}
            class="block text-[var(--text)]/50 hover:text-primary transition-colors leading-snug py-0.5"
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  </nav>
)}
```

- [ ] **Step 3: 创建文章动态路由 [...slug].astro**

```astro
---
// packages/theme/src/pages/posts/[...slug].astro
import { getCollection, render } from "astro:content";
import ArticleLayout from "../../layouts/ArticleLayout.astro";
import { getReadingTime } from "../../utils/reading-time.ts";

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const sorted = posts.sort((a, b) => a.data.date.valueOf() - b.data.date.valueOf());

  return sorted.map((post, i) => ({
    params: { slug: post.id },
    props: {
      post,
      prevPost: sorted[i - 1] ? { slug: sorted[i - 1].id, title: sorted[i - 1].data.title } : null,
      nextPost: sorted[i + 1] ? { slug: sorted[i + 1].id, title: sorted[i + 1].data.title } : null,
    },
  }));
}

const { post, prevPost, nextPost } = Astro.props;
const { Content, headings } = await render(post);
---

<ArticleLayout
  title={post.data.title}
  subtitle={post.data.subtitle}
  description={post.data.description}
  date={post.data.date}
  updatedDate={post.data.updatedDate}
  author={post.data.author}
  cover={post.data.cover}
  tags={post.data.tags}
  readingTime={getReadingTime(post.body ?? "")}
  headings={headings}
  series={post.data.series}
  prevPost={prevPost}
  nextPost={nextPost}
>
  <Content />
</ArticleLayout>
```

- [ ] **Step 4: Commit**

```bash
git add packages/theme/src/
git commit -m "feat: add article detail page with TOC and series navigation"
```

---

### Task 6: 创建标签页

**Files:**
- Create: `packages/theme/src/pages/tags/index.astro`
- Create: `packages/theme/src/pages/tags/[tag].astro`

- [ ] **Step 1: 创建标签列表页 tags/index.astro**

```astro
---
// packages/theme/src/pages/tags/index.astro
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import Header from "../../components/layout/Header.astro";
import Footer from "../../components/layout/Footer.astro";

const posts = await getCollection("posts", ({ data }) => !data.draft);
const tagCounts = new Map<string, number>();
for (const post of posts) {
  for (const tag of post.data.tags) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
}
const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
---

<BaseLayout title="标签 — 空岛云技术">
  <Header title="空岛云技术" />
  <main class="mx-auto max-w-4xl px-6 py-16">
    <h1 class="text-3xl font-bold">标签</h1>
    <div class="mt-8 flex flex-wrap gap-3">
      {tags.map(([tag, count]) => (
        <a
          href={`/tags/${tag}`}
          class="rounded-full border border-[var(--border)] px-4 py-2 text-sm hover:border-primary hover:text-primary transition-colors"
        >
          {tag}
          <span class="ml-1 text-[var(--text)]/40">{count}</span>
        </a>
      ))}
    </div>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 2: 创建标签详情页 tags/[tag].astro**

```astro
---
// packages/theme/src/pages/tags/[tag].astro
import { getCollection } from "astro:content";
import BaseLayout from "../../layouts/BaseLayout.astro";
import Header from "../../components/layout/Header.astro";
import Footer from "../../components/layout/Footer.astro";
import PostCard from "../../components/ui/PostCard.astro";
import { getReadingTime } from "../../utils/reading-time.ts";

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const tags = [...new Set(posts.flatMap((p) => p.data.tags))];

  return tags.map((tag) => ({
    params: { tag },
    props: {
      tag,
      posts: posts
        .filter((p) => p.data.tags.includes(tag))
        .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf()),
    },
  }));
}

const { tag, posts } = Astro.props;
---

<BaseLayout title={`${tag} — 空岛云技术`}>
  <Header title="空岛云技术" />
  <main class="mx-auto max-w-7xl px-6 py-16">
    <h1 class="text-3xl font-bold">
      <span class="text-[var(--text)]/40">#</span> {tag}
    </h1>
    <p class="mt-2 text-[var(--text)]/50">{posts.length} 篇文章</p>
    <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard
          title={post.data.title}
          description={post.data.description}
          date={post.data.date}
          tags={post.data.tags}
          cover={post.data.cover}
          slug={post.id}
          readingTime={getReadingTime(post.body ?? "")}
        />
      ))}
    </div>
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 3: Commit**

```bash
git add packages/theme/src/pages/tags/
git commit -m "feat: add tag listing and tag detail pages"
```

---

### Task 7: 创建 CLI 包

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/dev.ts`
- Create: `packages/cli/src/commands/build.ts`
- Create: `packages/cli/src/commands/start.ts`
- Create: `packages/cli/src/commands/new.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/utils/config.ts`

- [ ] **Step 1: 创建 CLI package.json**

```json
{
  "name": "@pkg/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "pkg": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --watch"
  },
  "dependencies": {
    "citty": "^0.1.6",
    "consola": "^3.4.0",
    "smol-toml": "^1.3.0",
    "giget": "^2.0.0",
    "execa": "^9.5.0"
  },
  "devDependencies": {
    "tsup": "^8.3.0"
  }
}
```

- [ ] **Step 2: 创建 config.ts（读取 config.toml）**

```typescript
// packages/cli/src/utils/config.ts
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "smol-toml";
import consola from "consola";

export interface SiteConfig {
  site: {
    title: string;
    description: string;
    author: string;
    url: string;
    lang: string;
  };
  theme: {
    color: string;
    dark: boolean;
    layout: "magazine" | "grid" | "minimal";
  };
  social: Record<string, string>;
  categories: { list: string[] };
  features: {
    pwa: boolean;
    slides: boolean;
    search: boolean;
    rss: boolean;
  };
}

export function loadConfig(cwd: string): SiteConfig {
  const configPath = resolve(cwd, "config.toml");
  if (!existsSync(configPath)) {
    consola.error(`config.toml not found in ${cwd}`);
    process.exit(1);
  }
  const raw = readFileSync(configPath, "utf-8");
  return parse(raw) as unknown as SiteConfig;
}
```

- [ ] **Step 3: 创建 dev.ts / build.ts / start.ts 命令**

```typescript
// packages/cli/src/commands/dev.ts
import { defineCommand } from "citty";
import { execa } from "execa";
import { loadConfig } from "../utils/config.js";
import consola from "consola";

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
```

```typescript
// packages/cli/src/commands/build.ts
import { defineCommand } from "citty";
import { execa } from "execa";
import { loadConfig } from "../utils/config.js";
import consola from "consola";

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
```

```typescript
// packages/cli/src/commands/start.ts
import { defineCommand } from "citty";
import { execa } from "execa";
import consola from "consola";

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
```

- [ ] **Step 4: 创建 new.ts 命令（文章脚手架）**

```typescript
// packages/cli/src/commands/new.ts
import { defineCommand } from "citty";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
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
      ? require("node:fs").readdirSync(postsDir).filter((f: string) => !f.startsWith(".")).length
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
```

- [ ] **Step 5: 创建 init.ts 命令**

```typescript
// packages/cli/src/commands/init.ts
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
```

- [ ] **Step 6: 创建 CLI 入口 index.ts**

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { devCommand } from "./commands/dev.js";
import { buildCommand } from "./commands/build.js";
import { startCommand } from "./commands/start.js";
import { newCommand } from "./commands/new.js";
import { initCommand } from "./commands/init.js";

const main = defineCommand({
  meta: {
    name: "pkg",
    version: "0.1.0",
    description: "Tech article publishing framework",
  },
  subCommands: {
    dev: devCommand,
    build: buildCommand,
    start: startCommand,
    new: newCommand,
    init: initCommand,
  },
});

runMain(main);
```

- [ ] **Step 7: 创建 CLI tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 8: Commit**

```bash
git add packages/cli/
git commit -m "feat: add CLI package with dev/build/start/new/init commands"
```

---

### Task 8: 创建 Playground（开发测试站点）

**Files:**
- Create: `playground/config.toml`
- Create: `playground/package.json`
- Create: `playground/astro.config.mjs`
- Create: `playground/tsconfig.json`
- Create: `playground/src/content.config.ts`
- Create: `playground/posts/01-hello-world/index.mdx`
- Create: `playground/posts/01-hello-world/assets/.gitkeep`

- [ ] **Step 1: 创建 playground package.json**

```json
{
  "name": "playground",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "start": "astro preview"
  },
  "dependencies": {
    "@pkg/theme": "workspace:*",
    "astro": "^5.0.0",
    "@astrojs/mdx": "^4.0.0",
    "@astrojs/react": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 2: 创建 astro.config.mjs**

```javascript
// playground/astro.config.mjs
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [mdx(), react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 3: 创建 playground tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict"
}
```

- [ ] **Step 4: 创建 content.config.ts（复用 theme schema）**

```typescript
// playground/src/content.config.ts
export { collections } from "@pkg/theme/content-config";
```

- [ ] **Step 5: 创建 playground config.toml**

```toml
[site]
title = "空岛云技术"
description = "纯技术 + 架构设计文章合集"
author = "龙野"
url = "https://example.com"
lang = "zh-CN"

[theme]
color = "#6366f1"
dark = true
layout = "magazine"

[social]
github = "https://github.com/example"

[categories]
list = ["架构设计", "工程实践", "性能优化", "基础设施"]

[features]
pwa = true
slides = true
search = true
rss = true
```

- [ ] **Step 6: 创建示例文章**

```mdx
---
title: "空岛云技术：一切的起点"
subtitle: "从零到一构建云原生 PaaS 平台"
date: 2026-01-15
author: "龙野"
tags: ["架构设计", "云原生", "Node.js"]
category: "架构设计"
series: "空岛云技术"
seriesOrder: 1
draft: false
description: "本文介绍空岛云平台的技术背景和整体架构设计思路，探讨为什么我们要做这件事以及背后的技术决策。"
---

# 一切的起点

这是一篇示例文章，用于测试框架的基本功能。

## 为什么要做空岛云？

在这里写下技术背景...

## 整体架构设计

在这里描述架构...

### 技术选型

```typescript
const config = {
  runtime: "Node.js",
  framework: "Koa",
  database: "PostgreSQL",
};
```

### 部署方案

描述部署方案...

## 总结

总结全文...
```

- [ ] **Step 7: Commit**

```bash
git add playground/
git commit -m "feat: add playground with sample post for dev testing"
```

---

### Task 9: 将 theme pages 连接到 playground

**Files:**
- Create: `playground/src/pages/index.astro`
- Create: `playground/src/pages/posts/[...slug].astro`
- Create: `playground/src/pages/tags/index.astro`
- Create: `playground/src/pages/tags/[tag].astro`
- Create: `playground/src/styles/global.css`

- [ ] **Step 1: 创建 playground 页面代理文件**

Astro 不支持从 node_modules 注入 pages，因此 playground 中创建薄代理文件 re-export theme 的页面逻辑。

```astro
---
// playground/src/pages/index.astro
// Re-export from theme — 首页
export { getStaticPaths } from "@pkg/theme/pages/index.astro";
---
<script>import "@pkg/theme/pages/index.astro";</script>
```

> 注意：Astro pages 不能直接从包导入。实际方案是在 playground/src/pages/ 中复制 theme 的 page 文件并 import theme 的组件。这里需要在实施时调研 Astro 的 injectRoute integration API 来从 theme 包注入路由。

替代方案 — 使用 Astro Integration `injectRoute`：

```typescript
// packages/theme/src/integrations/inject-pages.ts
import type { AstroIntegration } from "astro";

export function injectThemePages(): AstroIntegration {
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
```

更新 playground/astro.config.mjs：

```javascript
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { injectThemePages } from "@pkg/theme/integrations/inject-pages";

export default defineConfig({
  integrations: [mdx(), react(), injectThemePages()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 2: 创建 playground global.css**

```css
/* playground/src/styles/global.css */
@import "@pkg/theme/styles/global.css";
```

- [ ] **Step 3: 验证 pnpm dev 可以启动**

Run: `pnpm install && pnpm dev`
Expected: 浏览器打开 localhost:4321 显示杂志风格首页

- [ ] **Step 4: Commit**

```bash
git add playground/ packages/theme/src/integrations/
git commit -m "feat: connect theme pages to playground via injectRoute"
```

---

### Task 10: CI/CD 配置

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`
- Create: `vercel.json`

- [ ] **Step 1: 创建 CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
```

- [ ] **Step 2: 创建 release workflow**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Create Release PR or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: 创建 vercel.json**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "playground/dist",
  "installCommand": "pnpm install"
}
```

- [ ] **Step 4: Commit**

```bash
git add .github/ vercel.json
git commit -m "chore: add CI/CD workflows and Vercel config"
```

---

## Phase 2: 增强功能（后续迭代）

### Task 11: Mermaid 组件

### Task 12: Slide 演讲模式

### Task 13: PWA 支持

### Task 14: 搜索功能

### Task 15: RSS 订阅

### Task 16: OG 社交分享图自动生成

> Phase 2 任务将在 Phase 1 完成并验证后详细展开。
