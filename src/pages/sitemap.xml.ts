import type { APIRoute } from 'astro';
import { allPosts, seriesSlug } from '../lib/posts';
import courses from '../data/courses.json';

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const posts = await allPosts();
  const series = [...new Set(posts.map(post => post.series).filter(Boolean))] as string[];
  const pages = [
    '/', '/series/', '/courses/', '/archives/', '/about/', '/links/',
    ...series.map(name => `/series/${seriesSlug(name)}/`),
    ...courses.map(course => `/courses/${course.slug}/`),
  ];
  const urls = new Map(pages.map(url => [url, undefined as string | undefined]));
  for (const post of posts) urls.set(post.url, post.updated || post.date);
  const entries = [...urls].map(([url, lastmod]) => `<url><loc>${escapeXml(new URL(url, site ?? 'https://spricoder.github.io/').href)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
