import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// scripts/fonts/scanner.test.mjs
import { describe, expect, it } from "vitest";
import { extractChars, extractFromFiles } from "./scanner.mjs";

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
