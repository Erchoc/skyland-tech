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
