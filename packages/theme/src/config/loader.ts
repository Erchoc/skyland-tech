// packages/theme/src/config/loader.ts
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseTOML } from "smol-toml";
import type { ThemeConfig } from "./schema.ts";
import { DEFAULTS } from "./defaults.ts";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function mergeConfig(user: DeepPartial<ThemeConfig>): ThemeConfig {
  return merge(structuredClone(DEFAULTS), user) as ThemeConfig;
}

function merge<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(over)) return over as unknown as T;
  if (typeof over !== "object") return over as T;
  const out = { ...(base as object) } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    const baseVal = (base as Record<string, unknown>)[k];
    out[k] = baseVal && typeof baseVal === "object" && !Array.isArray(baseVal)
      ? merge(baseVal, v)
      : v;
  }
  return out as T;
}

export function loadThemeConfig(root: string = process.cwd()): ThemeConfig {
  const candidates = [
    resolve(root, "config.toml"),
    resolve(root, "playground/config.toml"),
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`config.toml not found. Searched: ${candidates.join(", ")}`);
  const raw = parseTOML(readFileSync(found, "utf8")) as DeepPartial<ThemeConfig>;
  return mergeConfig(raw);
}
