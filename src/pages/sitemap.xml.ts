import { allPosts } from '../lib/posts';
export async function GET() {
  const posts = await allPosts();
  const urls = ['/', '/series/', '/archives/', '/about/', ...posts.map(post=>post.url)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>https://spricoder.github.io${encodeURI(url).replaceAll('&','&amp;')}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
