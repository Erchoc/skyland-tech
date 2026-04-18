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
