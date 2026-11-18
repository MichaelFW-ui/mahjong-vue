# 日麻工具

基于 [llx07/mahjong-vue](https://github.com/llx07/mahjong-vue) 二次开发，提供日麻点数计算、点数练习、历史错题复习和面麻记分。前端采用 Vue，计算逻辑使用 TypeScript。

[English](README.md) · [完整部署流程](docs/DEPLOYMENT_CN.md)

## 功能与版本

- 点数计算与练习，保留原作的规则设置。
- 历史错题回顾、重做及 JSON 导入导出；历史记录保存在当前页面内存中，刷新前可导出保存。
- 面麻记分：移动端四向牌桌、桌面四家正向平铺，自动判断与手动切换。支持双骰投掷、保持座次顺序的随机东家、开局规则、立直、荣和、自摸、多家和、普通与途中流局、点数调整、多步撤销和终局成绩。
- 面麻对局独立保存在 IndexedDB，支持刷新恢复、多场记录、确认后直接删除，以及 JSON 备份导入导出。玩家名单可维护多位玩家，开局选取四人；支持责任玩家、复合役满中的包牌倍数及本场支付方式。旧安卓数据导入留待后续适配。
- 正式构建缓存三个页面的静态资源，首次联网准备完成后可离线使用；开发服务保留热更新。网页材质与记分模块独立实现。
- 已合并上游 `c4eef6e`（2026-05-26），包含拔北及相关岭上开花支持；同步基线见 `project-info.json`。

## 本地开发

使用 Node.js 22 和 npm：

```bash
npm ci
npm run serve
npm test
npm run build
```

测试覆盖记分、包牌、布局边界和数据库迁移；IndexedDB 测试使用 `fake-indexeddb`。

构建结果位于 `dist/`。本地运行使用 `npm run serve`，打开终端显示地址下的 `/mahjong/`。

面麻记分入口为 `/mahjong/#/scoreboard`。四向布局中，玩家区域和其和牌面板面向所在一侧；平铺布局全部正向。布局选择保存在当前设备，计分规则在每场开局时固定。多家和供托交给放铳者下家方向最近的胜者，本场分别支付；同分按起始座位排序，终局剩余供托交给一位。

构建末尾生成 `dist/service-worker.js`，离线缓存仅覆盖 `/mahjong/`。新版本在旧页面关闭后启用，数据库保存与完整备份独立于资源缓存。清除浏览器网站数据会删除本机记录，建议定期导出备份。

## 发布

正式路径：https://www.hoshimiaki.com/mahjong/ 。源码仓库保持公开，博客独立维护。

将工具提交推送到 GitHub `main`，再更新博客的 `external/mahjong-vue` 子模块提交。博客独立构建本 Vue 应用，将成品放入 `dist/mahjong/`，由已经关联的 `hoshimiaki-blog` Worker 统一发布。完整步骤见[部署指南](docs/DEPLOYMENT_CN.md)。

## 作者、素材与许可证

原作者：[linlexiao（llx07）](https://github.com/llx07)。二次开发：[MichaelFW-ui](https://github.com/MichaelFW-ui/mahjong-vue)。程序按 [GNU GPL v3](LICENSE) 发布。

牌画来自 [lietxia/mahjong_graphic](https://github.com/lietxia/mahjong_graphic)，采用 [M+ 字型授权条款](licenses/MPlus.txt)。详见[第三方说明](THIRD_PARTY_NOTICES.md)。

“关于”展示当前版本和对应提交、原作来源、许可证与素材来源。构建会同时提供许可证文本、版本信息及该 Git 提交的完整源码归档。
