import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  console.error("✗ 源文件已变化但未重建字体子集。");
  console.error(`  记录: ${meta.scanHash}  当前: ${currentHash}`);
  console.error("  请运行: pnpm fonts:build && git add -A && git commit");
  process.exit(1);
}
console.log(`✓ 字体子集一致 (${meta.chars} chars, ${Math.round(meta.bytes / 1024)} KB)`);
