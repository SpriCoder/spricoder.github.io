import { allPosts } from '../lib/posts';
export async function GET() {
  const posts = (await allPosts()).slice(0, 30);
  const escape = (value: string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const entries = posts.map(post=>`<entry><title>${escape(post.title)}</title><id>https://spricoder.github.io${escape(post.url)}</id><link href="https://spricoder.github.io${escape(post.url)}"/><published>${post.date}</published><updated>${post.updated}</updated><summary>${escape(post.description)}</summary></entry>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>SpriCoder</title><id>https://spricoder.github.io/</id><link href="https://spricoder.github.io/"/><link href="https://spricoder.github.io/atom.xml" rel="self"/><updated>${posts[0].updated}</updated><author><name>SpriCoder</name></author>${entries}</feed>`, {headers:{'Content-Type':'application/atom+xml; charset=utf-8'}});
}
