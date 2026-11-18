# 日麻工具

基于 [llx07/mahjong-vue](https://github.com/llx07/mahjong-vue) 二次开发，提供日麻点数计算、点数练习和历史错题复习。前端采用 Vue，计算逻辑使用 TypeScript。

[English](README.md) · [完整部署流程](docs/DEPLOYMENT_CN.md)

## 功能与版本

- 点数计算与练习，保留原作的规则设置。
- 历史错题回顾、重做及 JSON 导入导出；历史记录保存在当前页面内存中，刷新前可导出保存。
- 已合并上游 `c4eef6e`（2026-05-26），包含拔北及相关岭上开花支持；同步基线见 `project-info.json`。

## 本地开发

使用 Node.js 22 和 npm：

```bash
npm ci
npm run serve
npm test
npm run build
```

构建结果位于 `dist/`。`npm run workers:dev` 提供与线上一致的静态资源路径预览，打开终端显示地址下的 `/mahjong/`。

## 发布

正式路径：https://www.hoshimiaki.com/mahjong/ 。源码仓库保持公开，博客独立维护。

将提交推送到 GitHub `main`，由已关联的 Cloudflare Workers Builds 发布到固定的 `hoshimiaki-mahjong`。首次关联、构建字段、同域路径和现有 DNS 优选的完整操作见[部署指南](docs/DEPLOYMENT_CN.md)。后续维护复用此 Worker。部署命令由 Cloudflare 构建环境运行。

## 作者、素材与许可证

原作者：[linlexiao（llx07）](https://github.com/llx07)。二次开发：[MichaelFW-ui](https://github.com/MichaelFW-ui/mahjong-vue)。程序按 [GNU GPL v3](LICENSE) 发布。

牌画来自 [lietxia/mahjong_graphic](https://github.com/lietxia/mahjong_graphic)，采用 [M+ 字型授权条款](licenses/MPlus.txt)。详见[第三方说明](THIRD_PARTY_NOTICES.md)。

“关于”展示当前版本和对应提交、原作来源、许可证与素材来源。构建会同时提供许可证文本、版本信息及该 Git 提交的完整源码归档。
