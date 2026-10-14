import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = fileURLToPath(new URL('../public/images/share/', import.meta.url));
const cards = [
  { file: 'blog', label: 'SPRICODER · BLOG', lines: ['学习 · 研究 · 实践'], subtitle: '数据库 · 时序数据 · 人工智能 · 软件工程', accent: '#275ecc', mark: 'code' },
  { file: 'ai-work', label: 'SPRICODER · AI', lines: ['与 AI', '一起工作'], subtitle: '工具 · 协作 · 评测', accent: '#275ecc', mark: 'nodes' },
  { file: 'tsfile', label: 'SPRICODER · DATA', lines: ['玩转', '时序数据集'], subtitle: '数据 · 访问 · 实践', accent: '#087c86', mark: 'data' },
  { file: 'benchmarking', label: 'SPRICODER · BENCHMARK', lines: ['基准测试', '方法与实践'], subtitle: '工作负载 · 测量 · 分析', accent: '#7951b3', mark: 'chart' },
];

function illustration(mark, accent) {
  const start = `<g fill="none" stroke="${accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">`;
  const end = '</g>';
  if (mark === 'nodes') return `${start}<path d="M920 217 832 320 968 421 1053 276 920 217M832 320 1053 276M920 217 968 421" opacity=".3"/><circle cx="920" cy="217" r="26" fill="#fff"/><circle cx="832" cy="320" r="26" fill="#fff"/><circle cx="968" cy="421" r="26" fill="#fff"/><circle cx="1053" cy="276" r="26" fill="#fff"/>${end}`;
  if (mark === 'data') return `${start}<ellipse cx="944" cy="225" rx="100" ry="32"/><path d="M844 225v64c0 18 45 32 100 32s100-14 100-32v-64M844 289v64c0 18 45 32 100 32s100-14 100-32v-64M844 353v64c0 18 45 32 100 32s100-14 100-32v-64"/>${end}`;
  if (mark === 'chart') return `${start}<path d="M835 226v195h222" opacity=".35"/><path d="M869 369v-55M937 369V269M1005 369V213" stroke-width="28"/><path d="m859 270 63-54 69-12 56-47" stroke-width="5"/>${end}`;
  return `${start}<path d="m891 243-66 77 66 77M1002 243l66 77-66 77M974 225l-51 190"/>${end}`;
}

await fs.mkdir(output, { recursive: true });
for (const card of cards) {
  const titleY = card.lines.length === 1 ? 316 : 279;
  const titles = card.lines.map((line, index) => `<text x="82" y="${titleY + index * 94}" font-size="${card.file === 'blog' ? 65 : 76}" font-weight="650">${line}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fbff"/><stop offset="1" stop-color="#e9eff8"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#background)"/>
    <circle cx="951" cy="319" r="216" fill="#fff" opacity=".65"/>
    <rect x="82" y="103" width="46" height="6" rx="3" fill="${card.accent}"/>
    <g font-family="PingFang SC, Noto Sans CJK SC, sans-serif" fill="#12213a">
      <text x="82" y="157" font-size="24" letter-spacing="3" fill="${card.accent}">${card.label}</text>
      ${titles}
      <text x="82" y="449" font-size="26" fill="#4f617b">${card.subtitle}</text>
      <text x="82" y="548" font-size="22" fill="#62718a">spricoder.github.io</text>
    </g>
    ${illustration(card.mark, card.accent)}
    <path d="M82 490h1036" stroke="#cfd9e8" stroke-width="1"/>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(output, `${card.file}.png`));
  console.log(`Created /images/share/${card.file}.png (1200 × 630)`);
}
