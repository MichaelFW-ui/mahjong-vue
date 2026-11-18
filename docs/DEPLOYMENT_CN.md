# 通过博客子模块发布日麻工具

本工具在公开仓库 `MichaelFW-ui/mahjong-vue` 独立维护。博客通过 Git 子模块固定使用其中一个提交，分别构建后将工具成品复制到 `dist/mahjong/`，统一由已有的 `hoshimiaki-blog` Worker 发布。

正式地址：https://www.hoshimiaki.com/mahjong/ 。整个网站使用现有的一个 Worker，沿用 GitHub → Workers Builds 自动发布。

## 构建与许可边界

博客仓库中的 `external/mahjong-vue` 是指向本公开仓库的 Git 子模块。博客自己的提交记录保存子模块路径、仓库地址和提交号。麻将源码由它自己的 Git 仓库管理。

Astro 构建博客，Vue 单独构建麻将工具。博客的脚本和组件只链接 `/mahjong/`，工具使用自己的 JavaScript、页面、素材、About、GPL 许可证和对应源码归档。独立作品并置的许可依据见 [GPL v3 第 5 条](https://www.gnu.org/licenses/gpl-3.0.html#section5)。

## 一、在麻将仓库完成修改

使用 Node.js 22 和 npm，执行本地检查：

```bash
npm ci
npm test
npm run build
```

本地运行使用 `npm run serve`，访问终端显示地址下的 `/mahjong/`。保留 Vue 的 `publicPath: '/mahjong/'`。

将通过检查的修改提交并推送到本仓库的 `main`。构建时的源码归档来自本仓库 Git 提交，因此需要先提交工具修改，再构建正式分发版本。

## 二、更新博客的引用版本

进入博客仓库 `MichaelFW-ui/musical-waffle-blog-source`，执行：

```bash
git submodule update --init external/mahjong-vue
git -C external/mahjong-vue fetch origin
git -C external/mahjong-vue checkout <已发布的麻将提交号>
git add external/mahjong-vue
pnpm build
```

这里的提交号选择本公开仓库已经推送的版本。博客构建固定使用所记录的提交，不自动追随上游移动，便于复现和回退。日常修改优先在独立麻将检出目录中完成。

## 三、推送博客，复用现有自动部署

博客现有的构建命令为 `pnpm check && pnpm test && pnpm build`，部署命令为 `pnpm run workers:deploy`，Worker 名称保持 `hoshimiaki-blog`。

`pnpm build` 会生成博客、初始化缺失的子模块、安装工具自身的锁定依赖、运行工具测试并独立构建，将成品复制到博客 `dist/mahjong/`。随后 Workers Builds 发布整个 `dist/`。

确认本地构建后，提交博客的子模块版本更新并推送到博客 `main`。等待现有 GitHub Workers Builds 检查成功即可。

## 四、保持当前域名配置

当前的 `hoshimiaki.com` 和 `www.hoshimiaki.com` 继续以仅 DNS 的 CNAME 指向 `saas.sin.fan`，博客保留 `hoshimiaki.com/*` 和 `www.hoshimiaki.com/*` 整站路由。

访问 `/mahjong/` 时，现有 Worker 从网站的 `dist/mahjong/` 目录提供工具页面和资源。裸域名现有的跳转会保留路径。此流程沿用当前的 DNS、路由和 GitHub 仓库关联。

## 五、验收

打开正式地址，检查计算器、点数练习、错题记录、重做、导入导出和 About。About 中的版本提交须与博客记录的子模块提交一致；GPL、M+ 素材许可证和本版本源码下载应可访问。

博客的发布约定记录在它的 `DEPLOYMENT.md` 和 `docs/WORKERS_CN.md`。维护工作只复用现有 Worker；新建、重命名或替换生产基础设施须由用户明确提出。
