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
