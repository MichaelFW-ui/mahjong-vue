const { createHash } = require('node:crypto');
const { readdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const directory = path.resolve(__dirname, '../dist');
const base = '/mahjong/';
function collect(folder, prefix = '') {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? collect(path.join(folder, entry.name), relative) : [relative];
  });
}
const files = collect(directory)
  .filter(
    (file) =>
      /\.(html|js|css|png|webp|svg|ico|woff2?|webmanifest)$/.test(file) &&
      file !== 'service-worker.js'
  )
  .sort();
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(readFileSync(path.join(directory, file)));
const cache = `mahjong-shell-${hash.digest('hex').slice(0, 16)}`;
const assets = [base, ...files.map((file) => base + file)];
const worker = `/* 本文件由构建生成，缓存范围仅为 /mahjong/。 */
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('mahjong-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/mahjong/')) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') return (await cache.match('/mahjong/')) || fetch(event.request);
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});
`;
writeFileSync(path.join(directory, 'service-worker.js'), worker);
console.log(`离线资源已生成：${assets.length} 项，${cache}。新版本在旧页面关闭后启用。`);
