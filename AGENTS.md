# Agent Notes

## Project boundaries
- This is the public GPL v3 mahjong application, maintained independently from the private blog repository.
- Preserve the practice history, import/export, and retry functionality when merging upstream.
- Keep upstream revision information in `project-info.json` accurate. Retain original copyright and third-party licenses.

## Deployment contract
- Read `docs/DEPLOYMENT_CN.md` before changing deployment settings.
- Source: `MichaelFW-ui/mahjong-vue`, production branch: `main`.
- Worker identity: `hoshimiaki-mahjong`; path: `https://www.hoshimiaki.com/mahjong/`.
- Deploy by pushing GitHub commits. The connected Cloudflare Workers Builds project runs the build and deploy commands.
- Use the existing connected Worker for all subsequent work. Do not create, rename, replace, or duplicate Workers unless the user explicitly requests that infrastructure change.
- Do not run local `wrangler login` or production `wrangler deploy` as part of ordinary work. The deploy script is for the Cloudflare build environment. Local `wrangler dev` and `wrangler deploy --dry-run` are validation only.
- Domain routes are managed in the Cloudflare dashboard; preserve the blog's existing domain and Worker.
- Keep deployment credentials and local files out of Git. Update both README language versions when changing tooling.
