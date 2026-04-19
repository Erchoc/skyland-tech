import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { loadThemeConfig } from "./config/loader.ts";

const configuredCategories = loadThemeConfig().categories.list;
if (configuredCategories.length === 0) {
  throw new Error("[content.config] config.toml 的 [categories].list 必须至少有一个类目");
}
const categoryEnum = z.enum(configuredCategories as [string, ...string[]]);

const posts = defineCollection({
  loader: glob({ pattern: "*/index.mdx", base: "./posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string(),
      cover: image().optional(),
      tags: z.array(z.string()).default([]),
      category: categoryEnum,
      series: z.string().optional(),
      seriesOrder: z.number().optional(),
      draft: z.boolean().default(false),
      description: z.string(),
    }),
});

export const collections = { posts };
