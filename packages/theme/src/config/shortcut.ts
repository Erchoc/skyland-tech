export interface ShortcutBinding {
  mod: boolean;
  key: string;
}

export function parseShortcut(input: string | string[]): ShortcutBinding[] {
  const arr = Array.isArray(input) ? input : [input];
  return arr.map((s) => {
    if (s === "slash") return { mod: false, key: "/" };
    const parts = s.toLowerCase().split("+").map((p) => p.trim());
    const mod =
      parts.includes("mod") ||
      parts.includes("ctrl") ||
      parts.includes("cmd");
    const key = parts[parts.length - 1];
    return { mod, key };
  });
}

export function matchShortcut(
  e: KeyboardEvent,
  bindings: ShortcutBinding[]
): boolean {
  const mod = e.metaKey || e.ctrlKey;
  return bindings.some((b) => b.mod === mod && e.key.toLowerCase() === b.key);
}
