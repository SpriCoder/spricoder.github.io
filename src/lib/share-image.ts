const seriesImages: Record<string, { file: string; alt: string }> = {
  '与 AI 一起工作': { file: 'ai-work', alt: '《与 AI 一起工作》专题分享封面：工具、协作与评测' },
  '玩转时序数据集': { file: 'tsfile', alt: '《玩转时序数据集》专题分享封面：数据、访问与实践' },
  '基准测试方法与实践': { file: 'benchmarking', alt: '《基准测试方法与实践》专题分享封面：工作负载、测量与分析' },
};

export function shareImageFor(series?: string) {
  const image = (series && seriesImages[series]) || {
    file: 'blog',
    alt: 'SpriCoder 博客分享封面：数据库、时序数据、人工智能与软件工程',
  };
  return { path: `/images/share/${image.file}.png`, width: 1200, height: 630, alt: image.alt };
}
