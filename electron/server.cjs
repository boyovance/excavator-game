const { app } = require('electron');
const crypto = require('crypto');
const path = require('path');
const ctx = require('./context.cjs');
const { importLocal } = require('./paths.cjs');
const { logLine } = require('./log.cjs');

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
    onSaveError: (err) => logLine('state-save-failed', err),
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
  return call('/dispatch', { method: 'POST', body: JSON.stringify(action), signal: AbortSignal.timeout(10_000) })
    .then(async (res) => {
      if (!res.ok) return { ok: false, message: res.status === 503 ? '存檔失敗，進度未變更。請檢查磁碟後重試。' : action.type === 'claimGrowth' ? '尚未達到階段目標或獎勵不存在，請重新確認。' : ['buy', 'equip'].includes(action.type) ? '無法套用：請檢查金幣、擁有狀態及機型適配。' : action.type === 'buySlot' ? '金幣不足，或第 2 派遣槽已解鎖。' : '工作狀態或出發條件已變更，請檢查完成時間、等級、機型、耐久，以及工作槽、機型或工地是否已被佔用。' };
      return { ok: true, message: '操作成功', state: await res.json() };
    }).catch((err) => {
      logLine('dispatch-failed', err);
      return { ok: false, message: '未能確認操作結果，請稍後重試；同一份收穫不會重複領取。' };
    });
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
