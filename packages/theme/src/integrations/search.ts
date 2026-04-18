// packages/theme/src/integrations/search.ts
import type { ThemeConfig } from "../config/schema.ts";

export function isSearchEnabled(config: ThemeConfig): boolean {
  return config.features.search && config.search.engine === "pagefind";
}
