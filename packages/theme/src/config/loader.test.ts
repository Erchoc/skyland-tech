import { describe, expect, it } from "vitest";
import { DEFAULTS } from "./defaults.ts";
import { mergeConfig } from "./loader.ts";

describe("mergeConfig", () => {
  it("空输入返回 DEFAULTS 深拷贝", () => {
    const merged = mergeConfig({});
    expect(merged).toEqual(DEFAULTS);
    expect(merged).not.toBe(DEFAULTS);
  });

  it("用户覆盖浅字段", () => {
    const merged = mergeConfig({ site: { title: "X", url: "https://x" } });
    expect(merged.site.title).toBe("X");
    expect(merged.site.lang).toBe("zh-CN");
  });

  it("数组字段整体替换（不合并）", () => {
    const merged = mergeConfig({ animation: { apply_to: ["hero"] } });
    expect(merged.animation.apply_to).toEqual(["hero"]);
  });

  it("嵌套对象 weights 合并", () => {
    const merged = mergeConfig({ search: { weights: { title: 20 } } });
    expect(merged.search.weights).toEqual({ title: 20, tags: 5, body: 1 });
  });
});
