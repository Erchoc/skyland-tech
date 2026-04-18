import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import consola from "consola";
import { parse } from "smol-toml";

export interface SiteConfig {
  site: {
    title: string;
    description: string;
    author: string;
    url: string;
    lang: string;
  };
  theme: {
    color: string;
    dark: boolean;
    layout: "magazine" | "grid" | "minimal";
  };
  social: Record<string, string>;
  categories: { list: string[] };
  features: {
    pwa: boolean;
    slides: boolean;
    search: boolean;
    rss: boolean;
  };
}

export function loadConfig(cwd: string): SiteConfig {
  const configPath = resolve(cwd, "config.toml");
  if (!existsSync(configPath)) {
    consola.error(`config.toml not found in ${cwd}`);
    process.exit(1);
  }
  const raw = readFileSync(configPath, "utf-8");
  return parse(raw) as unknown as SiteConfig;
}
