# SpriCoder Astro 博客

网站地址：https://spricoder.github.io/

这里是正在使用的 Astro 静态博客源码。原 `../SpriCoder-Blog/` 完整保留为 Hexo 备份；不要在那个目录构建或编辑新站。

## 写作与预览

- 已发布 Markdown：`content/posts/`，保留原有目录与文件名。
- 原草稿：`content/drafts/`，仅保留在本地，已排除 Git 和网站发布。
- 关于页原稿：`content/about/index.md`。
- 图片：放入 `public/images/`，文章中使用 `/images/文件名`。

新文章至少填写 `title`、`date`（或 `pubDate`）、`description`。推荐填写 `tags`、`categories`；系列文章填写 `series`、`series_order`。新文章可以用 `permalink` 固定网址。

首页精选与技术系列的推荐起点、阅读路线位于 `src/data/series.ts`，用文章稳定文件标识关联。搜索支持按内容类型、技术专题与课程筛选。

课程材料填写 `course`（课程目录中的稳定 slug）、`course_group` 和该分组内的 `course_order`。课程名称、学习年份、讲义／实践／复习等身份由专题管理；标签使用 1–5 个领域或具体知识点，不把章节标题、年份、考试、作业作为标签。课程目录与分组定义位于 `src/data/courses.json`，初次标签整理的规范与核对清单位于 `taxonomy/`。

```yaml
---
title: 文章标题
date: 2026-10-13
description: 一两句介绍文章的问题与内容。
tags: [数据库]
series: 系列名称
series_order: 1
permalink: articles/example/
---
```

```sh
npm ci
npm run dev
npm run build
npm run preview
```

## 存量文章保真

首次迁移完整保留 465 篇发布文章、6 篇本地草稿及原文章地址。存量文章正文未修改时，构建使用 `content/legacy/` 的已发布正文快照；调整标签或课程等 Frontmatter 不会改变历史正文排版。修改正文后，自动使用新 Markdown 渲染器。新渲染器支持原 `post_link`、数学公式、脚注和 Mermaid。

`migration/baseline.json` 保存每篇原文校验值、地址、日期与旧快照信息；它使旧网址不随标题变化。原时间沿用基线，若需有意调整发布日期，可填写 `pubDate`。更新日期可填写 `updated`。已迁移页面保留代码、表格、公式和图片；一个旧 Bootstrap 教程的未闭合 HTML 已修复，正文文字未变。

文章页显示发布日期，以及晚于发布日期的已有更新日期。课程笔记另显示课程目录中记录的学习年份。可选字段 `applicable_versions`（适用版本）、`verified_environment`（验证环境）均为文字，`reviewed` 为作者实际复核内容的日期；这些字段只在填写后展示，不从构建时间推断。`updated` 只表示内容更新，不等于重新验证。

`image` 可填写代表文章内容的图片路径（如 `/images/example.png`），用于文章结构化数据。默认及三个技术专题的分享封面保存在 `public/images/share/`；统一分享封面不会作为文章插图写入结构化数据。

关于页采用相同机制：直接编辑 `content/about/index.md`，修改后自动渲染。

搜索由 Pagefind 在构建后为全部发布文章生成分片全文索引。`migration/inherited-broken-references.json` 记录旧站已有的 31 项失效内链或图片；本次迁移未增加这些问题，也未重写原文。

历史链接修复记录在 `content/reference-repairs.json`，按文章、标签、属性和原链接精确匹配，只在渲染时更新链接目标，原文与旧快照保持不变。未找到原始目标的资源单独列入待补记录。检查范围与修复依据见 [内容检查说明](docs/CONTENT_CHECKS.md)。

## 统计与建站时间

继续使用原 LeanCloud 应用及总 PV／UV 记录，并保留原访客去重口径。统计配置是旧站已经使用的前端客户端配置；不要放入管理员密钥。

仅正式域名 `spricoder.github.io` 会新增计数。本地及其他预览域名仅查询；线上检查时使用 `?preview=1`，也不会累计测试访问。原建站脚本 `public/js/duration.js` 按字节保留，起始时间仍为 2019-09-01 12:00:00。

## 发布与回退

源码分支为 `astro-source`，旧 Hexo 发布基线为 `393b59514e93fcf7681f82616e864617035f3b46`。发布及回退说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

本地迁移核验：`npm run verify`（需 Python 3 和 lxml）。校验全部文章正文、旧路径、本地图片、草稿隔离及 Hexo 备份完整性。标签与课程整理另用 `npm run verify:taxonomy` 核验正文、日期和地址保持一致，课程归属与分组无遗漏。

日常发布检查：`npm run verify:site`（只需 Python 3 标准库），检查已构建页面的内链、图片、文章信息、网址、系列顺序及草稿隔离，不要求本地 Hexo 备份。`npm run build` 在生成搜索索引和旧网址兼容页面后自动执行该检查；GitHub Pages 工作流使用同一构建入口，有新增错误时停止发布。
