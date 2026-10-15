# 博客结构说明

## 当前职责

`SpriCoder-Astro/` 是博客的唯一发布仓库。Astro 构建脚本从 `content/posts/` 读取 Markdown，生成文章集合、系列页、标签页、搜索索引和旧网址兼容页。

| 路径 | 职责 | 是否进入公开构建 |
| --- | --- | --- |
| `content/posts/` | 已发布文章与系列目录 | 是 |
| `content/drafts/` | 本地未发布草稿 | 否 |
| `content/about/` | 关于页源稿 | 是 |
| `content/legacy/` | 旧站正文快照 | 仅作为保真渲染源 |
| `public/images/` | 文章图片和站点静态资源 | 是 |
| `docs/` | 计划、同步、发表检查、部署和历史维护材料 | 否 |
| `taxonomy/` | 标签与课程归属清单 | 构建核验使用 |
| `migration/` | 旧 URL、基线和迁移证据 | 构建核验使用 |

## 主题组织

- `content/posts/ai-work/`：与 AI 一起工作系列。
- `content/posts/benchmarking/`：基准测试方法、IoT Benchmark 和玩转时序数据集系列。
- 课程笔记按课程目录保留在各自目录，并通过 `course`、`course_group` 和 `course_order` 归属课程专题。

文章的稳定接口是 Frontmatter 中的 `permalink`；文件路径用于内容组织和系列索引，移动文章时必须保留 permalink、更新系列入口，并回读内链和图片路径。

## 非公开材料

系列计划放在 `docs/benchmarking/`，TsFile 的飞书映射与发表检查放在 `docs/benchmarking/tsfile-dataset/`，早期合并稿放在 `docs/archive/benchmarking/`。这些材料不应放进 `content/posts/`，否则会被内容同步脚本当成公开文章。

旧 Hexo 站点 `../SpriCoder-Blog/`、课程笔记 `../SpriCoder-Notes/` 和个人主页 `../SpriCoder/` 保持独立，不作为 Astro 的输入源。迁移前根目录的 `ai-work/`、`benchmarking/` 副本已移至根目录 `.archive/2026-10-15-root-topic-mirrors/`，仅供恢复和差异追查。

## 验收顺序

1. 检查文章 Frontmatter、系列入口和稳定 permalink。
2. 检查 Markdown 内链、图片路径和维护文档中的源路径。
3. 运行 `npm run build`，确认文章集合、系列页、搜索索引和旧 URL 兼容页生成。
4. 运行 `npm run verify:site`，确认已构建页面的链接、图片、文章信息和草稿隔离。
5. 标签或课程整理另行运行 `npm run verify:taxonomy`；正文有意修改时，旧快照保护差异需要单独记录。
