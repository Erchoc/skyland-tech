# TODO

## 已完成
- [x] 404 页面
- [x] Sitemap 生成
- [x] 文章列表分页 + mock 命令
- [x] 标签页改版（居中布局）
- [x] 演讲模式 overflow 修复
- [x] 卡片标题固定 2 行
- [x] Footer 高度缩减
- [x] 字体子集化 5.2 MB → 812 KB（hybrid 策略，3637 字符）
- [x] 全文搜索（pagefind + ⌘K 模态）
- [x] 标题动画（TitleReveal 逐字上浮，四种 variant 可配）
- [x] 配置层（JSON Schema + TOML loader + Vitest）
- [x] PWA 支持（离线访问、安装到桌面）

## 进行中

## 待开发

### P1
- [ ] About 页面（个人/团队介绍）

### P2
- [ ] 归档页（按时间线展示所有文章）
- [ ] 社交分享按钮（微信/Twitter/链接复制）
- [ ] 评论系统（giscus / utterances）
- [ ] 相关文章推荐（文章底部推荐同标签文章）

### P3
- [ ] 数据统计（Google Analytics / Umami）
- [ ] 邮件订阅（Newsletter）

## 技术优化 / 技术债

来源：2026-04-17 `/simplify` review 指出但当轮未处理的 finding。

### 字体
- **[P3] 迁移 Astro 5 `experimental.fonts` API**
  - 当前手写三件套：`import "...?url"` + `<link preload>` + `@font-face`，分散在 BaseLayout.astro 和 global.css
  - `experimental.fonts` 可在 `astro.config.mjs` 一处声明自动生成；先验证 API 稳定性再迁

### Tag slug
- **[P2] `tagToSlug` 泛化**
  - `packages/theme/src/utils/tag-slug.ts` 只处理 `/` → `-`，不覆盖大小写（"NodeJS" vs "nodejs" 会产生两个路由）、空格、URL 保留字符
  - 决策待拍板：严格约束 + 注释说明 / 引入 `@sindresorhus/slugify` / 自写 `.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, "-")`

### 构建期性能
- **[P2] `readingTime` 作为 content collection 派生字段**
  - `index.astro` 和 `page/[page].astro` 每次构建对每篇 body 重跑 `getReadingTime`，分页页 × 文章数量线性放大
  - 方案 A：remark plugin 预计算写入 frontmatter；方案 B：`utils/reading-time.ts` 内加 `WeakMap<Entry, string>` 缓存

### 样式一致性
- **[P3] Tag pill inline style 迁到 scoped `<style>`**
  - `ArticleLayout.astro:94-98`、`tags/index.astro:38` 的 `.tag-pill` 一半 class、一半 inline style 字符串；与本轮 PostCard 的做法不一致
- **[P3] 分页 prev/next chevron SVG 仍在两处重复**
  - `index.astro` 和 `page/[page].astro` 各有两份 15×15 chevron `<svg>` 字面量
  - 抽 `components/ui/PaginationArrow.astro`（props: direction/href/disabled），或用内联 `<symbol>` + `<use>`

### PWA
- **[P3] 字体缓存 max-age 365 天 + 文件 hash 复核**（✓ 验证：Vite 自动给 woff2 加 content hash，无需缩 maxAge）
- **[P3] 离线 navigateFallback 改专属提示页**
  - 现在 fallback 到 `/index.html`，离线访问未缓存页面会全部兜回首页，易被误解。做一个 `/offline.html` 明确提示
