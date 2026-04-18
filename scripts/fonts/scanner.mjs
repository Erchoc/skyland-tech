// scripts/fonts/scanner.mjs
import { readFileSync } from "node:fs";
import fg from "fast-glob";

const CJK_PUNCT =
  "\uff0c\u3002\uff01\uff1f\uff1b\uff1a\u201c\u201d\u2018\u2019\u300c\u300d\u300e\u300f\u3010\u3011\u300a\u300b\u3008\u3009\u2026\u2014\u00b7\u3001";

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
