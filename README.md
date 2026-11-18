# Mahjong tools

A derivative of [llx07/mahjong-vue](https://github.com/llx07/mahjong-vue), with riichi mahjong scoring, practice, and mistake review. The interface uses Vue and the calculation logic uses TypeScript.

[中文](README_CN.md) · [Deployment guide](docs/DEPLOYMENT.md)

## Features and upstream

- Score calculation and practice with the original rule settings.
- Mistake history, retry, and JSON import/export. History is held in page memory; export it before refreshing to keep a copy.
- Merged upstream `c4eef6e` (2026-05-26), including nuki dora and the corresponding rinshan support. The baseline is recorded in `project-info.json`.

## Local development

Use Node.js 22 and npm:

```bash
npm ci
npm run serve
npm test
npm run build
```

Production assets are written to `dist/`. Run `npm run serve` and open `/mahjong/` under the printed URL for local development.

## Releases

Public path: https://www.hoshimiaki.com/mahjong/ . This public application is maintained separately from the blog.

Push application commits to GitHub `main`, then update and commit the private blog's `external/mahjong-vue` submodule revision. The blog builds this Vue application separately and copies its output to `dist/mahjong/`. Its existing `hoshimiaki-blog` Worker publishes the whole site through GitHub Workers Builds. Follow the [deployment guide](docs/DEPLOYMENT.md) for the complete workflow.

## Authors, artwork and license

Original author: [linlexiao (llx07)](https://github.com/llx07). Derivative: [MichaelFW-ui](https://github.com/MichaelFW-ui/mahjong-vue). The program is distributed under [GNU GPL v3](LICENSE).

Tile artwork comes from [lietxia/mahjong_graphic](https://github.com/lietxia/mahjong_graphic) under the [M+ Fonts License](licenses/MPlus.txt). See [third-party notices](THIRD_PARTY_NOTICES.md).

About identifies the deployed version and Git commit, upstream, licenses and artwork source. Each build includes license texts, version metadata and a complete source archive of that Git commit.
