# Publish through the blog submodule

This public `MichaelFW-ui/mahjong-vue` repository is referenced by the private blog as the `external/mahjong-vue` Git submodule. The blog pins an application commit, builds Vue separately, and copies the finished app to `dist/mahjong/`. The existing `hoshimiaki-blog` Worker serves the entire site at https://www.hoshimiaki.com/ , including `/mahjong/`.

## Independent builds

The blog records the submodule's repository, path and commit. Mahjong sources remain managed in their own Git repository. Astro builds the blog; Vue builds the tool with its own scripts, artwork, About, licenses and matching source archive. Blog components link to the application's URL. See [GPL v3 section 5](https://www.gnu.org/licenses/gpl-3.0.html#section5) for aggregation of independent works.

## Application updates

Use Node.js 22. Run `npm ci`, `npm test`, and `npm run build`. Local development uses `npm run serve` and the printed origin's `/mahjong/` path. Keep `publicPath: '/mahjong/'`.

Commit and push application changes to this repository's `main` before publishing them. The source archive comes from the application's Git commit.

## Update the blog's pinned revision

Inside the blog checkout:

```bash
git submodule update --init external/mahjong-vue
git -C external/mahjong-vue fetch origin
git -C external/mahjong-vue checkout <published-application-commit>
git add external/mahjong-vue
pnpm build
```

The blog build uses the recorded revision rather than following a moving branch. It initializes missing submodule content, installs the application's locked dependencies, runs its tests, builds it separately and copies its output into `dist/mahjong/`.

Commit the blog's submodule update and push its `main`. The already connected Workers Builds project runs `pnpm check && pnpm test && pnpm build`, then `pnpm run workers:deploy` on `hoshimiaki-blog`.

## Hosting contract

Keep the current DNS-only CNAME records to `saas.sin.fan` and whole-site dashboard routes `hoshimiaki.com/*` and `www.hoshimiaki.com/*`. The same Worker serves the blog and `/mahjong/` static directory. Domain configuration and repository connection remain unchanged.

This application has no separate production Worker or Cloudflare deployment command. Maintenance reuses the existing blog Worker; creating, renaming or replacing production infrastructure requires an explicit user request.

Verify scoring, practice, history, retry, import/export and About at the public path. The About commit must match the blog's recorded submodule revision. Check GPL and artwork licenses and the corresponding source download.
