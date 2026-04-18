import { describe, expect, it } from "vitest";
import { matchShortcut, parseShortcut } from "./shortcut";

describe("parseShortcut", () => {
  it("mod+k → metaOrCtrl + k", () => {
    expect(parseShortcut("mod+k")).toEqual([{ mod: true, key: "k" }]);
  });

  it("slash → /", () => {
    expect(parseShortcut("slash")).toEqual([{ mod: false, key: "/" }]);
  });

  it("数组多绑定", () => {
    expect(parseShortcut(["mod+k", "slash"])).toEqual([
      { mod: true, key: "k" },
      { mod: false, key: "/" },
    ]);
  });
});

describe("matchShortcut", () => {
  it("mod+k 事件匹配", () => {
    const e = {
      metaKey: true,
      ctrlKey: false,
      key: "k",
      altKey: false,
    } as KeyboardEvent;
    expect(matchShortcut(e, parseShortcut("mod+k"))).toBe(true);
  });

  it("slash 无 mod", () => {
    const e = {
      metaKey: false,
      ctrlKey: false,
      key: "/",
      altKey: false,
    } as KeyboardEvent;
    expect(matchShortcut(e, parseShortcut("slash"))).toBe(true);
  });

  it("不带 mod 的 k 不匹配 mod+k", () => {
    const e = {
      metaKey: false,
      ctrlKey: false,
      key: "k",
      altKey: false,
    } as KeyboardEvent;
    expect(matchShortcut(e, parseShortcut("mod+k"))).toBe(false);
  });
});
