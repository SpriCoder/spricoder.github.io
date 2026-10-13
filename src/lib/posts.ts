import { getCollection } from 'astro:content';
import legacyRoutes from '../../migration/legacy-routes.json';

export async function allPosts() {
  const entries = await getCollection('posts');
  return entries.map(entry => ({ id: entry.id, ...entry.data })).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'));
}

export function dateLabel(date: string) {
  return new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
}

export const seriesSlugs: Record<string, string> = {
  '与 AI 一起工作': 'ai-work',
  '玩转时序数据集': 'tsfile',
  '基准测试方法与实践': 'benchmarking',
};

export function seriesSlug(name: string) { return seriesSlugs[name] || encodeURIComponent(name); }

export function taxonomyUrl(kind: 'tags' | 'categories', name: string) {
  const prefix = kind === 'tags' ? '标签' : '分类';
  const known = legacyRoutes.find(route => route.kind === kind && route.title === `${prefix} - ${name}`);
  return known?.url || `/${kind}/${name.replace(/[?#]/g, '-')}/`;
}
