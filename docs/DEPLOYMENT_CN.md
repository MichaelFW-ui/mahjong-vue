# Cloudflare 同域路径部署

本项目是独立的日麻工具，正式入口为 https://www.hoshimiaki.com/mahjong/ 。博客的代码、构建与发布保持独立。

## 固定发布约定

| 项目 | 配置 |
| --- | --- |
| GitHub 仓库 | `MichaelFW-ui/mahjong-vue`，公开 |
| 生产分支 | `main` |
| Worker 名称 | `hoshimiaki-mahjong` |
| 正式路径 | `https://www.hoshimiaki.com/mahjong/` |
| 前端资源前缀 | `vue.config.js` 的 `publicPath: '/mahjong/'` |
| Workers 资源前缀 | `wrangler.jsonc` 的 `assets.base_path: '/mahjong'` |

日常发布通过推送 GitHub 触发 Cloudflare Workers Builds。部署命令由 Cloudflare 构建环境执行。后续维护始终复用已关联的 `hoshimiaki-mahjong`；创建、重命名、替换或复制 Worker 需要用户明确提出基础设施变更。日常开发只做本地构建和预览，不运行本机 Cloudflare 登录和生产部署。

现有博客使用 `hoshimiaki-blog`，关联私有仓库 `MichaelFW-ui/musical-waffle-blog-source`。保留博客现有的整站路由及 DNS 配置。

## 一、首次关联 GitHub 仓库

1. 打开 Cloudflare 控制台，进入 **计算和 AI → Workers 和 Pages**（Compute & AI → Workers & Pages）。
2. 首次设置时选择**创建应用 → 连接 GitHub**（Create application → Connect GitHub / Import a repository）。选择 `MichaelFW-ui/mahjong-vue`。如果列表中已有 `hoshimiaki-mahjong`，进入它的**设置 → 构建**（Settings → Build）连接仓库。
3. 填写以下配置，核对名称后保存并部署。

| 控制台字段 | 填写内容 |
| --- | --- |
| 项目 / Worker 名称（Worker name） | `hoshimiaki-mahjong` |
| 生产分支（Production branch） | `main` |
| 根目录（Root directory） | 仓库根目录，保持默认 |
| 构建命令（Build command） | `npm test && npm run build` |
| 部署命令（Deploy command） | `npm run workers:deploy` |
| Node.js 版本（Build variable） | `NODE_VERSION=22`；仓库也提供 `.node-version` |

Cloudflare 按 `package-lock.json` 安装依赖。若界面单独提供安装命令（Install command），填写 `npm ci`。构建依赖包括固定版本的 Wrangler；部署身份由 Workers Builds 管理，无需在 GitHub 仓库或本机配置 API 令牌。

等待构建和部署显示成功。在它提供的 `workers.dev` 地址后面加上 `/mahjong/` 预览，例如 `https://hoshimiaki-mahjong.<你的子域>.workers.dev/mahjong/`。

## 二、沿用当前的 DNS 优选

两个 DNS 记录继续保持现有设置：

| 类型 | 名称 | 内容 | 代理状态 |
| --- | --- | --- | --- |
| CNAME | `@` | `saas.sin.fan` | 仅 DNS（灰色云朵） |
| CNAME | `www` | `saas.sin.fan` | 仅 DNS（灰色云朵） |

域名与路径路由由控制台管理。两个项目的 Wrangler 配置都省略 `route`、`routes` 和 `custom_domain`，让自动构建专注于更新代码与资源。保留现有域名的解析方式和博客路由。

## 三、将 /mahjong/ 分配给独立 Worker

1. 打开 **Workers 和 Pages → hoshimiaki-mahjong**。
2. 进入**设置 → 域和路由 → 添加 → 路由**（Settings → Domains & Routes → Add → Route）。此处使用“路由”。
3. 区域（Zone）选择 `hoshimiaki.com`，分别添加下列两条规则。

| 路由模式（Route pattern） | 目标 Worker |
| --- | --- |
| `www.hoshimiaki.com/mahjong/*` | `hoshimiaki-mahjong` |
| `hoshimiaki.com/mahjong/*` | `hoshimiaki-mahjong` |

若界面要求选择失败模式（Failure mode），选择**失败时关闭**（Fail closed）。这能让麻将路径在应用故障时直接报错，便于定位问题。

博客原有的 `www.hoshimiaki.com/*` 和 `hoshimiaki.com/*` 继续属于 `hoshimiaki-blog`。Cloudflare 优先匹配更具体的路径，所以 `/mahjong/*` 进入麻将工具，其他路径继续进入博客。DNS 记录不需要增加路径。

## 四、访问与验收

打开 https://www.hoshimiaki.com/mahjong/ ，检查计算器、点数练习、历史错题、导入导出和“关于”。“关于”提供当前版本、上游提交、GPL v3 许可证、牌画素材说明及本版本源码下载。

访问 https://hoshimiaki.com/mahjong/ 时，现有的裸域名跳转会保留路径。博客仓库提供 `/mahjong` 到 `/mahjong/` 的补斜杠跳转；主页“做过的小工具”中的入口标注“二次开发”。

然后检查博客首页和文章仍可访问，确认两个 Worker 的路由分工正确。

## 五、后续更新

本地检查使用 `npm ci`、`npm test` 和 `npm run build`；需要查看正式路径时运行 `npm run workers:dev`，打开终端地址下的 `/mahjong/`。这些本地检查不发布生产版本。

确认修改后提交并推送到 `main`。在 GitHub 提交的 Workers Builds 检查或 Cloudflare 的构建记录中等待发布成功。域名、路由、Worker 名称和 DNS 优选设置保持既有安排。

每次正式构建会生成版本信息、完整许可证和 `source.tar.gz`，源码归档来自构建时的 Git 提交，便于访问者获得对应版本。上游同步信息记录在 `project-info.json`；更新上游时同时维护此文件。

## 排查

| 现象 | 检查位置 |
| --- | --- |
| 构建报错 | 当前仓库的 Workers Builds 日志，确认 Node.js 22、根目录与两条命令 |
| workers.dev 正常，正式路径显示博客 404 | 麻将 Worker 的两条 `/mahjong/*` 路由是否已保存 |
| HTML 打开但脚本 404 | `publicPath` 和 `assets.base_path` 是否都为 `/mahjong/` 对应前缀 |
| 推送后没有新构建 | Workers 的设置 → 构建，确认关联此仓库和 `main` |
| Worker 名称不一致 | 核对已关联项目与 `wrangler.jsonc` 的 `hoshimiaki-mahjong` |

## 参考

- [Cloudflare Workers Builds 配置](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Cloudflare 路由与优先级](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [静态资源子路径部署](https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/)
- [用户现有的 DNS 优选方案](https://winston.ink/post/preferential/)
