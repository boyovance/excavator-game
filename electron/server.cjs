const { app } = require('electron');
const crypto = require('crypto');
const path = require('path');
const ctx = require('./context.cjs');
const { importLocal } = require('./paths.cjs');

const eventsAbort = new AbortController();

// ---- backend: an embedded local server by default, or a remote one via env ----

async function startBackend() {
  if (process.env.EXCAVATOR_SERVER_URL) {
    ctx.serverUrl = process.env.EXCAVATOR_SERVER_URL.replace(/\/$/, '');
    ctx.serverToken = process.env.EXCAVATOR_TOKEN ?? '';
    return;
  }
  const { startServer } = await importLocal('server', 'index.mjs');
  ctx.serverToken = crypto.randomBytes(24).toString('hex');
  ctx.embedded = await startServer({
    dataDir: app.getPath('userData'),
    token: ctx.serverToken,
    port: 0,
    contentDir: app.isPackaged
      ? path.join(process.resourcesPath, 'content-dist')
      : path.join(__dirname, '..', 'content-dist'),
  });
  ctx.serverUrl = `http://127.0.0.1:${ctx.embedded.port}`;
}

function call(pathname, init = {}) {
  return fetch(ctx.serverUrl + pathname, {
    ...init,
    headers: { Authorization: `Bearer ${ctx.serverToken}`, 'Content-Type': 'application/json' },
  });
}

function dispatch(action) {
  call('/dispatch', { method: 'POST', body: JSON.stringify(action) }).catch(() => {});
}

async function listenForState(onServerState) {
  while (!ctx.quitting) {
    try {
      const res = await call('/events', { signal: eventsAbort.signal });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let cut;
        while ((cut = buf.indexOf('\n\n')) !== -1) {
          const block = buf.slice(0, cut);
          buf = buf.slice(cut + 2);
          const line = block.split('\n').find((l) => l.startsWith('data: '));
          if (line) onServerState(JSON.parse(line.slice(6)));
        }
      }
    } catch {}
    if (!ctx.quitting) await new Promise((r) => setTimeout(r, 2000));
  }
}

module.exports = { eventsAbort, startBackend, call, dispatch, listenForState };
