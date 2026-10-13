# SpriCoder Astro 博客

网站地址：https://spricoder.github.io/

这里是正在使用的 Astro 静态博客源码。原 `../SpriCoder-Blog/` 完整保留为 Hexo 备份；不要在那个目录构建或编辑新站。

## 写作与预览

- 已发布 Markdown：`content/posts/`，保留原有目录与文件名。
- 原草稿：`content/drafts/`，仅保留在本地，已排除 Git 和网站发布。
- 关于页原稿：`content/about/index.md`。
- 图片：放入 `public/images/`，文章中使用 `/images/文件名`。

新文章至少填写 `title`、`date`（或 `pubDate`）、`description`。推荐填写 `tags`、`categories`；系列文章填写 `series`、`series_order`。新文章可以用 `permalink` 固定网址。

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

首次迁移完整保留 465 篇发布文章、6 篇本地草稿及原文章地址。存量文章未修改时，构建使用 `content/legacy/` 的已发布正文快照；修改 Markdown 后，自动使用新 Markdown 渲染器。新渲染器支持原 `post_link`、数学公式、脚注和 Mermaid。

`migration/baseline.json` 保存每篇原文校验值、地址、日期与旧快照信息；它使旧网址不随标题变化。原时间沿用基线，若需有意调整发布日期，可填写 `pubDate`。更新日期可填写 `updated`。已迁移页面保留代码、表格、公式和图片；一个旧 Bootstrap 教程的未闭合 HTML 已修复，正文文字未变。

关于页采用相同机制：直接编辑 `content/about/index.md`，修改后自动渲染。

搜索由 Pagefind 在构建后为全部发布文章生成分片全文索引。`migration/inherited-broken-references.json` 记录旧站已有的 31 项失效内链或图片；本次迁移未增加这些问题，也未重写原文。

## 统计与建站时间

继续使用原 LeanCloud 应用及总 PV／UV 记录，并保留原访客去重口径。统计配置是旧站已经使用的前端客户端配置；不要放入管理员密钥。

仅正式域名 `spricoder.github.io` 会新增计数。本地及其他预览域名仅查询；线上检查时使用 `?preview=1`，也不会累计测试访问。原建站脚本 `public/js/duration.js` 按字节保留，起始时间仍为 2019-09-01 12:00:00。

## 发布与回退

源码分支为 `astro-source`，旧 Hexo 发布基线为 `393b59514e93fcf7681f82616e864617035f3b46`。发布及回退说明见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

本地迁移核验：`npm run verify`（需 Python 3 和 lxml）。校验原稿、全部文章正文、旧路径、本地图片、草稿隔离及 Hexo 备份完整性。
