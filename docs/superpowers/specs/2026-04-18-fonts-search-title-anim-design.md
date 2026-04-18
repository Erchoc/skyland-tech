# 字体子集化 · 站内搜索 · 标题动画 — 设计文档

**日期**：2026-04-18
**状态**：Draft（等待用户确认 → 进入 writing-plans）
**作者**：龙野（大哥）+ Claude

---

## 1. 背景与目标

`tech.longye.site`（Skyland Tech / 空岛云技术）是一个基于 Astro 5 的 pnpm monorepo 技术博客，主题层 `@pkg/theme` 通过 `injectThemePages()` 注入路由到 `playground/`。本次迭代一次性推进三项相互独立、但共享**配置抽象**的功能：

1. **字体子集化**：`LXGWWenKaiLite-Regular.woff2` 从 5.2 MB 降到 ~1 MB
2. **站内搜索**：Pagefind 全文搜索 + ⌘K 模态
3. **标题动画**：首页 Hero / 详情页 h1 / subtitle / 导航 Logo 的"从左到右逐字上浮"进场动画

同时奠定一个**语言中立的配置层**，为未来 Rust 版 CLI + WebUI 运营工具预留契约。

### 非目标

- 不改造 `packages/cli` (TS)——它会被 Rust 重写，本轮冻结
- 不做组件覆盖机制（slot / alias override）——用户通过 CLI/WebUI 配置，不接触 Astro
- 不引入 Playwright（本轮只做 Vitest 单元测试）
- 不升级 Astro / Tailwind 主版本

---

## 2. 架构总览

### 2.1 落点矩阵

| 功能 | 文件位置 | 性质 |
|---|---|---|
| 字体子集化 | `scripts/build-fonts.mjs` + `packages/theme/src/styles/fonts/` | 构建期工具 |
| 搜索 | `packages/theme/src/components/search/` + `packages/theme/src/integrations/search.ts` | 运行时 + 构建期 |
| 标题动画 | `packages/theme/src/components/ui/TitleReveal.astro` | 运行时组件 |

### 2.2 相互依赖

- 字体和其他两项**完全解耦**
- 搜索触发器（⌘K 按钮）和 Logo 动画都在 `Header.astro` → 交叉测试点
- TitleReveal 必须等 `document.fonts.ready`——字体加载是**硬前置**（否则字形跳动）

### 2.3 实施顺序

**P1 配置层** → **P2 字体** → **P3 动画** → **P4 搜索**

配置层先行，其他三项都消费它。字体解耦彻底放前面，搜索最复杂放最后。

---

## 3. 配置层（先决条件）

### 3.1 真理之源

**JSON Schema** 是跨语言契约的单一真理：

- `schema/config.schema.json` — 机器可读，Rust CLI 用 `serde + schemars` 消费，WebUI 可自动生成表单
- `docs/config.schema.md` — 人类可读文档，字段语义、默认值、取值范围

Astro 侧**不引入 zod/ajv 等运行时校验库**。用户永远不直接编辑 `config.toml`（由 CLI/WebUI 写入），Astro 只做：

```ts
// packages/theme/src/config/loader.ts
export function loadThemeConfig(): ThemeConfig {
  const raw = parseTOML(readFileSync(cwd + "/config.toml", "utf8"))
  return mergeDeep(DEFAULTS, raw)
}
```

TS 类型手写镜像 JSON Schema，字段不多。CI 里可选加一个脚本比对两边一致性（本轮不做）。

### 3.2 `config.toml` 扩展

```toml
[site]
title = "空岛云技术"
description = "纯技术 + 架构设计文章合集"
author = "龙野"
url = "https://tech.longye.site"
lang = "zh-CN"

[theme]
color = "#6366f1"
dark = true
layout = "magazine"

[social]
github = "https://github.com/Erchoc/skyland-tech"

[categories]
list = ["架构设计", "工程实践", "性能优化", "基础设施"]

[features]
pwa = true
slides = true
search = true
rss = true
animation = true       # 新增：动画总开关

[animation]            # 新增
variant = "slide-up"   # "slide-up" | "fade" | "wipe" | "typewriter" | "none"
duration = 550         # ms
stagger = 100          # 逐字间隔 ms
apply_to = ["hero", "article-title", "article-subtitle", "nav-logo"]
reduced_motion = "respect"  # "respect" | "force-off"

[search]               # 新增
engine = "pagefind"    # "pagefind" | "none"
shortcut = "mod+k"     # "mod+k" / "slash" / 数组
placeholder = "搜索文章..."
weights = { title = 10, tags = 5, body = 1 }

[fonts]                # 新增
subset_strategy = "hybrid"  # "scan" | "baseline" | "hybrid"
baseline_charset = "cjk-3500"
scan_globs = ["playground/posts/**/*.mdx", "packages/theme/src/**/*.{astro,tsx,ts}"]
preload = true
```

### 3.3 三层优先级

| 层级 | 机制 | 用途 |
|---|---|---|
| 运行时（最高） | 组件 props：`<TitleReveal variant="fade" />` | 单点覆盖 |
| 站点配置 | `config.toml` | 用户默认值 |
| 内置默认 | `DEFAULTS` 常量 | 零配置行为 |

### 3.4 `injectThemePages` 升级

```ts
// packages/theme/src/integrations/inject-pages.ts
export function injectThemePages(config?: ThemeConfig): AstroIntegration
```

根据 `config.features.*` 决定是否注入某些路由（例如 `search === false` 不注入 `/search` 占位页——本轮不做独立 search 页，但 API 先留口）。

---

## 4. 字体子集化

### 4.1 工具链

**`subset-font` (npm, 纯 JS + harfbuzz.wasm)**。零 Python 依赖，与 Node 工具链一致，Vercel CI 天然能跑。对 5MB 字体约 3-5s，手动低频命令完全可接受。

### 4.2 流水线

```
输入:
  ├── packages/theme/src/styles/fonts/source/LXGWWenKaiLite-Regular.woff2  (5.2 MB 源, git-tracked)
  ├── config.toml [fonts]
  └── schema/baseline-cjk-3500.txt  (国家通用规范汉字一级 3500 字)
                ▼
[scripts/build-fonts.mjs]
  1. 读 config.toml [fonts]
  2. strategy ∈ {scan, hybrid}: glob scan_globs → 提取所有 [\u4e00-\u9fff] + ASCII
  3. strategy ∈ {baseline, hybrid}: union(baseline_charset 3500 字)
  4. 固定追加: ASCII 可打印 + CJK 标点 + 数字
  5. subset-font 生成子集
  6. 输出 .meta.json: { chars, bytes, scanHash, charsetHash, builtAt }
                ▼
产物:
  ├── packages/theme/src/styles/fonts/LXGWWenKaiLite-Regular.woff2  (~1 MB, git-tracked)
  └── packages/theme/src/styles/fonts/.meta.json
```

### 4.3 字符集合集

```
最终子集 = 扫描命中 (~1800 中文)
        ∪ 3500 常用字
        ∪ ASCII 可打印 (0x20-0x7E)
        ∪ CJK 标点 (，。！？""''【】《》…—·、 等)
        ∪ Latin-1 Supplement 基础符号
```

### 4.4 罕用字兜底

不在子集里的字靠 CSS `unicode-range` + 字体栈接力：

```css
@font-face {
  font-family: "LXGW WenKai";
  src: url(".../LXGWWenKaiLite-Regular.woff2") format("woff2");
  font-display: swap;
  unicode-range: U+0020-007E, U+4E00-9FFF, ...;  /* 脚本自动生成精简区间 */
}
:root {
  --font-body: "LXGW WenKai", "Noto Sans SC", system-ui, sans-serif;
}
```

罕用字命中 range 之外 → 浏览器自动用 Noto Sans SC（已 preconnect）或系统字体。**视觉无缝，不出豆腐块**。

### 4.5 触发

**不自动化。只做手动 `pnpm fonts:build`。**

替代保障：`pnpm build` 前由 `scripts/check-fonts.mjs` 校验 `.meta.json` 的 `scanHash` 与当前扫描结果一致。不一致 → **build fail 提示 `Run: pnpm fonts:build`**。

### 4.6 PWA 缓存

Vite 对 `import "....woff2?url"` 产物自动加 content hash（BaseLayout 现状）。产物变 → URL 变 → Workbox CacheFirst 自动 miss 拉新。顺路验证 TODO.md 的 P3「字体缓存 max-age 365 天」疑问。

### 4.7 文件清单

**新增**：
- `scripts/build-fonts.mjs`
- `scripts/check-fonts.mjs`
- `schema/baseline-cjk-3500.txt`
- `packages/theme/src/styles/fonts/source/LXGWWenKaiLite-Regular.woff2`（mv 来）
- `packages/theme/src/styles/fonts/.meta.json`

**修改**：
- `package.json` — `fonts:build`、`prebuild` 脚本；deps `subset-font` `fast-glob`
- `packages/theme/src/styles/global.css` — `@font-face` 加 `unicode-range`
- `packages/theme/src/layouts/BaseLayout.astro` — preload 按 `config.fonts.preload` 条件

### 4.8 产物预期

- 扫描 + baseline：~4200 字
- 产物：**~980 KB**（-81%）
- 首屏 4G 下载：~0.4s（原 ~2s）

---

## 5. 搜索（pagefind + ⌘K 模态）

### 5.1 技术栈

| 件 | 选型 |
|---|---|
| 索引引擎 | Pagefind 1.x（CJK 原生、增量 chunk） |
| Astro 集成 | `astro-pagefind`（build 后生成 `dist/pagefind/`） |
| UI | 手写 React 组件（React 19 已依赖），不用 `@pagefind/default-ui` |
| 搜索 API | Pagefind JS API 懒加载，模态首开才 `import("/pagefind/pagefind.js")` |

### 5.2 组件拓扑

```
packages/theme/src/components/search/
  ├── SearchTrigger.astro     # Header 触发器 (桌面 kbd 按钮 + 移动图标)
  ├── SearchDialog.tsx        # 模态 (React, client:idle)
  ├── SearchResult.tsx        # 单条结果
  └── use-pagefind.ts         # 懒加载 + 搜索封装

packages/theme/src/integrations/
  └── search.ts               # 包装 astro-pagefind

packages/theme/src/config/
  └── shortcut.ts             # 解析 "mod+k" / "slash" / 数组 → KeyboardEvent
```

### 5.3 SearchTrigger 双形态

- **桌面**：`<button>` 像 kbd 按键，显示「⌘K 搜索」，插在 Header nav-links
- **移动**：圆形放大镜 icon 按钮，在 ThemeToggle 和汉堡之间

### 5.4 SearchDialog 行为

| 触发 | 响应 |
|---|---|
| `⌘K` / `Ctrl+K` / 自定义 | 打开模态 |
| 点击 Trigger | 打开模态 |
| `Esc` | 关闭 |
| `↑` / `↓` | 结果移动 |
| `Enter` | 跳转高亮结果 |
| 输入变化 | debounce 120ms → `pagefind.search(query)` |
| 首次打开 | 动态 import pagefind.js + 骨架 150ms |
| Backdrop 点击 | 关闭 |

**无障碍**：`role="dialog" aria-modal="true"`、focus trap、`aria-activedescendant`、关闭返还焦点。

### 5.5 权重（构建期烧进 HTML）

Pagefind 的权重机制是**在模板渲染 `data-pagefind-weight`**，构建时写进索引，搜索时零计算。模板改造：

| 模板 | 标记 |
|---|---|
| `ArticleLayout.astro` `<article>` | `data-pagefind-body` |
| h1 title | `data-pagefind-weight={config.search.weights.title}` |
| tag 链接 | `data-pagefind-weight={config.search.weights.tags}` + `data-pagefind-filter="tag"` |
| `<time>` / `{author}` | `data-pagefind-meta="date"` / `="author"` |
| `TableOfContents.astro` | `data-pagefind-ignore` |
| `Header.astro` / `Footer.astro` | `data-pagefind-ignore` |

**列表页 / 标签页不加 `data-pagefind-body`**——否则卡片标题会被索引为单独结果。

### 5.6 Dev 模式

Pagefind 索引只在 `astro build` 后存在。dev 下 `/pagefind/pagefind.js` 404 → Dialog 显示「开发模式下无索引，请 `pnpm build && pnpm start`」，输入框 disabled。**不做 dev fallback 实现**。

### 5.7 PWA 缓存策略

- `/pagefind/pagefind.js` → **CacheFirst + 1 年**（content-hashed）
- `/pagefind/fragment/*` / `/pagefind/index/*` → **StaleWhileRevalidate, 30 天**
- 不 precache

在 `playground/astro.config.mjs` 的 `@vite-pwa/astro` workbox `runtimeCaching` 新增规则。

### 5.8 快捷键解析

薄 parser ~20 行，映射 `"mod+k"` → `e.metaKey || e.ctrlKey` + `e.key === "k"`。**不引入 mousetrap / hotkeys-js**。

### 5.9 文件清单

**新增**：
- `packages/theme/src/components/search/SearchTrigger.astro`
- `packages/theme/src/components/search/SearchDialog.tsx`
- `packages/theme/src/components/search/SearchResult.tsx`
- `packages/theme/src/components/search/use-pagefind.ts`
- `packages/theme/src/integrations/search.ts`
- `packages/theme/src/config/shortcut.ts`

**修改**：
- `packages/theme/src/components/layout/Header.astro` — 插 SearchTrigger
- `packages/theme/src/layouts/ArticleLayout.astro` — `data-pagefind-*` 标记
- `packages/theme/src/components/article/TableOfContents.astro` — `data-pagefind-ignore`
- `packages/theme/src/components/layout/Footer.astro` — `data-pagefind-ignore`
- `playground/astro.config.mjs` — 注入 search integration + workbox runtimeCaching
- `playground/package.json` — deps `astro-pagefind` `pagefind`

### 5.10 错误处理

| 场景 | 行为 |
|---|---|
| pagefind.js 404 | 友好提示 + 输入框 disabled |
| `pagefind.search` 抛错 | "搜索服务暂时异常"，保留关键词，不崩溃 |
| 零结果 | "未找到「{q}」" + 推荐 3 篇最新 |
| 查询 < 2 字符 | 不请求，提示"再输入 {n} 个字符" |

---

## 6. 标题动画（TitleReveal 组件）

### 6.1 组件 API

```astro
<TitleReveal
  text="空岛云技术"
  as="h1"
  variant="slide-up"
  delay={0}
  duration={550}
  stagger={100}
  class="..."
  style="..."
  enabled={true}
/>
```

文本走 `text` prop，**服务端拆字**（`[...text]` Unicode 安全）。禁用时退化为纯 `<Tag>{text}</Tag>`，零 JS、零 span。

**variant 作用域**：本轮所有应用位置**共享同一个 variant**（来自 `config.animation.variant`）。不支持"Hero 用 slide-up、Logo 用 fade"的 per-location variant。四个位置**可独立 enable/disable**（通过 `apply_to`）、**可独立 delay**（通过组件 prop 传入），但 variant 是全局一致的。这是为了视觉统一，也简化配置表面。未来若需扩展为 `apply_to = [{ location = "hero", variant = "fade" }, ...]` 的对象数组形式，schema 可向后兼容升级。

### 6.2 渲染形态

```html
<h1 class="title-reveal variant-slide-up" data-delay="0" data-duration="550" data-stagger="100">
  <span class="tr-ch" style="--i:0">空</span>
  <span class="tr-ch" style="--i:1">岛</span>
  ...
</h1>
```

初始：`.tr-ch { opacity: 0; transform: translateY(12px); }`

加 `.revealed` class 后：`animation-delay: calc(var(--start-delay) + var(--i) * var(--stagger))`

### 6.3 触发脚本

```js
async function run() {
  const els = document.querySelectorAll(".title-reveal:not(.revealed)")
  if (!els.length) return
  await Promise.race([
    document.fonts.ready,
    new Promise(r => setTimeout(r, 1500))  // 慢网兜底
  ])
  els.forEach(el => {
    const { delay, duration, stagger } = el.dataset
    el.style.setProperty("--start-delay", `${delay}ms`)
    el.style.setProperty("--duration", `${duration}ms`)
    el.style.setProperty("--stagger", `${stagger}ms`)
    el.classList.add("revealed")
  })
}
run()
document.addEventListener("astro:page-load", run)  // View Transitions 未来兼容
```

### 6.4 Variants

| variant | 实现 |
|---|---|
| `slide-up` ← 默认 | `from { opacity:0, translateY(12px) } to { opacity:1, translateY(0) }` |
| `fade` | 仅 opacity |
| `wipe` | 容器 `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`，不拆字 |
| `typewriter` | `wipe` + `steps(n)` + 末尾蓝色光标 ::after |
| `none` | 退化为静态文本 |

### 6.5 prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  .title-reveal .tr-ch {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
  }
}
```

`config.animation.reduced_motion = "force-off"` → 根节点加 `.no-reduce-motion` class 覆盖 media query（不推荐但留口）。

### 6.6 应用位置 & delay

| 位置 | 文件 | delay 默认 |
|---|---|---|
| `hero` | `HeroSection.astro` h1 | 0 |
| `article-title` | `ArticleLayout.astro` h1 | 0 |
| `article-subtitle` | `ArticleLayout.astro` subtitle `<p>` | **350**（h1 播完小半再出） |
| `nav-logo` | `Header.astro` brand anchor | 0 |

`config.animation.apply_to` 数组控制——不在列表里的位置组件退化为纯文本。

### 6.7 Nav Logo 每页重播

Astro SSG 默认每次路由 = full page load → Logo 自然重挂载 → 动画自然重播。**不需额外 SPA 化**。未来加 View Transitions 可用 `astro:page-load` 监听器。

### 6.8 FOUC 兜底

```css
@media (scripting: none) {
  .title-reveal .tr-ch { opacity: 1; transform: none; }
}
```

JS 禁用用户也能看到内容。

### 6.9 文件清单

**新增**：
- `packages/theme/src/components/ui/TitleReveal.astro`

**修改**：
- `packages/theme/src/components/ui/HeroSection.astro` — h1 换 TitleReveal
- `packages/theme/src/layouts/ArticleLayout.astro` — h1 + subtitle 换
- `packages/theme/src/components/layout/Header.astro` — brand anchor 换

---

## 7. 非功能要素

### 7.1 测试

| 层 | 字体 | 搜索 | 动画 |
|---|---|---|---|
| 单元（Vitest 新引） | `build-fonts.mjs` I/O | `use-pagefind.ts` mock | 渲染断言 N spans |
| 集成 | `check-fonts.mjs` 哈希 | `pnpm build && ls dist/pagefind/` | — |
| E2E | —（本轮不做 Playwright） | — | — |
| 手动 | 4G throttling | reduced-motion DevTools | 移动端触感 |

Vitest 附带改动：
- **新增** `vitest.config.ts`（仓库根）
- **修改** 根 `package.json`：新增 `"test": "vitest run"` + `"test:watch": "vitest"`
- 单元测试文件就近放：`scripts/build-fonts.test.mjs`、`packages/theme/src/components/search/use-pagefind.test.ts` 等

### 7.2 可观测性

- 字体 `.meta.json` git-tracked → PR diff 可见变化
- Pagefind 构建失败 → Astro 构建自然 fail（astro-pagefind 内部抛错），**本轮不做额外 pre-start 校验**
- 动画无指标

### 7.3 回滚

- 每功能独立 feature flag (`config.toml`)——关掉即可
- 字体可回源字体（`fonts/source/*.woff2` 也是 5.2 MB 可用）

### 7.4 部署

- 字体产物 git-tracked → Vercel 零改动
- Pagefind 索引进 `dist/pagefind/` → Vercel 原样 serve
- `vercel.json` 不改

### 7.5 新增依赖

| 包 | 位置 | 作用 |
|---|---|---|
| `subset-font` | 仓库根 dev | 字体子集生成 |
| `fast-glob` | 仓库根 dev | 扫描字符集源文件 |
| `astro-pagefind` | playground | Astro 集成 |
| `pagefind` | playground | 索引引擎 |
| `vitest` | 仓库根 dev | 单元测试 |

---

## 8. 实施切分

**P1 配置层**（0.5d）→ 后面所有依赖
**P2 字体子集化**（0.5d）→ 完全独立
**P3 标题动画**（0.5d）→ 单组件
**P4 搜索**（1.5d）→ 最复杂

**总计 ~3 天**。writing-plans 阶段会进一步细化到可逐步验证的 task。

---

## 9. 未决 / 留口

- **JSON Schema 和 TS interface 一致性校验**：本轮手写镜像；未来 CI 加脚本比对
- **Pagefind 独立 `/search` 页**：本轮不做（⌘K 模态覆盖需求），future-work
- **View Transitions**：`astro:page-load` 监听器已预留，未来启用 view transitions 时自动兼容
- **TS CLI → Rust CLI 迁移**：不在本轮范围
- **WebUI 运营后台**：远期，依赖本轮沉淀的 JSON Schema

---

## 10. 需求溯源

| 需求 | 来源 |
|---|---|
| 动画形态 C (slide-up 逐字上浮) | Visual companion `title-animation.html` 选择 |
| 导航 Logo 每页也动 | 对话确认 |
| 搜索引擎 pagefind + 标题加权 | Visual companion `search-ui.html` 选 B + 引擎选 c |
| 字体混合策略 (scan + 3500 保底) | 对话选项 c |
| 不做覆盖机制 | 架构讨论：用户经 CLI/WebUI 访问，不接触 Astro |
| 不引入 zod | 跨语言需求，改用 JSON Schema + 手写 TS |
| 动画等 fonts.ready | 大哥确认"可以接受等待一下" |
