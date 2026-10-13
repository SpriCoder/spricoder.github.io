import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import mathjax from 'markdown-it-mathjax3';
import footnote from 'markdown-it-footnote';

const root = process.cwd();
const baseline = JSON.parse(fs.readFileSync('migration/baseline.json', 'utf8'));
const byId = new Map(baseline.map(post => [post.id, post]));
const bySlug = new Map(baseline.filter(post => post.published).map(post => [post.slug, post.url]));
const md = new MarkdownIt({ html: true, linkify: true, typographer: false }).use(mathjax).use(footnote);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const escape = md.utils.escapeHtml;
const originalFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, index, options, env, self) => {
  if (tokens[index].info.trim() === 'mermaid') return `<pre class="mermaid">${escape(tokens[index].content)}</pre>`;
  return originalFence(tokens, index, options, env, self);
};

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : entry.name.endsWith('.md') ? [file] : [];
  });
}

function list(value, fallback = []) {
  if (value == null) return fallback;
  return (Array.isArray(value) ? value.flat(Infinity) : [value]).map(String);
}

function dateString(value) {
  if (!value || Number.isNaN(new Date(value).valueOf())) throw new Error('New posts require a valid date or pubDate.');
  return new Date(value).toISOString();
}

function text(html) {
  return md.utils.unescapeAll(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function headings(html) {
  const result = [];
  for (const match of html.matchAll(/<h([23])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)) {
    result.push({ level: Number(match[1]), id: md.utils.unescapeAll(match[2]), text: text(match[3]) });
  }
  return result;
}

function renderMarkdown(content) {
  content = content.replace(/\{%\s*post_link\s+(\S+)(?:\s+([\s\S]*?))?\s*%\}/g, (_, slug, label) => {
    const url = bySlug.get(slug);
    if (!url) throw new Error(`Unknown legacy post_link: ${slug}`);
    return `[${label || slug}](${encodeURI(url)})`;
  });
  let html = md.render(content);
  const used = new Set();
  html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, level, content) => {
    const base = text(content).replace(/\s+/g, '-').replace(/[<>"'?#]/g, '') || 'section';
    let id = base; let suffix = 1;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return `<h${level} id="${escape(id)}">${content}</h${level}>`;
  });
  return html;
}

const posts = [];
for (const file of walk('content/posts')) {
  const id = path.relative('content/posts', file).split(path.sep).join('/');
  const raw = fs.readFileSync(file, 'utf8');
  const original = byId.get(id);
  const { data, content } = matter(raw);
  if (data.draft === true || data.published === false) continue;
  const hash = sha(raw);
  const preserved = original?.published && original.markdown_sha256 === hash;
  const title = String(data.title || original?.title || '');
  if (!title) throw new Error(`Missing title: ${id}`);
  const date = data.pubDate ? dateString(data.pubDate) : original?.date || dateString(data.date);
  const url = original?.url || '/' + String(data.permalink || data.slug || id.replace(/\.md$/, '')).replace(/^\/+|\/+$/g, '') + '/';
  const html = preserved ? fs.readFileSync(original.snapshot, 'utf8') : renderMarkdown(content);
  const plain = text(html);
  const fallbackDescription = (plain.startsWith(title) ? plain.slice(title.length) : plain).trim().slice(0, 170);
  let series = data.series || original?.series;
  if (!series && id.startsWith('ai-work/')) series = '与 AI 一起工作';
  if (!series && id.startsWith('benchmarking/')) series = '基准测试方法与实践';
  const inferredOrder = [path.basename(id), title].map(value => value.match(/(?:^|[｜|])\s*(\d+)[.、_-]/)?.[1]).find(Boolean);
  const order = Number(data.series_order ?? original?.series_order ?? inferredOrder);
  posts.push({
    id, title, url, date,
    updated: data.updated ? dateString(data.updated) : original?.updated || date,
    description: text(String(data.description || original?.description || fallbackDescription)),
    tags: list(data.tags, original?.tags),
    categories: list(data.categories, original?.categories),
    ...(series ? { series: String(series) } : {}),
    ...(Number.isFinite(order) ? { series_order: Number(order) } : {}),
    readingMinutes: original?.readingMinutes || Math.max(1, Math.ceil(plain.length / 350)),
    html, source: `content/posts/${id}`, markdown_sha256: hash,
    counterPath: original?.legacyUrls?.[0] || url,
    renderMode: preserved ? 'preserved' : 'markdown', headings: headings(html),
  });
}

const seen = new Set();
for (const post of posts) {
  if (seen.has(post.url)) throw new Error(`Duplicate article URL: ${post.url}`);
  seen.add(post.url);
}
posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'));
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/posts.json', JSON.stringify(posts));
const aboutBaseline = JSON.parse(fs.readFileSync('migration/about.json', 'utf8'));
const aboutRaw = fs.readFileSync('content/about/index.md', 'utf8');
const aboutHtml = sha(aboutRaw) === aboutBaseline.markdown_sha256 ? fs.readFileSync('content/legacy/about.html', 'utf8') : renderMarkdown(matter(aboutRaw).content);
fs.writeFileSync('src/data/about.json', JSON.stringify({ html: aboutHtml }));

// Copy dependencies for self-hosted math styling and the static search interface.
fs.mkdirSync('public/vendor/katex', { recursive: true });
for (const entry of ['katex.min.css', 'fonts']) fs.cpSync(`node_modules/katex/dist/${entry}`, `public/vendor/katex/${entry}`, { recursive: true });
fs.writeFileSync('public/.nojekyll', '');
const analytics = JSON.parse(fs.readFileSync('src/data/analytics.json', 'utf8'));
const analyticsTemplate = fs.readFileSync('scripts/analytics-template.js', 'utf8');
fs.mkdirSync('public/js', { recursive: true });
fs.writeFileSync('public/js/analytics.js', analyticsTemplate.replace('ANALYTICS_CONFIG', JSON.stringify(analytics)));
console.log(`Content ready: ${posts.length} articles; ${posts.filter(post => post.renderMode === 'preserved').length} preserved publication snapshots; drafts excluded.`);
