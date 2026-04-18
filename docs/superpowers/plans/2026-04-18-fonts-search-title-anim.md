# 字体子集化 · 搜索 · 标题动画 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 spec `docs/superpowers/specs/2026-04-18-fonts-search-title-anim-design.md` 实施三项功能 + 配置层基础，产出可独立 feature-flag 的字体子集化、Pagefind 全文搜索 ⌘K 模态、TitleReveal 逐字上浮动画。

**Architecture:** 奠定语言中立的 `ThemeConfig`（JSON Schema 为真理，TS 手写镜像）作为 P1 基础；P2 字体走构建期独立脚本 `scripts/build-fonts.mjs`（subset-font + 扫描 + 3500 baseline）；P3 动画是单 Astro 组件 TitleReveal，服务端拆字、客户端等 `document.fonts.ready`；P4 Pagefind 构建期生成 `dist/pagefind/`，运行时 React 模态按 ⌘K 打开，JS API 懒加载。

**Tech Stack:** Astro 5 / React 19 / Tailwind v4 / pnpm 10 monorepo / Biome / Vitest（新引） / subset-font / fast-glob / astro-pagefind / pagefind / smol-toml

---

## File Structure

### 新增文件

```
schema/
  └── config.schema.json                        # JSON Schema 真理之源（机器可读）
  └── baseline-cjk-3500.txt                     # 国家通用规范汉字一级 3500 字

docs/
  └── config.schema.md                          # 人类可读字段文档

scripts/
  ├── build-fonts.mjs                           # 字体子集构建脚本
  ├── build-fonts.test.mjs                      # 单元测试
  ├── check-fonts.mjs                           # prebuild 哈希校验
  └── fonts/
      ├── scanner.mjs                           # 扫描源文件提取字符
      ├── scanner.test.mjs
      ├── unicode-range.mjs                     # 字符集 → CSS unicode-range 区间
      └── unicode-range.test.mjs

packages/theme/src/
  ├── config/
  │   ├── loader.ts                             # TOML 加载 + 默认值合并
  │   ├── loader.test.ts
  │   ├── defaults.ts                           # DEFAULTS 常量
  │   ├── schema.ts                             # TS interface（手写镜像 JSON Schema）
  │   └── shortcut.ts                           # 键盘快捷键解析
  │   └── shortcut.test.ts
  ├── components/
  │   ├── ui/TitleReveal.astro                  # 标题动画组件
  │   └── search/
  │       ├── SearchTrigger.astro               # Header 触发器
  │       ├── SearchDialog.tsx                  # 模态主体
  │       ├── SearchResult.tsx                  # 单条结果
  │       ├── SearchDialog.test.tsx
  │       └── use-pagefind.ts                   # Pagefind JS API 懒加载封装
  │       └── use-pagefind.test.ts
  ├── integrations/
  │   └── search.ts                             # 包装 astro-pagefind
  └── styles/fonts/
      ├── source/LXGWWenKaiLite-Regular.woff2   # 源字体（mv 自上级目录）
      └── .meta.json                            # 构建元数据

vitest.config.ts                                # 根级 Vitest 配置
```

### 修改文件

- `package.json` — 新增 `fonts:build` / `prebuild` / `test` 脚本 + devDeps
- `playground/package.json` — 新增 `astro-pagefind` + `pagefind` deps
- `playground/config.toml` — 新增 `[animation]` / `[search]` / `[fonts]` 表
- `playground/astro.config.mjs` — 注入 search integration + workbox `/pagefind/` 缓存规则
- `packages/theme/src/integrations/inject-pages.ts` — 签名升级接受 `ThemeConfig`
- `packages/theme/src/styles/global.css` — `@font-face` 加 `unicode-range`
- `packages/theme/src/layouts/BaseLayout.astro` — preload 条件化
- `packages/theme/src/layouts/ArticleLayout.astro` — TitleReveal + `data-pagefind-*`
- `packages/theme/src/components/ui/HeroSection.astro` — TitleReveal
- `packages/theme/src/components/layout/Header.astro` — TitleReveal + SearchTrigger
- `packages/theme/src/components/layout/Footer.astro` — `data-pagefind-ignore`
- `packages/theme/src/components/article/TableOfContents.astro` — `data-pagefind-ignore`
- `TODO.md` — 勾掉完成项
- `README.md` — 补搜索 / 字体子集化 / 动画配置入口

---

## Phase 1 · 配置层（P1，阻塞全部后续）

### Task 1.1: JSON Schema 真理源

**Files:**
- Create: `schema/config.schema.json`
- Create: `docs/config.schema.md`

- [ ] **Step 1: 写 JSON Schema**

```bash
# 新建 schema/config.schema.json
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://tech.longye.site/schema/config.schema.json",
  "title": "ThemeConfig",
  "type": "object",
  "properties": {
    "site": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "description": { "type": "string" },
        "author": { "type": "string" },
        "url": { "type": "string", "format": "uri" },
        "lang": { "type": "string", "default": "zh-CN" }
      },
      "required": ["title", "url"]
    },
    "theme": {
      "type": "object",
      "properties": {
        "color": { "type": "string" },
        "dark": { "type": "boolean", "default": true },
        "layout": { "type": "string", "default": "magazine" }
      }
    },
    "social": { "type": "object", "additionalProperties": { "type": "string" } },
    "categories": {
      "type": "object",
      "properties": {
        "list": { "type": "array", "items": { "type": "string" } }
      }
    },
    "features": {
      "type": "object",
      "properties": {
        "pwa": { "type": "boolean", "default": true },
        "slides": { "type": "boolean", "default": true },
        "search": { "type": "boolean", "default": true },
        "rss": { "type": "boolean", "default": true },
        "animation": { "type": "boolean", "default": true }
      }
    },
    "animation": {
      "type": "object",
      "properties": {
        "variant": {
          "type": "string",
          "enum": ["slide-up", "fade", "wipe", "typewriter", "none"],
          "default": "slide-up"
        },
        "duration": { "type": "integer", "minimum": 0, "default": 550 },
        "stagger": { "type": "integer", "minimum": 0, "default": 100 },
        "apply_to": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["hero", "article-title", "article-subtitle", "nav-logo"]
          },
          "default": ["hero", "article-title", "article-subtitle", "nav-logo"]
        },
        "reduced_motion": {
          "type": "string",
          "enum": ["respect", "force-off"],
          "default": "respect"
        }
      }
    },
    "search": {
      "type": "object",
      "properties": {
        "engine": { "type": "string", "enum": ["pagefind", "none"], "default": "pagefind" },
        "shortcut": {
          "oneOf": [
            { "type": "string" },
            { "type": "array", "items": { "type": "string" } }
          ],
          "default": "mod+k"
        },
        "placeholder": { "type": "string", "default": "搜索文章..." },
        "weights": {
          "type": "object",
          "properties": {
            "title": { "type": "number", "default": 10 },
            "tags": { "type": "number", "default": 5 },
            "body": { "type": "number", "default": 1 }
          }
        }
      }
    },
    "fonts": {
      "type": "object",
      "properties": {
        "subset_strategy": {
          "type": "string",
          "enum": ["scan", "baseline", "hybrid"],
          "default": "hybrid"
        },
        "baseline_charset": { "type": "string", "default": "cjk-3500" },
        "scan_globs": {
          "type": "array",
          "items": { "type": "string" },
          "default": ["playground/posts/**/*.mdx", "packages/theme/src/**/*.{astro,tsx,ts}"]
        },
        "preload": { "type": "boolean", "default": true }
      }
    }
  }
}
```

- [ ] **Step 2: 写人类文档 `docs/config.schema.md`**

```markdown
# `config.toml` 字段说明

以 `playground/config.toml` 为配置入口。真理之源见 `schema/config.schema.json`。

## [site]
| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| title | string | — | 站点标题 |
| description | string | — | 站点描述 |
| author | string | — | 作者署名 |
| url | string | — | 站点 URL（sitemap/RSS 绝对链接） |
| lang | string | "zh-CN" | HTML lang |

## [features]
| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| pwa | bool | true | PWA 支持总开关 |
| slides | bool | true | 演讲模式 |
| search | bool | true | ⌘K 搜索 |
| rss | bool | true | RSS feed |
| animation | bool | true | 标题动画总开关 |

## [animation]
| 字段 | 类型 | 默认 | 取值 | 说明 |
|---|---|---|---|---|
| variant | enum | "slide-up" | slide-up/fade/wipe/typewriter/none | 动画风格 |
| duration | int | 550 | ms | 单字/整体时长 |
| stagger | int | 100 | ms | 逐字间隔（非逐字风格忽略） |
| apply_to | array | 全部 | hero/article-title/article-subtitle/nav-logo | 应用位置 |
| reduced_motion | enum | "respect" | respect/force-off | 系统降级处理 |

## [search]
| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| engine | enum | "pagefind" | "pagefind" / "none" |
| shortcut | string\|array | "mod+k" | "mod+k"/"slash"/数组 |
| placeholder | string | "搜索文章..." | 输入框占位符 |
| weights.title | number | 10 | 标题权重 |
| weights.tags | number | 5 | 标签权重 |
| weights.body | number | 1 | 正文权重 |

## [fonts]
| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| subset_strategy | enum | "hybrid" | "scan"/"baseline"/"hybrid" |
| baseline_charset | string | "cjk-3500" | 保底字表标识（目前仅 cjk-3500） |
| scan_globs | string[] | 见上 | 扫描字符来源 |
| preload | bool | true | `<link rel="preload">` 开关 |
```

- [ ] **Step 3: 提交**

```bash
git add schema/config.schema.json docs/config.schema.md
git commit -m "feat(config): JSON Schema 真理源 + 人类文档"
```

---

### Task 1.2: TypeScript 类型镜像 + DEFAULTS

**Files:**
- Create: `packages/theme/src/config/schema.ts`
- Create: `packages/theme/src/config/defaults.ts`

- [ ] **Step 1: 写 TS interface（手写镜像 JSON Schema）**

```ts
// packages/theme/src/config/schema.ts
export type AnimationVariant = "slide-up" | "fade" | "wipe" | "typewriter" | "none";
export type AnimationLocation = "hero" | "article-title" | "article-subtitle" | "nav-logo";
export type ReducedMotionMode = "respect" | "force-off";
export type SearchEngine = "pagefind" | "none";
export type SubsetStrategy = "scan" | "baseline" | "hybrid";

export interface ThemeConfig {
  site: { title: string; description: string; author: string; url: string; lang: string };
  theme: { color: string; dark: boolean; layout: string };
  social: Record<string, string>;
  categories: { list: string[] };
  features: {
    pwa: boolean;
    slides: boolean;
    search: boolean;
    rss: boolean;
    animation: boolean;
  };
  animation: {
    variant: AnimationVariant;
    duration: number;
    stagger: number;
    apply_to: AnimationLocation[];
    reduced_motion: ReducedMotionMode;
  };
  search: {
    engine: SearchEngine;
    shortcut: string | string[];
    placeholder: string;
    weights: { title: number; tags: number; body: number };
  };
  fonts: {
    subset_strategy: SubsetStrategy;
    baseline_charset: string;
    scan_globs: string[];
    preload: boolean;
  };
}
```

- [ ] **Step 2: 写 DEFAULTS 常量（字段值镜像 JSON Schema 的 default）**

```ts
// packages/theme/src/config/defaults.ts
import type { ThemeConfig } from "./schema.ts";

export const DEFAULTS: ThemeConfig = {
  site: { title: "", description: "", author: "", url: "", lang: "zh-CN" },
  theme: { color: "#2264d6", dark: true, layout: "magazine" },
  social: {},
  categories: { list: [] },
  features: { pwa: true, slides: true, search: true, rss: true, animation: true },
  animation: {
    variant: "slide-up",
    duration: 550,
    stagger: 100,
    apply_to: ["hero", "article-title", "article-subtitle", "nav-logo"],
    reduced_motion: "respect",
  },
  search: {
    engine: "pagefind",
    shortcut: "mod+k",
    placeholder: "搜索文章...",
    weights: { title: 10, tags: 5, body: 1 },
  },
  fonts: {
    subset_strategy: "hybrid",
    baseline_charset: "cjk-3500",
    scan_globs: ["playground/posts/**/*.mdx", "packages/theme/src/**/*.{astro,tsx,ts}"],
    preload: true,
  },
};
```

- [ ] **Step 3: 提交**

```bash
git add packages/theme/src/config/
git commit -m "feat(config): TS types + DEFAULTS 镜像"
```

---

### Task 1.3: 搭 Vitest + 写 loader 测试 + 实现

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`（加 deps + script）
- Create: `packages/theme/src/config/loader.test.ts`
- Create: `packages/theme/src/config/loader.ts`

- [ ] **Step 1: 加依赖**

```bash
pnpm add -w -D vitest smol-toml
```

- [ ] **Step 2: 写 vitest.config.ts**

```ts
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
```

- [ ] **Step 3: package.json 加 script**

修改 `package.json` 的 `scripts` 字段，追加：

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: 写 loader 测试（失败）**

```ts
// packages/theme/src/config/loader.test.ts
import { describe, it, expect } from "vitest";
import { mergeConfig } from "./loader.ts";
import { DEFAULTS } from "./defaults.ts";

describe("mergeConfig", () => {
  it("空输入返回 DEFAULTS 深拷贝", () => {
    const merged = mergeConfig({});
    expect(merged).toEqual(DEFAULTS);
    expect(merged).not.toBe(DEFAULTS);
  });

  it("用户覆盖浅字段", () => {
    const merged = mergeConfig({ site: { title: "X", url: "https://x" } });
    expect(merged.site.title).toBe("X");
    expect(merged.site.lang).toBe("zh-CN");
  });

  it("数组字段整体替换（不合并）", () => {
    const merged = mergeConfig({ animation: { apply_to: ["hero"] } });
    expect(merged.animation.apply_to).toEqual(["hero"]);
  });

  it("嵌套对象 weights 合并", () => {
    const merged = mergeConfig({ search: { weights: { title: 20 } } });
    expect(merged.search.weights).toEqual({ title: 20, tags: 5, body: 1 });
  });
});
```

- [ ] **Step 5: 运行测试（应该 fail: 找不到 loader.ts）**

```bash
pnpm test packages/theme/src/config/loader.test.ts
```
预期：FAIL `Cannot find module './loader.ts'`

- [ ] **Step 6: 实现 loader.ts**

```ts
// packages/theme/src/config/loader.ts
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseTOML } from "smol-toml";
import type { ThemeConfig } from "./schema.ts";
import { DEFAULTS } from "./defaults.ts";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function mergeConfig(user: DeepPartial<ThemeConfig>): ThemeConfig {
  return merge(structuredClone(DEFAULTS), user) as ThemeConfig;
}

function merge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(over)) return over as unknown as T;
  if (typeof over !== "object") return over as T;
  const out = { ...(base as object) } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    const baseVal = (base as Record<string, unknown>)[k];
    out[k] = baseVal && typeof baseVal === "object" && !Array.isArray(baseVal)
      ? merge(baseVal, v)
      : v;
  }
  return out as T;
}

export function loadThemeConfig(root: string = process.cwd()): ThemeConfig {
  const candidates = [
    resolve(root, "config.toml"),
    resolve(root, "playground/config.toml"),
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`config.toml not found. Searched: ${candidates.join(", ")}`);
  const raw = parseTOML(readFileSync(found, "utf8")) as DeepPartial<ThemeConfig>;
  return mergeConfig(raw);
}
```

- [ ] **Step 7: 运行测试（pass）**

```bash
pnpm test packages/theme/src/config/loader.test.ts
```
预期：4 tests PASS

- [ ] **Step 8: 提交**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml packages/theme/src/config/loader.ts packages/theme/src/config/loader.test.ts
git commit -m "feat(config): Vitest 基线 + TOML loader + 默认值合并"
```

---

### Task 1.4: 扩展 `playground/config.toml`

**Files:**
- Modify: `playground/config.toml`

- [ ] **Step 1: 追加三个新表**

在文件末尾追加：

```toml
[animation]
variant = "slide-up"
duration = 550
stagger = 100
apply_to = ["hero", "article-title", "article-subtitle", "nav-logo"]
reduced_motion = "respect"

[search]
engine = "pagefind"
shortcut = "mod+k"
placeholder = "搜索文章..."
weights = { title = 10, tags = 5, body = 1 }

[fonts]
subset_strategy = "hybrid"
baseline_charset = "cjk-3500"
scan_globs = ["playground/posts/**/*.mdx", "packages/theme/src/**/*.{astro,tsx,ts}"]
preload = true
```

在 `[features]` 节末尾追加一行：

```toml
animation = true
```

- [ ] **Step 2: 本地跑一次 loader 验证**

```bash
cd /Users/longye/Github/ATA && node -e "import('./packages/theme/src/config/loader.ts').then(m => console.log(JSON.stringify(m.loadThemeConfig(), null, 2)))"
```
预期：输出合并后的完整 ThemeConfig JSON

- [ ] **Step 3: 提交**

```bash
git add playground/config.toml
git commit -m "feat(config): config.toml 新增 [animation]/[search]/[fonts]"
```

---

### Task 1.5: `injectThemePages` 签名升级

**Files:**
- Modify: `packages/theme/src/integrations/inject-pages.ts`
- Modify: `playground/astro.config.mjs`

- [ ] **Step 1: 升级 inject-pages.ts**

```ts
// packages/theme/src/integrations/inject-pages.ts
import type { AstroIntegration } from "astro";
import type { ThemeConfig } from "../config/schema.ts";

export function injectThemePages(config?: ThemeConfig): AstroIntegration {
  return {
    name: "theme-inject-pages",
    hooks: {
      "astro:config:setup"({ injectRoute }) {
        injectRoute({ pattern: "/", entrypoint: "@pkg/theme/pages/index.astro" });
        injectRoute({ pattern: "/posts/[...slug]", entrypoint: "@pkg/theme/pages/posts/[...slug].astro" });
        injectRoute({ pattern: "/tags", entrypoint: "@pkg/theme/pages/tags/index.astro" });
        injectRoute({ pattern: "/tags/[tag]", entrypoint: "@pkg/theme/pages/tags/[tag].astro" });
        injectRoute({ pattern: "/page/[page]", entrypoint: "@pkg/theme/pages/page/[page].astro" });
        if (config?.features.rss !== false) {
          injectRoute({ pattern: "/rss.xml", entrypoint: "@pkg/theme/pages/rss.xml.ts" });
        }
        if (config?.features.slides !== false) {
          injectRoute({ pattern: "/slides/[...slug]", entrypoint: "@pkg/theme/pages/slides/[...slug].astro" });
        }
      },
    },
  };
}
```

- [ ] **Step 2: 更新 astro.config.mjs 传入 config**

在文件顶部加 import：

```js
import { loadThemeConfig } from "@pkg/theme/config/loader";
```

然后：

```js
const themeConfig = loadThemeConfig();

// integrations 数组里：
injectThemePages(themeConfig),
```

- [ ] **Step 3: 验证 build 不炸**

```bash
pnpm build
```
预期：正常产出 `playground/dist/`，且 `rss.xml` 和 `/slides/*` 仍在（因为 config 里未禁用）

- [ ] **Step 4: 提交**

```bash
git add packages/theme/src/integrations/inject-pages.ts playground/astro.config.mjs
git commit -m "feat(config): injectThemePages 接受 ThemeConfig，按 features 条件注入"
```


---

## Phase 2 · 字体子集化（P2）

### Task 2.1: 加依赖 + 源字体归档

**Files:**
- Modify: `package.json`
- Move: `packages/theme/src/styles/fonts/LXGWWenKaiLite-Regular.woff2` → `packages/theme/src/styles/fonts/source/LXGWWenKaiLite-Regular.woff2`

- [ ] **Step 1: 加依赖**

```bash
pnpm add -w -D subset-font fast-glob
```

- [ ] **Step 2: 归档源字体**

```bash
mkdir -p packages/theme/src/styles/fonts/source
git mv packages/theme/src/styles/fonts/LXGWWenKaiLite-Regular.woff2 packages/theme/src/styles/fonts/source/LXGWWenKaiLite-Regular.woff2
```

- [ ] **Step 3: 确认 dev 此时会炸（字体不在原位）——先不跑 dev，本阶段后续会重建产物**

- [ ] **Step 4: 提交**

```bash
git add package.json pnpm-lock.yaml packages/theme/src/styles/fonts/
git commit -m "chore(fonts): 源字体归档到 source/ + 加 subset-font/fast-glob"
```

---

### Task 2.2: 内置 baseline 字符集

**Files:**
- Create: `schema/baseline-cjk-3500.txt`

- [ ] **Step 1: 下载国家通用规范汉字一级 3500 字表**

```bash
curl -o schema/baseline-cjk-3500.txt https://raw.githubusercontent.com/kaienfr/Font/master/refs/%E9%80%9A%E7%94%A83500%E5%AD%97.txt
```

或如果拿不到，手写一个顶格 3500 汉字的 TXT，逐字连写无分隔。内容不便于在 plan 内完整列出。获取后验证：

```bash
wc -m schema/baseline-cjk-3500.txt
```
预期：字符数 ≥ 3500

- [ ] **Step 2: 规范化（去换行/空白）**

```bash
node -e "const fs=require('fs');const t=fs.readFileSync('schema/baseline-cjk-3500.txt','utf8').replace(/\s+/g,'');fs.writeFileSync('schema/baseline-cjk-3500.txt',t);console.log('chars:',[...t].length)"
```
预期：`chars: 3500` 左右

- [ ] **Step 3: 提交**

```bash
git add schema/baseline-cjk-3500.txt
git commit -m "feat(fonts): 内置国家通用规范汉字 3500 字 baseline"
```

---

### Task 2.3: scanner 模块（提取源码中字符）

**Files:**
- Create: `scripts/fonts/scanner.mjs`
- Create: `scripts/fonts/scanner.test.mjs`

- [ ] **Step 1: 写测试（fail）**

```js
// scripts/fonts/scanner.test.mjs
import { describe, it, expect } from "vitest";
import { extractChars, extractFromFiles } from "./scanner.mjs";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("extractChars", () => {
  it("提取 CJK 字符", () => {
    const chars = extractChars("你好 Hello 世界");
    expect(chars.has("你")).toBe(true);
    expect(chars.has("世")).toBe(true);
    expect(chars.has("H")).toBe(true);
  });

  it("忽略 frontmatter 以外的 YAML 键字段值", () => {
    const chars = extractChars("---\ntitle: 测试\n---\n正文");
    expect(chars.has("测")).toBe(true);
    expect(chars.has("正")).toBe(true);
  });
});

describe("extractFromFiles", () => {
  it("多文件去重提取", () => {
    const dir = mkdtempSync(join(tmpdir(), "scan-"));
    writeFileSync(join(dir, "a.md"), "甲乙");
    writeFileSync(join(dir, "b.md"), "乙丙");
    const chars = extractFromFiles([join(dir, "*.md")]);
    expect([...chars].sort()).toEqual(expect.arrayContaining(["甲", "乙", "丙"]));
    rmSync(dir, { recursive: true });
  });
});
```

- [ ] **Step 2: 运行（fail）**

```bash
pnpm test scripts/fonts/scanner.test.mjs
```
预期：FAIL `Cannot find module './scanner.mjs'`

- [ ] **Step 3: 实现 scanner.mjs**

```js
// scripts/fonts/scanner.mjs
import { readFileSync } from "node:fs";
import fg from "fast-glob";

const CJK_PUNCT = "，。！？；：""''「」『』【】《》〈〉…—·、";

export function extractChars(text) {
  const chars = new Set();
  for (const ch of text) chars.add(ch);
  return chars;
}

export function extractFromFiles(globs, cwd = process.cwd()) {
  const files = fg.sync(globs, { cwd, absolute: true });
  const all = new Set();
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const ch of text) all.add(ch);
  }
  return all;
}

export { CJK_PUNCT };
```

- [ ] **Step 4: 跑通**

```bash
pnpm test scripts/fonts/scanner.test.mjs
```
预期：3 tests PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/fonts/scanner.mjs scripts/fonts/scanner.test.mjs
git commit -m "feat(fonts): scanner 模块提取源码字符"
```

---

### Task 2.4: unicode-range 生成器

**Files:**
- Create: `scripts/fonts/unicode-range.mjs`
- Create: `scripts/fonts/unicode-range.test.mjs`

- [ ] **Step 1: 写测试**

```js
// scripts/fonts/unicode-range.test.mjs
import { describe, it, expect } from "vitest";
import { toUnicodeRange } from "./unicode-range.mjs";

describe("toUnicodeRange", () => {
  it("相邻码点合并成区间", () => {
    const ranges = toUnicodeRange(new Set(["A", "B", "C", "E"]));
    expect(ranges).toBe("U+41-43, U+45");
  });

  it("单字符输出单 U+", () => {
    expect(toUnicodeRange(new Set(["中"]))).toBe("U+4E2D");
  });

  it("空集返回空字符串", () => {
    expect(toUnicodeRange(new Set())).toBe("");
  });
});
```

- [ ] **Step 2: 跑（fail）**

```bash
pnpm test scripts/fonts/unicode-range.test.mjs
```

- [ ] **Step 3: 实现**

```js
// scripts/fonts/unicode-range.mjs
export function toUnicodeRange(charSet) {
  if (charSet.size === 0) return "";
  const codes = [...charSet].map(c => c.codePointAt(0)).sort((a, b) => a - b);
  const groups = [];
  let start = codes[0], prev = codes[0];
  for (let i = 1; i < codes.length; i++) {
    if (codes[i] === prev + 1) { prev = codes[i]; continue; }
    groups.push([start, prev]);
    start = prev = codes[i];
  }
  groups.push([start, prev]);
  return groups.map(([a, b]) =>
    a === b ? `U+${a.toString(16).toUpperCase()}`
            : `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`
  ).join(", ");
}
```

- [ ] **Step 4: 跑通**

```bash
pnpm test scripts/fonts/unicode-range.test.mjs
```
预期：3 tests PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/fonts/unicode-range.mjs scripts/fonts/unicode-range.test.mjs
git commit -m "feat(fonts): unicode-range 码点区间生成器"
```

---

### Task 2.5: build-fonts.mjs 主脚本

**Files:**
- Create: `scripts/build-fonts.mjs`
- Create: `scripts/build-fonts.test.mjs`

- [ ] **Step 1: 写测试（仅测可测逻辑 `buildCharset`）**

```js
// scripts/build-fonts.test.mjs
import { describe, it, expect } from "vitest";
import { buildCharset } from "./build-fonts.mjs";

describe("buildCharset", () => {
  it("hybrid 合并扫描 + baseline", () => {
    const scanned = new Set(["独"]);
    const baseline = new Set(["的"]);
    const final = buildCharset("hybrid", scanned, baseline);
    expect(final.has("独")).toBe(true);
    expect(final.has("的")).toBe(true);
  });

  it("scan 策略只用扫描", () => {
    const final = buildCharset("scan", new Set(["甲"]), new Set(["乙"]));
    expect(final.has("甲")).toBe(true);
    expect(final.has("乙")).toBe(false);
  });

  it("baseline 策略只用 baseline", () => {
    const final = buildCharset("baseline", new Set(["甲"]), new Set(["乙"]));
    expect(final.has("甲")).toBe(false);
    expect(final.has("乙")).toBe(true);
  });

  it("所有策略都追加 ASCII 可打印 + CJK 标点", () => {
    const final = buildCharset("baseline", new Set(), new Set(["字"]));
    expect(final.has(" ")).toBe(true);
    expect(final.has("A")).toBe(true);
    expect(final.has("，")).toBe(true);
  });
});
```

- [ ] **Step 2: 实现脚本**

```js
// scripts/build-fonts.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import subsetFont from "subset-font";
import fg from "fast-glob";
import { parse as parseTOML } from "smol-toml";
import { extractFromFiles, CJK_PUNCT } from "./fonts/scanner.mjs";
import { toUnicodeRange } from "./fonts/unicode-range.mjs";

const ROOT = process.cwd();
const SOURCE = resolve(ROOT, "packages/theme/src/styles/fonts/source/LXGWWenKaiLite-Regular.woff2");
const TARGET = resolve(ROOT, "packages/theme/src/styles/fonts/LXGWWenKaiLite-Regular.woff2");
const META = resolve(ROOT, "packages/theme/src/styles/fonts/.meta.json");
const CONFIG = resolve(ROOT, "playground/config.toml");
const BASELINE = resolve(ROOT, "schema/baseline-cjk-3500.txt");

export function buildCharset(strategy, scanned, baseline) {
  const out = new Set();
  if (strategy === "scan" || strategy === "hybrid") for (const c of scanned) out.add(c);
  if (strategy === "baseline" || strategy === "hybrid") for (const c of baseline) out.add(c);
  for (let c = 0x20; c <= 0x7e; c++) out.add(String.fromCodePoint(c));
  for (const c of CJK_PUNCT) out.add(c);
  return out;
}

function hashFiles(globs) {
  const files = fg.sync(globs, { cwd: ROOT, stats: true });
  const h = createHash("sha256");
  for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
    h.update(f.path).update(String(f.stats.size)).update(String(f.stats.mtimeMs));
  }
  return h.digest("hex").slice(0, 16);
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`✗ 源字体不存在: ${SOURCE}`);
    console.error(`  从 https://github.com/lxgw/LxgwWenKai-Lite 下载 WebFont 版`);
    process.exit(1);
  }

  const cfg = parseTOML(readFileSync(CONFIG, "utf8"));
  const fonts = cfg.fonts ?? {};
  const strategy = fonts.subset_strategy ?? "hybrid";
  const scanGlobs = fonts.scan_globs ?? [];

  const scanned = strategy === "baseline" ? new Set() : extractFromFiles(scanGlobs, ROOT);
  const baselineText = (fonts.baseline_charset === "cjk-3500" && existsSync(BASELINE))
    ? readFileSync(BASELINE, "utf8")
    : "";
  const baseline = new Set(baselineText);

  const final = buildCharset(strategy, scanned, baseline);
  const text = [...final].join("");

  const source = readFileSync(SOURCE);
  console.log(`→ subset-font: ${final.size} chars, source ${(source.length / 1024 / 1024).toFixed(2)} MB`);
  const subset = await subsetFont(source, text, { targetFormat: "woff2" });

  writeFileSync(TARGET, subset);
  const meta = {
    chars: final.size,
    bytes: subset.length,
    scannedChars: scanned.size,
    baselineChars: baseline.size,
    scanHash: hashFiles(scanGlobs),
    charsetHash: createHash("sha256").update(text).digest("hex").slice(0, 16),
    unicodeRange: toUnicodeRange(final),
    strategy,
    builtAt: new Date().toISOString(),
  };
  writeFileSync(META, JSON.stringify(meta, null, 2) + "\n");

  if (subset.length >= source.length) {
    console.error(`✗ 产物 (${subset.length}) 比源 (${source.length}) 大，配置可能有误`);
    process.exit(1);
  }
  console.log(`✓ 产物: ${(subset.length / 1024).toFixed(0)} KB (${(subset.length / source.length * 100).toFixed(1)}%)`);
  console.log(`✓ meta: ${META}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
```

- [ ] **Step 3: 跑测试（charset 逻辑）**

```bash
pnpm test scripts/build-fonts.test.mjs
```
预期：4 tests PASS

- [ ] **Step 4: 首次构建**

```bash
node scripts/build-fonts.mjs
```
预期：输出 `✓ 产物: ~980 KB (~18%)` 之类，生成 `.meta.json` + 新 `.woff2`

- [ ] **Step 5: 提交**

```bash
git add scripts/build-fonts.mjs scripts/build-fonts.test.mjs packages/theme/src/styles/fonts/LXGWWenKaiLite-Regular.woff2 packages/theme/src/styles/fonts/.meta.json
git commit -m "feat(fonts): build-fonts.mjs 产出 ~1MB 子集"
```

---

### Task 2.6: check-fonts.mjs prebuild 校验

**Files:**
- Create: `scripts/check-fonts.mjs`

- [ ] **Step 1: 实现**

```js
// scripts/check-fonts.mjs
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import fg from "fast-glob";
import { parse as parseTOML } from "smol-toml";

const ROOT = process.cwd();
const META = resolve(ROOT, "packages/theme/src/styles/fonts/.meta.json");
const CONFIG = resolve(ROOT, "playground/config.toml");

if (!existsSync(META)) {
  console.error("✗ 字体产物元数据缺失。请运行: pnpm fonts:build");
  process.exit(1);
}

const meta = JSON.parse(readFileSync(META, "utf8"));
const cfg = parseTOML(readFileSync(CONFIG, "utf8"));
const globs = cfg.fonts?.scan_globs ?? [];

const files = fg.sync(globs, { cwd: ROOT, stats: true });
const h = createHash("sha256");
for (const f of files.sort((a, b) => a.path.localeCompare(b.path))) {
  h.update(f.path).update(String(f.stats.size)).update(String(f.stats.mtimeMs));
}
const currentHash = h.digest("hex").slice(0, 16);

if (currentHash !== meta.scanHash) {
  console.error(`✗ 源文件已变化但未重建字体子集。`);
  console.error(`  记录: ${meta.scanHash}  当前: ${currentHash}`);
  console.error(`  请运行: pnpm fonts:build && git add -A && git commit`);
  process.exit(1);
}
console.log(`✓ 字体子集一致 (${meta.chars} chars, ${Math.round(meta.bytes / 1024)} KB)`);
```

- [ ] **Step 2: 手动验证**

```bash
node scripts/check-fonts.mjs
```
预期：`✓ 字体子集一致 ...`

- [ ] **Step 3: 模拟失败（改个文件）**

```bash
touch playground/posts/skyland-sneak/index.mdx
node scripts/check-fonts.mjs
```
预期：exit 1 + 提示信息

恢复：`node scripts/build-fonts.mjs` 重建即可。

- [ ] **Step 4: 提交**

```bash
git add scripts/check-fonts.mjs packages/theme/src/styles/fonts/.meta.json
git commit -m "feat(fonts): check-fonts.mjs 哈希校验"
```

---

### Task 2.7: 接入 package.json scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 追加 scripts**

```json
{
  "scripts": {
    "fonts:build": "node scripts/build-fonts.mjs",
    "prebuild": "node scripts/check-fonts.mjs"
  }
}
```

- [ ] **Step 2: 验证**

```bash
pnpm build
```
预期：先跑 `prebuild`（输出 `✓ 字体子集一致`），然后正常 build

- [ ] **Step 3: 提交**

```bash
git add package.json
git commit -m "feat(fonts): 接入 fonts:build + prebuild hook"
```

---

### Task 2.8: `@font-face` 加 `unicode-range` + 读 meta

**Files:**
- Modify: `packages/theme/src/styles/global.css`

- [ ] **Step 1: 从 meta.json 取 unicodeRange 字符串**

```bash
cat packages/theme/src/styles/fonts/.meta.json | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).unicodeRange)"
```
复制输出。

- [ ] **Step 2: 更新 global.css**

将原 `@font-face` 替换为（把上面 Step 1 的 range 粘贴到 `unicode-range:` 后）：

```css
@font-face {
  font-family: "LXGW WenKai";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("./fonts/LXGWWenKaiLite-Regular.woff2") format("woff2");
  unicode-range: /* 粘贴 Step 1 输出 */;
}
```

- [ ] **Step 3: 浏览器验证**

```bash
pnpm dev --host
```

打开首页，罕用字（比如文章正文里故意塞一个"龘"）应该回落到 Noto Sans SC 而不是豆腐块。

- [ ] **Step 4: 提交**

```bash
git add packages/theme/src/styles/global.css
git commit -m "feat(fonts): @font-face unicode-range 限定子集范围"
```

---

### Task 2.9: BaseLayout preload 条件化

**Files:**
- Modify: `packages/theme/src/layouts/BaseLayout.astro`

- [ ] **Step 1: 改造 frontmatter**

把顶部 import 后面加入 config 加载：

```astro
---
import "../styles/global.css";
import lxgwWenKaiFontUrl from "../styles/fonts/LXGWWenKaiLite-Regular.woff2?url";
import { loadThemeConfig } from "../config/loader.ts";

const config = loadThemeConfig();

interface Props {
  title: string;
  description?: string;
  darkHero?: boolean;
}

const { title, description = "", darkHero = false } = Astro.props;
---
```

- [ ] **Step 2: 将 `<link preload>` 条件化**

```astro
{config.fonts.preload && (
  <link rel="preload" href={lxgwWenKaiFontUrl} as="font" type="font/woff2" crossorigin />
)}
```

- [ ] **Step 3: 构建验证**

```bash
pnpm build && grep -c 'rel="preload"' playground/dist/index.html
```
预期：`>= 1`（默认 preload=true）

- [ ] **Step 4: 提交**

```bash
git add packages/theme/src/layouts/BaseLayout.astro
git commit -m "feat(fonts): BaseLayout preload 按 config.fonts.preload 条件化"
```


---

## Phase 3 · 标题动画（P3）

### Task 3.1: TitleReveal 组件骨架（禁用路径）

**Files:**
- Create: `packages/theme/src/components/ui/TitleReveal.astro`

- [ ] **Step 1: 实现组件**

```astro
---
// packages/theme/src/components/ui/TitleReveal.astro
import { loadThemeConfig } from "../../config/loader.ts";
import type { AnimationVariant } from "../../config/schema.ts";

interface Props {
  text: string;
  as?: string;
  variant?: AnimationVariant;
  delay?: number;
  duration?: number;
  stagger?: number;
  class?: string;
  style?: string;
  enabled?: boolean;
}

const config = loadThemeConfig();
const {
  text,
  as: Tag = "span",
  variant = config.animation.variant,
  delay = 0,
  duration = config.animation.duration,
  stagger = config.animation.stagger,
  class: className,
  style,
  enabled = config.features.animation,
} = Astro.props;

const active = enabled && variant !== "none";
const chars = active ? [...text] : null;
const forceOff = config.animation.reduced_motion === "force-off";
---

{active ? (
  <Tag
    class:list={["title-reveal", `variant-${variant}`, forceOff && "no-reduce-motion", className]}
    data-delay={delay}
    data-duration={duration}
    data-stagger={stagger}
    data-variant={variant}
    style={style}
  >
    {(variant === "wipe" || variant === "typewriter") ? (
      <span class="tr-wrap">{text}</span>
    ) : (
      chars!.map((ch, i) => <span class="tr-ch" style={`--i:${i}`}>{ch}</span>)
    )}
  </Tag>
) : (
  <Tag class={className} style={style}>{text}</Tag>
)}
```

- [ ] **Step 2: 暂不写 CSS / JS（下一任务）。本步只验证 SSR 渲染出正确 HTML**

Temporarily add to `HeroSection.astro` inline test（后面 Task 3.5 正式替换，现在只是验证）：

先跳过验证，下个任务加 CSS 再统一测。

- [ ] **Step 3: 提交**

```bash
git add packages/theme/src/components/ui/TitleReveal.astro
git commit -m "feat(animation): TitleReveal 组件骨架"
```

---

### Task 3.2: 写 CSS + 运行时触发脚本

**Files:**
- Modify: `packages/theme/src/components/ui/TitleReveal.astro`

- [ ] **Step 1: 在组件末尾追加 `<style>` 和 `<script>`**

```astro
<style is:global>
  .title-reveal { display: inline-block; }
  .title-reveal .tr-ch,
  .title-reveal .tr-wrap { display: inline-block; }

  /* variant: slide-up (default) */
  .title-reveal.variant-slide-up .tr-ch {
    opacity: 0;
    transform: translateY(12px);
  }
  .title-reveal.variant-slide-up.revealed .tr-ch {
    animation: tr-slide-up var(--tr-duration, 550ms) cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
    animation-delay: calc(var(--tr-start-delay, 0ms) + var(--i) * var(--tr-stagger, 100ms));
  }
  @keyframes tr-slide-up {
    to { opacity: 1; transform: translateY(0); }
  }

  /* variant: fade */
  .title-reveal.variant-fade .tr-ch { opacity: 0; }
  .title-reveal.variant-fade.revealed .tr-ch {
    animation: tr-fade var(--tr-duration, 550ms) ease-out forwards;
    animation-delay: calc(var(--tr-start-delay, 0ms) + var(--i) * var(--tr-stagger, 100ms));
  }
  @keyframes tr-fade { to { opacity: 1; } }

  /* variant: wipe */
  .title-reveal.variant-wipe .tr-wrap { clip-path: inset(0 100% 0 0); }
  .title-reveal.variant-wipe.revealed .tr-wrap {
    animation: tr-wipe var(--tr-duration, 550ms) cubic-bezier(0.77, 0, 0.175, 1) forwards;
    animation-delay: var(--tr-start-delay, 0ms);
  }
  @keyframes tr-wipe { to { clip-path: inset(0 0 0 0); } }

  /* variant: typewriter */
  .title-reveal.variant-typewriter .tr-wrap {
    clip-path: inset(0 100% 0 0);
    border-right: 2px solid currentColor;
    padding-right: 2px;
  }
  .title-reveal.variant-typewriter.revealed .tr-wrap {
    animation: tr-wipe var(--tr-duration, 550ms) steps(12) forwards,
               tr-cursor 1s step-end 3 var(--tr-duration, 550ms);
    animation-delay: var(--tr-start-delay, 0ms);
  }
  @keyframes tr-cursor { 50% { border-color: transparent; } }

  @media (prefers-reduced-motion: reduce) {
    .title-reveal:not(.no-reduce-motion) .tr-ch,
    .title-reveal:not(.no-reduce-motion) .tr-wrap {
      opacity: 1 !important;
      transform: none !important;
      clip-path: none !important;
      animation: none !important;
      border-right-color: transparent !important;
    }
  }
  @media (scripting: none) {
    .title-reveal .tr-ch, .title-reveal .tr-wrap {
      opacity: 1;
      transform: none;
      clip-path: none;
    }
  }
</style>

<script>
  async function runTitleReveal() {
    const els = document.querySelectorAll<HTMLElement>(".title-reveal:not(.revealed)");
    if (!els.length) return;
    await Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise(r => setTimeout(r, 1500)),
    ]);
    els.forEach(el => {
      el.style.setProperty("--tr-start-delay", `${el.dataset.delay}ms`);
      el.style.setProperty("--tr-duration", `${el.dataset.duration}ms`);
      el.style.setProperty("--tr-stagger", `${el.dataset.stagger}ms`);
      el.classList.add("revealed");
    });
  }
  runTitleReveal();
  document.addEventListener("astro:page-load", runTitleReveal);
</script>
```

- [ ] **Step 2: 提交**

```bash
git add packages/theme/src/components/ui/TitleReveal.astro
git commit -m "feat(animation): TitleReveal CSS + 运行时触发脚本"
```

---

### Task 3.3: 接到 HeroSection

**Files:**
- Modify: `packages/theme/src/components/ui/HeroSection.astro`

- [ ] **Step 1: 替换 h1 渲染**

顶部 frontmatter 加 import 和 config：

```astro
---
import TitleReveal from "./TitleReveal.astro";
import { loadThemeConfig } from "../../config/loader.ts";

interface Props { title: string; description: string; }

const { title, description } = Astro.props;
const config = loadThemeConfig();
const enabled = config.features.animation && config.animation.apply_to.includes("hero");
---
```

将原 `<h1>...{title}...</h1>` 块替换为：

```astro
<TitleReveal
  text={title}
  as="h1"
  class="mt-4 max-w-3xl tracking-tight"
  style={`font-family: var(--font-heading); font-feature-settings: "kern" 1; font-weight: 600; font-size: clamp(2.625rem, 5vw + 1rem, 5.125rem); line-height: 1.17; color: var(--color-dark-text);`}
  enabled={enabled}
/>
```

- [ ] **Step 2: dev 验证**

```bash
pnpm dev --host
```
打开首页，h1 应该逐字上浮出现（字体加载完后 ~100ms 开始）。

- [ ] **Step 3: 提交**

```bash
git add packages/theme/src/components/ui/HeroSection.astro
git commit -m "feat(animation): HeroSection h1 接入 TitleReveal"
```

---

### Task 3.4: 接到 ArticleLayout（h1 + subtitle）

**Files:**
- Modify: `packages/theme/src/layouts/ArticleLayout.astro`

- [ ] **Step 1: frontmatter 加 config**

在顶部 imports 后追加：

```astro
import TitleReveal from "../components/ui/TitleReveal.astro";
import { loadThemeConfig } from "../config/loader.ts";

const config = loadThemeConfig();
const titleEnabled = config.features.animation && config.animation.apply_to.includes("article-title");
const subtitleEnabled = config.features.animation && config.animation.apply_to.includes("article-subtitle");
```

- [ ] **Step 2: 替换 h1**

原 `<h1 class="mt-3 max-w-3xl" ...>{title}</h1>` 替换为：

```astro
<TitleReveal
  text={title}
  as="h1"
  class="mt-3 max-w-3xl"
  style={`font-family: var(--font-heading); font-feature-settings: "kern" 1; font-weight: 600; font-size: clamp(1.875rem, 4vw + 0.5rem, 3.25rem); line-height: 1.17; color: var(--color-dark-text);`}
  enabled={titleEnabled}
/>
```

- [ ] **Step 3: 替换 subtitle（带 350 延迟）**

原 `{subtitle && (<p class="mt-4 max-w-2xl text-[1.25rem] leading-relaxed" ...>{subtitle}</p>)}` 替换为：

```astro
{subtitle && (
  <TitleReveal
    text={subtitle}
    as="p"
    delay={350}
    class="mt-4 max-w-2xl text-[1.25rem] leading-relaxed"
    style="color: var(--color-dark-text-secondary);"
    enabled={subtitleEnabled}
  />
)}
```

- [ ] **Step 4: dev 验证**

任意文章页：h1 播完小半 → subtitle 再淡入。

- [ ] **Step 5: 提交**

```bash
git add packages/theme/src/layouts/ArticleLayout.astro
git commit -m "feat(animation): ArticleLayout h1 + subtitle 接入 TitleReveal"
```

---

### Task 3.5: 接到 Header 品牌 Logo

**Files:**
- Modify: `packages/theme/src/components/layout/Header.astro`

- [ ] **Step 1: 加 imports + config**

frontmatter 顶部：

```astro
import TitleReveal from "../ui/TitleReveal.astro";
import { loadThemeConfig } from "../../config/loader.ts";

const config = loadThemeConfig();
const logoAnim = config.features.animation && config.animation.apply_to.includes("nav-logo");
```

- [ ] **Step 2: 替换 brand anchor 内容**

原：

```astro
<a href="/" class="text-[1.19rem] font-bold tracking-tight" style={...}>
  {title}
</a>
```

替换为：

```astro
<a href="/" class="text-[1.19rem] font-bold tracking-tight" style={`color: ${textColor}; font-family: var(--font-heading); font-feature-settings: "kern" 1;`}>
  <TitleReveal text={title} as="span" enabled={logoAnim} />
</a>
```

- [ ] **Step 3: dev 验证**

任意页刷新 → Logo 逐字上浮。切页（首页 → 标签页） → Logo 再次播放。

- [ ] **Step 4: 手动 reduced-motion 测试**

Chrome DevTools → Rendering → Emulate CSS media `prefers-reduced-motion: reduce` → 所有标题应直接显示，无动画。

- [ ] **Step 5: 提交**

```bash
git add packages/theme/src/components/layout/Header.astro
git commit -m "feat(animation): Header Logo 接入 TitleReveal"
```


---

## Phase 4 · 搜索（P4）

### Task 4.1: 加依赖

**Files:**
- Modify: `playground/package.json`

- [ ] **Step 1: 安装**

```bash
pnpm add --filter playground astro-pagefind pagefind
```

- [ ] **Step 2: 提交**

```bash
git add playground/package.json pnpm-lock.yaml
git commit -m "chore(search): 加 astro-pagefind + pagefind deps"
```

---

### Task 4.2: shortcut 解析器

**Files:**
- Create: `packages/theme/src/config/shortcut.ts`
- Create: `packages/theme/src/config/shortcut.test.ts`

- [ ] **Step 1: 写测试**

```ts
// packages/theme/src/config/shortcut.test.ts
import { describe, it, expect } from "vitest";
import { parseShortcut, matchShortcut } from "./shortcut.ts";

describe("parseShortcut", () => {
  it("mod+k → metaOrCtrl + k", () => {
    expect(parseShortcut("mod+k")).toEqual([{ mod: true, key: "k" }]);
  });

  it("slash → /", () => {
    expect(parseShortcut("slash")).toEqual([{ mod: false, key: "/" }]);
  });

  it("数组多绑定", () => {
    expect(parseShortcut(["mod+k", "slash"])).toEqual([
      { mod: true, key: "k" },
      { mod: false, key: "/" },
    ]);
  });
});

describe("matchShortcut", () => {
  it("mod+k 事件匹配", () => {
    const e = { metaKey: true, ctrlKey: false, key: "k", altKey: false } as KeyboardEvent;
    expect(matchShortcut(e, parseShortcut("mod+k"))).toBe(true);
  });

  it("slash 无 mod", () => {
    const e = { metaKey: false, ctrlKey: false, key: "/", altKey: false } as KeyboardEvent;
    expect(matchShortcut(e, parseShortcut("slash"))).toBe(true);
  });

  it("不带 mod 的 k 不匹配 mod+k", () => {
    const e = { metaKey: false, ctrlKey: false, key: "k", altKey: false } as KeyboardEvent;
    expect(matchShortcut(e, parseShortcut("mod+k"))).toBe(false);
  });
});
```

- [ ] **Step 2: 实现**

```ts
// packages/theme/src/config/shortcut.ts
export interface ShortcutBinding { mod: boolean; key: string; }

export function parseShortcut(input: string | string[]): ShortcutBinding[] {
  const arr = Array.isArray(input) ? input : [input];
  return arr.map(s => {
    if (s === "slash") return { mod: false, key: "/" };
    const parts = s.toLowerCase().split("+").map(p => p.trim());
    const mod = parts.includes("mod") || parts.includes("ctrl") || parts.includes("cmd");
    const key = parts[parts.length - 1];
    return { mod, key };
  });
}

export function matchShortcut(e: KeyboardEvent, bindings: ShortcutBinding[]): boolean {
  const mod = e.metaKey || e.ctrlKey;
  return bindings.some(b => b.mod === mod && e.key.toLowerCase() === b.key);
}
```

- [ ] **Step 3: 测试通过**

```bash
pnpm test packages/theme/src/config/shortcut.test.ts
```
预期：6 tests PASS

- [ ] **Step 4: 提交**

```bash
git add packages/theme/src/config/shortcut.ts packages/theme/src/config/shortcut.test.ts
git commit -m "feat(search): shortcut 快捷键解析器"
```

---

### Task 4.3: use-pagefind hook

**Files:**
- Create: `packages/theme/src/components/search/use-pagefind.ts`

- [ ] **Step 1: 实现**

```ts
// packages/theme/src/components/search/use-pagefind.ts
import { useCallback, useEffect, useRef, useState } from "react";

export interface PagefindResult {
  id: string;
  url: string;
  meta: Record<string, string>;
  excerpt: string;
}

interface PagefindAPI {
  search(q: string): Promise<{ results: Array<{ id: string; data(): Promise<{ url: string; meta: Record<string, string>; excerpt: string }> }> }>;
}

let cached: PagefindAPI | null = null;
let loadPromise: Promise<PagefindAPI | null> | null = null;

async function loadPagefind(): Promise<PagefindAPI | null> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      // @ts-expect-error - runtime path, no types
      const mod = await import(/* @vite-ignore */ "/pagefind/pagefind.js");
      cached = mod as PagefindAPI;
      return cached;
    } catch {
      return null;
    }
  })();
  return loadPromise;
}

export interface UsePagefindState {
  ready: boolean;
  unavailable: boolean;
  loading: boolean;
  results: PagefindResult[];
  error: string | null;
}

export function usePagefind(query: string) {
  const [state, setState] = useState<UsePagefindState>({
    ready: false, unavailable: false, loading: false, results: [], error: null,
  });
  const reqId = useRef(0);

  useEffect(() => {
    loadPagefind().then(api => {
      if (api) setState(s => ({ ...s, ready: true }));
      else setState(s => ({ ...s, unavailable: true }));
    });
  }, []);

  useEffect(() => {
    if (!state.ready || query.length < 2) {
      setState(s => ({ ...s, results: [], loading: false }));
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const api = cached!;
        const { results: raw } = await api.search(query);
        const data = await Promise.all(raw.slice(0, 8).map(r => r.data()));
        if (id !== reqId.current) return;
        const results: PagefindResult[] = data.map((d, i) => ({
          id: raw[i].id, url: d.url, meta: d.meta, excerpt: d.excerpt,
        }));
        setState(s => ({ ...s, loading: false, results }));
      } catch (err) {
        if (id !== reqId.current) return;
        setState(s => ({ ...s, loading: false, error: String(err) }));
      }
    }, 120);
    return () => clearTimeout(t);
  }, [query, state.ready]);

  return state;
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/theme/src/components/search/use-pagefind.ts
git commit -m "feat(search): use-pagefind hook 懒加载 + debounce"
```

---

### Task 4.4: SearchResult 组件

**Files:**
- Create: `packages/theme/src/components/search/SearchResult.tsx`

- [ ] **Step 1: 实现**

```tsx
// packages/theme/src/components/search/SearchResult.tsx
import type { PagefindResult } from "./use-pagefind.ts";

interface Props {
  result: PagefindResult;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

export function SearchResult({ result, active, onMouseEnter, onClick }: Props) {
  const title = result.meta.title ?? result.url;
  return (
    <li
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`px-4 py-2.5 cursor-pointer ${active ? "bg-[rgba(34,100,214,0.2)]" : ""}`}
      style={{ color: active ? "var(--color-dark-text)" : "#cbd5e1" }}
    >
      <div className="text-[14px] font-medium">{title}</div>
      <div
        className="text-[12px] mt-1 line-clamp-2 opacity-80"
        dangerouslySetInnerHTML={{ __html: result.excerpt }}
      />
    </li>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/theme/src/components/search/SearchResult.tsx
git commit -m "feat(search): SearchResult 单条结果组件"
```


---

### Task 4.5: SearchDialog 模态

**Files:**
- Create: `packages/theme/src/components/search/SearchDialog.tsx`

- [ ] **Step 1: 实现**

```tsx
// packages/theme/src/components/search/SearchDialog.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { usePagefind } from "./use-pagefind.ts";
import { SearchResult } from "./SearchResult.tsx";
import { parseShortcut, matchShortcut } from "../../config/shortcut.ts";

interface Props {
  shortcut: string | string[];
  placeholder: string;
}

export function SearchDialog({ shortcut, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const { results, loading, unavailable } = usePagefind(open ? query : "");

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    (triggerRef.current as HTMLElement | null)?.focus();
  }, []);

  useEffect(() => {
    const bindings = parseShortcut(shortcut);
    const onKey = (e: KeyboardEvent) => {
      if (!open && matchShortcut(e, bindings)) {
        e.preventDefault();
        triggerRef.current = document.activeElement;
        setOpen(true);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
      else if (e.key === "Enter" && results[active]) {
        e.preventDefault();
        window.location.href = results[active].url;
      }
    };
    document.addEventListener("keydown", onKey);
    const onOpenEvt = () => {
      triggerRef.current = document.activeElement;
      setOpen(true);
    };
    document.addEventListener("search-dialog:open", onOpenEvt);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("search-dialog:open", onOpenEvt);
    };
  }, [open, results, active, shortcut, close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="搜索"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={close}
    >
      <div
        className="w-full max-w-[560px] rounded-xl overflow-hidden"
        style={{ background: "#161b22", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 text-[15px] outline-none"
          style={{ background: "transparent", color: "var(--color-dark-text)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          disabled={unavailable}
        />
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto">
          {unavailable && (
            <li className="px-4 py-6 text-[13px]" style={{ color: "#94a3b8" }}>
              开发模式下无索引。请运行 <code>pnpm build && pnpm start</code> 预览。
            </li>
          )}
          {!unavailable && query.length < 2 && (
            <li className="px-4 py-6 text-[13px]" style={{ color: "#94a3b8" }}>请输入 2 个或更多字符</li>
          )}
          {!unavailable && query.length >= 2 && loading && (
            <li className="px-4 py-6 text-[13px]" style={{ color: "#94a3b8" }}>搜索中...</li>
          )}
          {!unavailable && query.length >= 2 && !loading && results.length === 0 && (
            <li className="px-4 py-6 text-[13px]" style={{ color: "#94a3b8" }}>未找到「{query}」相关文章</li>
          )}
          {results.map((r, i) => (
            <SearchResult
              key={r.id}
              result={r}
              active={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => { window.location.href = r.url; }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add packages/theme/src/components/search/SearchDialog.tsx
git commit -m "feat(search): SearchDialog 模态 + 键盘导航 + focus 管理"
```

---

### Task 4.6: SearchTrigger Astro 组件

**Files:**
- Create: `packages/theme/src/components/search/SearchTrigger.astro`

- [ ] **Step 1: 实现**

```astro
---
import { SearchDialog } from "./SearchDialog.tsx";
import { loadThemeConfig } from "../../config/loader.ts";

const config = loadThemeConfig();
const enabled = config.features.search && config.search.engine !== "none";

interface Props { variant?: "light" | "dark"; }
const { variant = "dark" } = Astro.props;
const color = variant === "dark" ? "#9ca3af" : "#656a76";
---

{enabled && (
  <>
    {/* Desktop */}
    <button
      class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] font-mono transition-colors"
      style={`background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: ${color};`}
      onclick="document.dispatchEvent(new CustomEvent('search-dialog:open'))"
      aria-label="打开搜索"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
      </svg>
      <span>⌘K</span>
    </button>

    {/* Mobile icon */}
    <button
      class="flex sm:hidden p-1"
      style={`color: ${color};`}
      onclick="document.dispatchEvent(new CustomEvent('search-dialog:open'))"
      aria-label="打开搜索"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
      </svg>
    </button>

    <SearchDialog
      client:idle
      shortcut={config.search.shortcut}
      placeholder={config.search.placeholder}
    />
  </>
)}
```

- [ ] **Step 2: 提交**

```bash
git add packages/theme/src/components/search/SearchTrigger.astro
git commit -m "feat(search): SearchTrigger 桌面 kbd + 移动图标 + client:idle 水合"
```

---

### Task 4.7: 接入 Header

**Files:**
- Modify: `packages/theme/src/components/layout/Header.astro`

- [ ] **Step 1: 加 import**

frontmatter 顶部：

```astro
import SearchTrigger from "../search/SearchTrigger.astro";
```

- [ ] **Step 2: 桌面 nav-links 插入**

找到 `<!-- Desktop -->` 块，在 RSS 链接**之前**插入：

```astro
<SearchTrigger variant={variant} />
```

（注意桌面版的 SearchTrigger 自动只显示 `hidden sm:flex` 的那个 button，移动端 button 会显示另一个。但因为它们共用组件，我们也要在移动 section 放一份——所以实际上 SearchTrigger 组件内部两个 button 一起渲染即可，Header 只引用一次）

修正：Header 只需要在 sm:flex 容器**之前**挂一份 SearchTrigger，它内部的两个 `<button>` 分别用 `hidden sm:flex` 和 `flex sm:hidden` 控制显示。

具体位置：`<div class="hidden items-center gap-8 sm:flex">` 的 **外面前面**，包在 `<nav>` 里，和这个 div 平级（即作为独立一项，桌面版的 kbd 按钮在它旁边，移动版的图标按钮也在它旁边）。

最干净的做法：把 SearchTrigger 放在 mobile 区域之前，作为跨桌面/移动的插槽：

```astro
<nav class="mx-auto flex max-w-[1150px] items-center justify-between px-6 py-3 lg:px-8">
  <a href="/" ...>{title}</a>

  <div class="flex items-center gap-4">
    <SearchTrigger variant={variant} />

    <!-- Desktop -->
    <div class="hidden items-center gap-8 sm:flex">
      ...
    </div>

    <!-- Mobile -->
    <div class="flex items-center gap-4 sm:hidden">
      ...
    </div>
  </div>
</nav>
```

- [ ] **Step 3: dev 验证**

```bash
pnpm dev --host
```

Header 桌面：Logo | ⌘K 搜索按钮 | 首页/标签/RSS/主题切换
Header 移动：Logo | 搜索图标 | 主题切换 | 菜单

按 `⌘K` → 弹出模态。

- [ ] **Step 4: 提交**

```bash
git add packages/theme/src/components/layout/Header.astro
git commit -m "feat(search): Header 插入 SearchTrigger"
```

---

### Task 4.8: 模板加 pagefind 语义标记

**Files:**
- Modify: `packages/theme/src/layouts/ArticleLayout.astro`
- Modify: `packages/theme/src/components/article/TableOfContents.astro`
- Modify: `packages/theme/src/components/layout/Footer.astro`

- [ ] **Step 1: ArticleLayout `<article>` + 权重**

frontmatter 加：

```astro
const weights = config.search.weights;
```

把 `<article class="mx-auto w-full max-w-[65ch] py-12 lg:py-16">` 改为：

```astro
<article class="mx-auto w-full max-w-[65ch] py-12 lg:py-16" data-pagefind-body>
```

`<h1>` 的 TitleReveal（上一任务替换的）加 data 属性——**改组件不好传透**，直接把 TitleReveal 包在一个带属性的 `<div>` 里：

```astro
<div data-pagefind-weight={weights.title}>
  <TitleReveal ... />
</div>
```

tag 链接块（`tags.map(...)`），每个 `<a>` 加：

```astro
data-pagefind-weight={weights.tags}
data-pagefind-filter={`tag:${tag}`}
```

`<time>` 加：

```astro
data-pagefind-meta="date"
```

`{author}` 所在 `<span>` 加：

```astro
data-pagefind-meta="author"
```

`{formattedUpdated}` 的 `<span>` 加：

```astro
data-pagefind-ignore
```

（更新时间不进索引）

- [ ] **Step 2: TableOfContents 加 ignore**

在 `<nav>` 或最外层元素加：

```astro
data-pagefind-ignore
```

- [ ] **Step 3: Footer 加 ignore**

```astro
<footer data-pagefind-ignore ...>
```

- [ ] **Step 4: Header 加 ignore**

修改 `<header class="sticky ...">`：

```astro
<header class="sticky top-0 z-50" data-pagefind-ignore style={...}>
```

- [ ] **Step 5: 提交**

```bash
git add packages/theme/src/layouts/ArticleLayout.astro packages/theme/src/components/article/TableOfContents.astro packages/theme/src/components/layout/Footer.astro packages/theme/src/components/layout/Header.astro
git commit -m "feat(search): 模板加 pagefind 权重/body/ignore/meta 标记"
```

---

### Task 4.9: Astro 集成 + PWA 缓存

**Files:**
- Create: `packages/theme/src/integrations/search.ts`
- Modify: `playground/astro.config.mjs`

- [ ] **Step 1: 封装 astro-pagefind**

```ts
// packages/theme/src/integrations/search.ts
import type { AstroIntegration } from "astro";
import pagefind from "astro-pagefind";
import type { ThemeConfig } from "../config/schema.ts";

export function searchIntegration(config: ThemeConfig): AstroIntegration | null {
  if (!config.features.search || config.search.engine !== "pagefind") return null;
  return pagefind();
}
```

- [ ] **Step 2: astro.config.mjs 注入 + workbox**

import：

```js
import { searchIntegration } from "@pkg/theme/integrations/search";
```

integrations 数组末尾（inject 之前或之后都可）：

```js
searchIntegration(themeConfig),
```

由于 `searchIntegration` 可能返回 null（search 禁用时），改为 filter：

```js
integrations: [
  mdx(),
  react(),
  sitemap(),
  AstroPWA({ ... }),
  searchIntegration(themeConfig),
  injectThemePages(themeConfig),
].filter(Boolean),
```

workbox `runtimeCaching` 数组最后追加两条：

```js
{
  urlPattern: /\/pagefind\/pagefind\.js$/,
  handler: "CacheFirst",
  options: {
    cacheName: "pagefind-core",
    expiration: { maxEntries: 2, maxAgeSeconds: ONE_YEAR },
    cacheableResponse: { statuses: [0, 200] },
  },
},
{
  urlPattern: /\/pagefind\/(fragment|index)\//,
  handler: "StaleWhileRevalidate",
  options: {
    cacheName: "pagefind-chunks",
    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
    cacheableResponse: { statuses: [0, 200] },
  },
},
```

- [ ] **Step 3: build 验证**

```bash
pnpm build
ls playground/dist/pagefind/
```
预期：看到 `pagefind.js`, `index/*.pf_index`, `fragment/*.pf_fragment`

- [ ] **Step 4: 本地预览搜索**

```bash
pnpm start
```
打开 `http://localhost:4321`，按 `⌘K` → 输入"架构" → 看到结果跳转有效。

- [ ] **Step 5: 提交**

```bash
git add packages/theme/src/integrations/search.ts playground/astro.config.mjs
git commit -m "feat(search): astro-pagefind 集成 + workbox runtimeCaching"
```


---

## Phase 5 · 清理 & 文档（P5）

### Task 5.1: 勾掉 TODO.md 完成项

**Files:**
- Modify: `TODO.md`

- [ ] **Step 1: 把已完成项从"进行中 / 待开发"移到"已完成"**

把 `## 已完成` 段追加：

```markdown
- [x] 字体子集化 5.2 MB → ~1 MB（hybrid 策略）
- [x] 全文搜索（pagefind + ⌘K 模态）
- [x] 标题动画（TitleReveal 逐字上浮）
- [x] 配置层（JSON Schema + TOML loader）
```

删除 / 归档 `## 进行中` 的 PWA 字体 hash 验证项（本迭代已验证过），`## 技术优化 / 技术债` 下的：
- 「字体子集化 5.2 MB → ~1 MB」整条删
- 「PWA · 字体缓存 max-age 365 天 + 文件 hash 复核」标记 ✓ 验证通过（prebuild 命令覆盖）

- [ ] **Step 2: 提交**

```bash
git add TODO.md
git commit -m "docs(todo): 勾掉字体子集化/搜索/动画完成项"
```

---

### Task 5.2: README 补新特性

**Files:**
- Modify: `README.md`

- [ ] **Step 1: "特性" 段插入三条**

把 `## 特性` 的列表改为：

```markdown
- **内容**：MDX + Frontmatter，内嵌 Mermaid 图表、medium-zoom 图片放大、Slidev 风演讲模式
- **PWA**：Workbox runtime caching，HTML / 字体 / 静态资源分层缓存策略
- **搜索**：Pagefind 全文搜索 + ⌘K 模态，CJK 原生分词
- **SEO**：自动 `sitemap.xml`、RSS feed
- **中文排版**：霞鹜文楷 Lite（LXGW WenKai）本地字体，subset 到 ~1 MB，unicode-range 兜底
- **动效**：标题逐字上浮进场（可配置 variant / 关闭 / 尊重 prefers-reduced-motion）
- **移动端**：点击反馈、分页/卡片触感优化、maskable PWA icon
- **工程化**：pnpm 10 monorepo、Biome 代码检查、Vitest 单测、GitHub Actions CI
- **配置**：`config.toml` + JSON Schema 语言中立契约（预留未来 Rust CLI + WebUI）
```

- [ ] **Step 2: 补 "快速开始" 段**

在 `pnpm lint:fix` 之后追加：

```markdown
pnpm test          # Vitest 单元测试
pnpm fonts:build   # 字体子集化（新增文章用到罕用字后需重跑）
```

- [ ] **Step 3: 补新章节 "配置"**

在 "目录结构" 之后插入：

```markdown
## 配置

站点通过 `playground/config.toml` 配置，字段 schema 见 [`docs/config.schema.md`](./docs/config.schema.md) 和机器可读的 [`schema/config.schema.json`](./schema/config.schema.json)。

`config.toml` 未来将由 CLI（Rust）+ WebUI 运营后台生成。当前手写编辑。
```

- [ ] **Step 4: 提交**

```bash
git add README.md
git commit -m "docs(readme): 补搜索 / 字体子集化 / 动画 / 配置章节"
```

---

### Task 5.3: 全量冒烟 + lint

- [ ] **Step 1: lint**

```bash
pnpm lint
```
预期：无错误。有错 → `pnpm lint:fix`

- [ ] **Step 2: 全部测试**

```bash
pnpm test
```
预期：所有 describe 都 pass

- [ ] **Step 3: 清 build + 冒烟**

```bash
rm -rf playground/dist dist
pnpm build
ls playground/dist/pagefind/ && ls -lh packages/theme/src/styles/fonts/LXGWWenKaiLite-Regular.woff2
```
预期：pagefind 目录非空；字体产物 ~1MB

- [ ] **Step 4: 启动预览全面点一遍**

```bash
pnpm start
```

验证清单：
- [ ] 首页 Hero 标题逐字上浮
- [ ] 详情页 h1 逐字上浮
- [ ] 详情页 subtitle 延迟 350ms 再上浮
- [ ] 点任何链接换页 → Logo 重新上浮
- [ ] 按 `⌘K` / `Ctrl+K` 打开搜索
- [ ] 输入"架构" → 有结果，↑↓ 移动高亮，Enter 跳转
- [ ] Esc 关闭，焦点返还
- [ ] 移动视口（DevTools mobile 模拟）→ 搜索图标可点开模态
- [ ] DevTools Rendering → prefers-reduced-motion: reduce → 所有动画禁用
- [ ] 故意 throw 一个罕用字进某篇 mdx（不 build fonts 情况下），浏览器看到字用 Noto Sans SC 兜底，不是豆腐块

- [ ] **Step 5: 如有临时调试改动，归零或 commit**

全绿后用一句话总结提交（如必要）：

```bash
# 如有任何调整
git add -A
git commit -m "chore: 冒烟修正"
```

---

## Self-Review 对照

**Spec coverage** —— 逐节对照 spec：

| Spec 节 | 覆盖任务 |
|---|---|
| 2.1 落点矩阵 | 各 Task 的 Files 段 |
| 2.3 实施顺序 | Phase 1-4 顺序 |
| 3.1 真理源 | Task 1.1 |
| 3.2 config.toml 扩展 | Task 1.4 |
| 3.3 三层优先级 | Task 1.2/1.3（props / TOML / DEFAULTS） |
| 3.4 injectThemePages 升级 | Task 1.5 |
| 4.1-4.8 字体 | Phase 2 全部 |
| 5.1-5.10 搜索 | Phase 4 全部 |
| 6.1-6.9 动画 | Phase 3 全部 |
| 7.1 测试 | 散在各 Task（TDD 步骤）+ Task 5.3 冒烟 |
| 7.2 可观测性 | Task 2.5 `.meta.json` |
| 7.3 回滚 | config.toml feature flag 覆盖（无专项） |
| 7.4 部署 | Task 4.9 Step 3 验证 `dist/pagefind/` |
| 7.5 新增依赖 | Task 1.3 / 2.1 / 4.1 |
| 9 未决/留口 | 不实施（明确 future-work） |

**Placeholder scan**：无 TBD/TODO/fill-in。

**Type consistency**：`ThemeConfig` 字段在 schema.ts / defaults.ts / loader.ts / JSON Schema 四处一致（本 plan 文本内各处字段名拼写已对齐）。`PagefindResult` 在 use-pagefind.ts / SearchResult.tsx / SearchDialog.tsx 三处一致。`parseShortcut` / `matchShortcut` 签名在 shortcut.ts / SearchDialog.tsx 一致。

---

## 执行选择

**Plan complete and saved to `docs/superpowers/plans/2026-04-18-fonts-search-title-anim.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 每个 Task 派一个 fresh subagent，主会话负责 review；迭代快，上下文干净
**2. Inline Execution** — 本会话连续执行，按 phase 做 checkpoint 审阅

**选哪个？**

