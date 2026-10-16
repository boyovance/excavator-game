const { net, protocol } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const content = require('./content.cjs');
const ctx = require('./context.cjs');
const { userFile } = require('./paths.cjs');
const { broadcast } = require('./windows.cjs');

const PACK_SYNC_INTERVAL_MS = 30 * 60 * 1000;

let publicKey = null;

try {
  publicKey = fs.readFileSync(path.join(__dirname, 'content-public.pem'), 'utf8');
} catch {}

const contentCache = () => userFile('content');

// Downloaded style packs are served to the pages from the local cache through this scheme.
function registerPackScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'excavator-pack', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  ]);
}

function handlePackProtocol() {
  protocol.handle('excavator-pack', async (request) => {
    const url = new URL(request.url);
    const [version, file] = url.pathname.split('/').filter(Boolean);
    const target = content.resolveCachedFile(contentCache(), url.hostname, version ?? '', file ?? '');
    if (!target) return new Response('not found', { status: 404 });
    const res = await net.fetch(pathToFileURL(target).href);
    return new Response(res.body, {
      headers: { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' },
    });
  });
}

function loadCachedPacks() {
  ctx.packs = publicKey ? content.listPacks({ cacheDir: contentCache(), publicKey }) : [];
}

async function syncPacks() {
  if (!publicKey || ctx.quitting) return;
  const before = JSON.stringify(ctx.packs);
  try {
    ctx.packs = await content.syncContent({
      baseUrl: ctx.serverUrl,
      headers: { Authorization: `Bearer ${ctx.serverToken}` },
      cacheDir: contentCache(),
      publicKey,
    });
  } catch {
    loadCachedPacks();
  }
  if (JSON.stringify(ctx.packs) !== before) broadcast('packs', ctx.packs);
}

function startPackSync() {
  syncPacks();
  setInterval(syncPacks, PACK_SYNC_INTERVAL_MS);
}

module.exports = { registerPackScheme, handlePackProtocol, loadCachedPacks, syncPacks, startPackSync };
