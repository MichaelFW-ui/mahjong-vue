# Cloudflare path deployment

This independently built application is served at https://www.hoshimiaki.com/mahjong/ . Its public source repository is `MichaelFW-ui/mahjong-vue`, production branch `main`, and designated Worker `hoshimiaki-mahjong`.

## Release contract

Push tested commits to GitHub. The connected Cloudflare Workers Builds project builds and deploys to the designated Worker. Reuse that Worker for subsequent work. Creating, renaming, replacing, or duplicating Workers requires an explicit user request for an infrastructure change. Local validation uses builds and previews; ordinary maintenance does not use local Cloudflare login or production deployment.

The existing private blog repository `MichaelFW-ui/musical-waffle-blog-source` deploys separately to `hoshimiaki-blog`. The blog stores the tool's introduction and URL.

## One-time repository connection

In Cloudflare, select Compute & AI > Workers & Pages > Create application > Connect GitHub / Import a repository. Choose `MichaelFW-ui/mahjong-vue`. If the designated Worker already exists, open its Settings > Build to connect the repository.

| Setting | Value |
| --- | --- |
| Worker name | `hoshimiaki-mahjong` |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm test && npm run build` |
| Deploy command | `npm run workers:deploy` |
| Node.js | `NODE_VERSION=22`, also recorded in `.node-version` |
| Install command, if shown | `npm ci` |

Workers Builds manages deployment authentication. After the first successful deployment, append `/mahjong/` to the assigned workers.dev URL for a preview.

## Preserve preferred-edge DNS

Keep the apex and `www` DNS-only CNAME records pointing to `saas.sin.fan`. Domain routes remain dashboard-managed. Both Wrangler configurations intentionally omit `route`, `routes`, and `custom_domain`.

In the mahjong Worker's Settings > Domains & Routes > Add > Route, choose zone `hoshimiaki.com` and add `www.hoshimiaki.com/mahjong/*` and `hoshimiaki.com/mahjong/*`. If prompted, select fail closed.

Keep the blog's existing `www.hoshimiaki.com/*` and `hoshimiaki.com/*` routes assigned to `hoshimiaki-blog`. The more specific mahjong routes take precedence. The existing apex redirect preserves the requested path. The blog handles `/mahjong` -> `/mahjong/`.

## Validation and updates

The Vue build uses `publicPath: '/mahjong/'`; Workers serves `dist` with `assets.base_path: '/mahjong'`. These settings keep scripts, tile images, license links and source downloads under the public prefix.

Run `npm ci`, `npm test` and `npm run build`. For a local Workers preview, run `npm run workers:dev` and visit `/mahjong/`. Verify calculation, practice, mistake history, import/export, retry and About. A production build includes the exact Git revision, license texts and `source.tar.gz`.

Push tested changes to `main` and wait for the repository's Workers Builds check. Preserve Worker identity, routes and DNS. Read build logs if publishing fails; confirm the repository connection and project name before changing infrastructure. Update `project-info.json` when merging upstream.

Detailed field-by-field instructions are in [the Chinese guide](DEPLOYMENT_CN.md).

References: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [routes](https://developers.cloudflare.com/workers/configuration/routing/routes/), [static asset subpaths](https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/), [existing DNS arrangement](https://winston.ink/post/preferential/).
