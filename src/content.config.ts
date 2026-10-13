import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: file('src/data/posts.json'),
  schema: z.object({
    title: z.string(),
    url: z.string(),
    date: z.string(),
    updated: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    categories: z.array(z.string()),
    series: z.string().optional(),
    series_order: z.number().optional(),
    readingMinutes: z.number(),
    html: z.string(),
    source: z.string(),
    markdown_sha256: z.string(),
    counterPath: z.string(),
    renderMode: z.enum(['preserved', 'markdown']),
    headings: z.array(z.object({ id: z.string(), text: z.string(), level: z.number() })),
  }),
});

export const collections = { posts };
