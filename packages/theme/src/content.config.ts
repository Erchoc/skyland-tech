import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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
      category: z.enum([
        "架构设计",
        "工程实践",
        "性能优化",
        "基础设施",
        "平台演进",
        "技术选型",
        "AI",
      ]),
      series: z.string().optional(),
      seriesOrder: z.number().optional(),
      draft: z.boolean().default(false),
      description: z.string(),
    }),
});

export const collections = { posts };
