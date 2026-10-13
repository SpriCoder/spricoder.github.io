# Astro 部署与 Hexo 回退

新博客源码保存在 `astro-source`，由 `.github/workflows/pages.yml` 构建并发布。原 `master` 保存 Hexo 的已发布产物，不用 Astro 产物覆盖它。本地旧方案保存在 `/Users/zhanghongyin/code/blog/SpriCoder-Blog/`，包括正文、配置、主题与部署目录。

## 迁移前基线

以下是 2026-10-13 的只读核验结果，切换状态以发布后的交付记录为准。

| 项目 | 原状态 |
| --- | --- |
| GitHub 仓库 | `SpriCoder/spricoder.github.io`，公开仓库 |
| 默认分支 | `master` |
| Hexo 分支 SHA | `393b59514e93fcf7681f82616e864617035f3b46` |
| Pages 发布方式 | `legacy`，`master` 的 `/` 根目录 |
| 网站 | `https://spricoder.github.io/` |
| HTTPS | 强制启用 |
| 自定义域名 | 无 |
| Actions | 已启用，允许全部 Actions |
| 分支保护与规则集 | `master` 无保护，仓库无规则集 |
| `github-pages` 环境 | 无审批规则，无部署分支限制 |

## 正式发布

1. 使用 Node.js 24 安装锁定的依赖、构建静态站并完成文章、旧网址、图片与统计配置核验。保留 `package-lock.json`；输出使用默认 `dist/`。
2. 核对远端 `master` 仍为上表中的 SHA。创建独立 `astro-source`，提交 Astro 源码与正文，不修改 `master`，不提交本地凭据和 `node_modules/`。
3. 把 Pages 的发布方式改成 GitHub Actions，然后推送 `astro-source`，由其 `push` 事件触发工作流。此设置可以在仓库 Settings → Pages → Source 中修改，也可以使用下方命令。
4. 等待 build 与 deploy 两个作业成功，并核对 workflow 的 `headSha` 与本地提交一致。回读首页、旧文章地址、资源与页脚；仅推送成功不能视为发布成功。
5. 如需 GitHub 网页上的手动运行入口，把默认分支改成 `astro-source`。此操作只改变默认分支设置，不改变 `master` 的提交；若默认分支仍为 `master` 且其中没有工作流，网页可能没有 Run workflow 按钮。日常推送到 `astro-source` 不依赖默认分支变更。

```sh
gh api --method PUT repos/SpriCoder/spricoder.github.io/pages --input - <<'JSON'
{
  "build_type": "workflow",
  "https_enforced": true
}
JSON
```

工作流使用 GitHub 自动签发的令牌与 OIDC，显式权限为 `contents: read`、`pages: write` 和 `id-token: write`。不需要向仓库提交个人令牌。人工修改 Pages 设置需要管理 Pages 的权限；通过经典 OAuth/PAT 身份推送新工作流时，还需核验 `workflow` 范围。仓库管理员角色不等于令牌已拥有该范围。

三个直接调用的 Actions 已在 GitHub API 中验证，并固定到提交 SHA：

| Action | 版本 | 固定 SHA |
| --- | --- | --- |
| `actions/checkout` | v7 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `withastro/action` | v6 | `3eafd002e65cc31b4f0eae0bb05450d521562247` |
| `actions/deploy-pages` | v5 | `368f82528645a54fb793d4d04e342629a3f51346` |

站点配置使用 `site: 'https://spricoder.github.io'` 和静态输出，用户名站不添加仓库名 `base`。GitHub Pages 不执行服务端渲染或后台接口。

## 访问统计与建站时间

正式域名继续沿用旧站统计应用、计数记录、路径与建站时间。文章网址保持原路径，避免给历史阅读量创建新的记录。统计脚本只在正式域名启用写入；本地开发、预览域名和页面构建不得增加正式累计次数。

上线前应核对旧站服务的实际读写方式，上线后应检查历史累计值和新增计数。不得把脚本存在等同于后台数值已核验，也不得在迁移中清空统计数据或重设建站日期。

## 回退到保留的 Hexo 版本

回退只改变发布设置，不需要重置、强推或删除 Astro 源码。先在 Actions 页面停止尚未完成的 Astro 发布，避免回退期间继续部署。然后确认旧分支没有变化：

```sh
gh api repos/SpriCoder/spricoder.github.io/git/ref/heads/master --jq '.object.sha'
```

结果必须为 `393b59514e93fcf7681f82616e864617035f3b46`。如果不同，先查明变化，不执行下方回退步骤。

若迁移时已更改默认分支，先把默认分支恢复为 `master`：

```sh
gh api --method PATCH repos/SpriCoder/spricoder.github.io -f default_branch=master
```

恢复原 Pages 发布方式：

```sh
gh api --method PUT repos/SpriCoder/spricoder.github.io/pages --input - <<'JSON'
{
  "build_type": "legacy",
  "source": {
    "branch": "master",
    "path": "/"
  },
  "https_enforced": true
}
JSON
```

等待自动构建；若未触发构建，再请求一次：

```sh
gh api --method POST repos/SpriCoder/spricoder.github.io/pages/builds
```

回读配置与构建结果：

```sh
gh api repos/SpriCoder/spricoder.github.io/pages --jq '{build_type,source,status,html_url,https_enforced}'
gh api repos/SpriCoder/spricoder.github.io/pages/builds/latest --jq '{status,commit,error}'
```

必须确认 `build_type=legacy`、`source=master:/`、构建为 `built`、构建提交等于旧 SHA，再通过网站核对首页和代表文章。保留 `astro-source` 与本地新站，供后续修复与重新发布。

## 官方依据

- [Astro 的 GitHub Pages 部署](https://docs.astro.build/en/guides/deploy/github/)
- [Astro 官方 GitHub Action](https://github.com/withastro/action)
- [GitHub Pages 设置与构建 API](https://docs.github.com/en/rest/pages/pages)
- [GitHub 手动工作流触发条件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)
- [GitHub OAuth 权限范围](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
