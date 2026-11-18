# Agent Notes

## Project boundaries
- This public GPL v3 application is referenced as a Git submodule by the private blog.
- Keep its Vue build independent from Astro. The blog copies only the finished application to `dist/mahjong/`.
- Preserve practice history, import/export, and retry behavior when merging upstream.
- Keep `project-info.json` accurate. Retain original copyright, third-party licenses, and corresponding-source downloads.

## Deployment contract
- Read `docs/DEPLOYMENT_CN.md` before changing deployment behavior.
- Production uses only the existing `hoshimiaki-blog` Worker, already connected to `MichaelFW-ui/musical-waffle-blog-source`, branch `main`.
- This repository has no separate production Worker. Do not create one or introduce Cloudflare login or deployment commands.
- Publish application changes to `MichaelFW-ui/mahjong-vue`, then update and commit the blog's `external/mahjong-vue` submodule revision. Pushing the blog triggers Workers Builds.
- Keep `publicPath: '/mahjong/'`. The blog's existing whole-site routes serve the application's independent static files at `/mahjong/`.
- Preserve DNS-only CNAMEs to `saas.sin.fan` and dashboard-managed blog routes. Infrastructure changes require an explicit user request.
- Keep credentials and local files out of Git. Update both README language versions when changing tooling.
