# Mahjong tools

A derivative of [llx07/mahjong-vue](https://github.com/llx07/mahjong-vue), with riichi mahjong scoring, practice, mistake review, and an in-person table scoreboard. The interface uses Vue and the calculation logic uses TypeScript.

[中文](README_CN.md) · [Deployment guide](docs/DEPLOYMENT.md)

## Features and upstream

- Score calculation and practice with the original rule settings.
- Mistake history, retry, and JSON import/export. History is held in page memory; export it before refreshing to keep a copy.
- In-person scoring (面麻记分): a four-direction table on touch devices and upright player panels on desktop, with automatic and manual layout selection. Includes two-dice rolls, random starting East with cyclic seat order preserved, game setup, riichi, ron, tsumo, multiple winners, exhaustive/abortive draws, adjustments, multi-step undo, and final standings.
- Scoreboard games use a separate IndexedDB database, with reload recovery, multiple saved games, individual permanent deletion after confirmation, and JSON backup import/export. Maintain a reusable player roster and select four players at setup. Responsibility payments support the liable player, affected yakuman multiples, and honba allocation; legacy Android import remains a future addition.
- Production builds cache all three pages for offline use after the initial online preparation; the development server retains hot reload. The scoreboard logic, interface, and visual materials are independently implemented.
- Merged upstream `c4eef6e` (2026-05-26), including nuki dora and the corresponding rinshan support. The baseline is recorded in `project-info.json`.

## Local development

Use Node.js 22 and npm:

```bash
npm ci
npm run serve
npm test
npm run build
```

Tests cover scoring, responsibility payments, layout bounds, and database migrations; IndexedDB tests use `fake-indexeddb`.

Production assets are written to `dist/`. Run `npm run serve` and open `/mahjong/` under the printed URL for local development.

Open `/mahjong/#/scoreboard` for in-person scoring. Table-mode player panels and their winning-hand dialogs face each seat; flat mode keeps all text upright. Layout preferences are device-local and each game retains its initial rules. For multiple ron, the closest winner after the discarder receives the riichi pool, while honba are paid to each winner. Ties follow initial seat order, and the remaining pool goes to first place when ending a game.

The final build step generates `dist/service-worker.js`, scoped to `/mahjong/`. Updates activate after older tabs close. Game data and JSON backups are independent of the resource cache. Clearing site data removes browser-local records, so export backups regularly.

## Releases

Public path: https://www.hoshimiaki.com/mahjong/ . This public application is maintained separately from the blog.

Push application commits to GitHub `main`, then update and commit the private blog's `external/mahjong-vue` submodule revision. The blog builds this Vue application separately and copies its output to `dist/mahjong/`. Its existing `hoshimiaki-blog` Worker publishes the whole site through GitHub Workers Builds. Follow the [deployment guide](docs/DEPLOYMENT.md) for the complete workflow.

## Authors, artwork and license

Original author: [linlexiao (llx07)](https://github.com/llx07). Derivative: [MichaelFW-ui](https://github.com/MichaelFW-ui/mahjong-vue). The program is distributed under [GNU GPL v3](LICENSE).

Tile artwork comes from [lietxia/mahjong_graphic](https://github.com/lietxia/mahjong_graphic) under the [M+ Fonts License](licenses/MPlus.txt). See [third-party notices](THIRD_PARTY_NOTICES.md).

About identifies the deployed version and Git commit, upstream, licenses and artwork source. Each build includes license texts, version metadata and a complete source archive of that Git commit.
