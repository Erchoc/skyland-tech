import { createHash } from "node:crypto";
// scripts/build-fonts.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import fg from "fast-glob";
import { parse as parseTOML } from "smol-toml";
import subsetFont from "subset-font";
import { CJK_PUNCT, extractFromFiles } from "./fonts/scanner.mjs";
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

// 基于内容的 hash——不用 mtime，因为 git checkout 会把 mtime 改成当下时刻，
// 导致假阳性漂移。构建期额外读一遍文件的开销对 ~30 个源文件可忽略。
function hashFiles(globs) {
  const files = fg.sync(globs, { cwd: ROOT });
  const h = createHash("sha256");
  for (const f of files.sort()) {
    h.update(f).update(readFileSync(resolve(ROOT, f)));
  }
  return h.digest("hex").slice(0, 16);
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`✗ 源字体不存在: ${SOURCE}`);
    console.error("  从 https://github.com/lxgw/LxgwWenKai-Lite 下载 WebFont 版");
    process.exit(1);
  }

  const cfg = parseTOML(readFileSync(CONFIG, "utf8"));
  const fonts = cfg.fonts ?? {};
  const strategy = fonts.subset_strategy ?? "hybrid";
  const scanGlobs = fonts.scan_globs ?? [];

  const scanned = strategy === "baseline" ? new Set() : extractFromFiles(scanGlobs, ROOT);
  const baselineText =
    fonts.baseline_charset === "cjk-3500" && existsSync(BASELINE)
      ? readFileSync(BASELINE, "utf8")
      : "";
  const baseline = new Set(baselineText);

  const final = buildCharset(strategy, scanned, baseline);
  const text = [...final].join("");

  const charsetHash = createHash("sha256").update(text).digest("hex").slice(0, 16);
  const scanHash = hashFiles(scanGlobs);

  // subset-font 不是字节确定的——charset 没变时，重新产物只会在无意义的元数据上漂移。
  // 此处若 charsetHash 与旧产物一致则跳过 subsetFont 与 TARGET 写入，仅在 scanHash 漂移时
  // 刷新 .meta.json 以满足 check-fonts.mjs 的 prebuild 校验。
  if (existsSync(TARGET) && existsSync(META)) {
    const oldMeta = JSON.parse(readFileSync(META, "utf8"));
    if (oldMeta.charsetHash === charsetHash) {
      if (oldMeta.scanHash !== scanHash) {
        writeFileSync(META, `${JSON.stringify({ ...oldMeta, scanHash }, null, 2)}\n`);
        console.log("✓ charset 未变，仅刷新 .meta.json 的 scanHash");
      } else {
        console.log("✓ charset 与 scan 源均未变，跳过");
      }
      return;
    }
  }

  const source = readFileSync(SOURCE);
  console.log(
    `→ subset-font: ${final.size} chars, source ${(source.length / 1024 / 1024).toFixed(2)} MB`,
  );
  const subset = await subsetFont(source, text, { targetFormat: "woff2" });

  writeFileSync(TARGET, subset);
  const meta = {
    chars: final.size,
    bytes: subset.length,
    scannedChars: scanned.size,
    baselineChars: baseline.size,
    scanHash,
    charsetHash,
    unicodeRange: toUnicodeRange(final),
    strategy,
    builtAt: new Date().toISOString(),
  };
  writeFileSync(META, `${JSON.stringify(meta, null, 2)}\n`);

  if (subset.length >= source.length) {
    console.error(`✗ 产物 (${subset.length}) 比源 (${source.length}) 大，配置可能有误`);
    process.exit(1);
  }
  console.log(
    `✓ 产物: ${(subset.length / 1024).toFixed(0)} KB (${((subset.length / source.length) * 100).toFixed(1)}%)`,
  );
  console.log(`✓ meta: ${META}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
