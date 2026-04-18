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
