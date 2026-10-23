import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { normalize, reduce, stamp } from '../src/shared/reducer.mjs';
import persistence from './persistence.cjs';

const MAX_BODY = 4096;
const MAX_ADMIN_BODY = 65_536;
const TICK_INTERVAL_MS = 30_000;
const HEARTBEAT_MS = 25_000;

// Only these may come from a client. Amounts, time and dice are decided here, never by the client.
const CLIENT_ACTIONS = new Set([
  'dig', 'wear', 'rest', 'poke', 'rename', 'buy', 'equip', 'repair',
  'startJob', 'cancelJob', 'claim', 'claimGrowth', 'buySlot', 'ackReport', 'ackMilestone', 'tint',
]);

// Minimum gap between accepted actions of the same kind.
const COOLDOWN_MS = { dig: 1500, poke: 1200, wear: 15_000, rest: 2500 };

const str = (v, max) => String(v ?? '').slice(0, max);

function sanitize(action) {
  switch (action.type) {
    case 'wear':
    case 'rest':
      return { type: action.type, amount: 1 };
    case 'rename':
      return { type: 'rename', name: str(action.name, 40) };
    case 'buy':
    case 'equip':
    case 'claimGrowth':
      return { type: action.type, id: str(action.id, 64) };
    case 'startJob':
      return { type: 'startJob', site: str(action.site, 64), ...(action.machine == null ? {} : { machine: str(action.machine, 64) }) };
    case 'claim':
    case 'cancelJob':
      return { type: action.type, jobId: typeof action.jobId === 'string' ? str(action.jobId, 128) : undefined };
    case 'tint':
      return { type: 'tint', slot: str(action.slot, 20), color: action.color == null ? null : str(action.color, 9) };
    default:
      return { type: action.type };
  }
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const CONTENT_FILE_RE = /^files\/([a-z0-9][a-z0-9-]{0,39})\/([A-Za-z0-9][A-Za-z0-9._-]{0,19})\/([A-Za-z0-9_-]{1,40}\.png)$/;
const CONTENT_TYPES = { '.png': 'image/png', '.json': 'application/json', '.sig': 'text/plain' };

function serveContent(res, contentDir, rel) {
  let target = null;
  const m = CONTENT_FILE_RE.exec(rel);
  if (m) target = path.join(contentDir, 'files', m[1], m[2], m[3]);
  else if (rel === 'manifest.json' || rel === 'manifest.sig') target = path.join(contentDir, rel);
  if (!target) return false;
  let stat;
  try {
    stat = fs.statSync(target);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;
  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES[path.extname(target)] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': m ? 'public, max-age=31536000, immutable' : 'no-store',
  });
  fs.createReadStream(target).pipe(res);
  return true;
}

function firstSeen(dir, fallback) {
  let earliest = fallback;
  try {
    for (const name of ['', ...fs.readdirSync(dir)]) {
      const created = fs.statSync(path.join(dir, name)).birthtimeMs;
      if (created > 0 && created < earliest) earliest = created;
    }
  } catch {}
  return earliest;
}

export async function startServer({ dataDir, token, port = 0, host = '127.0.0.1', now = Date.now, contentDir = null, onSaveError = (err) => console.error('Save failed; will retry:', err) }) {
  if (!token) throw new Error('startServer: token is required');
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'state.json');
  const backup = path.join(dataDir, 'state.bak.json');

  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  let state;
  try {
    state = normalize(read(file));
  } catch {
    try {
      state = normalize(read(backup));
    } catch {
      state = normalize(null);
    }
  }
  if (!state.since) {
    // A save from before companion days existed. The save file itself is replaced on every write, so its
    // creation time is just the last save; the oldest file in the data folder is the best guess for the first day.
    state = { ...state, since: firstSeen(dataDir, now()) };
  }
  state = reduce(state, { type: 'tick', now: now() });

  const writer = persistence.createJsonWriter({ file, backup, onError: onSaveError });
  const scheduleSave = () => writer.schedule(state);

  const clients = new Set();
  const lastAt = {};

  const publish = () => {
    const data = `data: ${JSON.stringify(state)}\n\n`;
    for (const res of clients) res.write(data);
  };

  const apply = (action) => {
    const next = reduce(state, action);
    if (next === state) return false;
    state = next;
    scheduleSave();
    publish();
    return true;
  };

  const tick = () => apply({ type: 'tick', now: now() });

  const handleAction = (raw) => {
    if (!raw || typeof raw !== 'object' || !CLIENT_ACTIONS.has(raw.type)) return 400;
    if (['claim', 'cancelJob'].includes(raw.type) && (typeof raw.jobId !== 'string' || !raw.jobId || raw.jobId.length > 128)) return 400;
    if (raw.type === 'claimGrowth' && (typeof raw.id !== 'string' || !raw.id || raw.id.length > 64)) return 400;
    const t = now();
    const cooldown = COOLDOWN_MS[raw.type];
    if (cooldown) {
      if (t - (lastAt[raw.type] ?? 0) < cooldown) return 200;
      lastAt[raw.type] = t;
    }
    tick();
    // Resting only makes sense while the machine is broken down.
    if (raw.type === 'rest' && state.durability >= 15) return 200;
    const action = stamp(sanitize(raw), t);
    if (['startJob', 'claim', 'cancelJob', 'buy', 'buySlot', 'equip', 'claimGrowth'].includes(raw.type)) {
      const next = reduce(state, action);
      if (next === state) {
        if (raw.type === 'claim' && raw.jobId && state.reports.some((r) => r.jobId === raw.jobId)) return 200;
        if (raw.type === 'claimGrowth' && state.growthClaimed.includes(raw.id)) return 200;
        return 409;
      }
      if (!writer.commit(next)) return 503;
      state = next;
      publish();
    } else apply(action);
    return 200;
  };

  const json = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  const server = http.createServer((req, res) => {
    const addr = server.address();
    const hostOk = [`127.0.0.1:${addr.port}`, `localhost:${addr.port}`].includes(req.headers.host ?? '');
    // A browser page cannot send credentials or a matching Host here, so other sites cannot drive this server.
    if (!hostOk || req.headers.origin) return json(res, 403, { error: 'forbidden' });
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ') || !safeEqual(auth.slice(7), token)) return json(res, 401, { error: 'unauthorized' });

    const url = new URL(req.url ?? '/', 'http://local');

    if (req.method === 'GET' && url.pathname.startsWith('/content/')) {
      if (contentDir && serveContent(res, contentDir, url.pathname.slice('/content/'.length))) return;
      return json(res, 404, { error: 'not-found' });
    }

    if (req.method === 'GET' && url.pathname === '/state') {
      tick();
      return json(res, 200, state);
    }

    if (req.method === 'GET' && url.pathname === '/events') {
      tick();
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify(state)}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    const readJson = (limit, handle) => {
      if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) {
        return json(res, 415, { error: 'json-only' });
      }
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) {
          json(res, 413, { error: 'too-large' });
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        if (res.writableEnded) return;
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          return json(res, 400, { error: 'bad-json' });
        }
        handle(body);
      });
    };

    if (req.method === 'POST' && url.pathname === '/dispatch') {
      return readJson(MAX_BODY, (body) => {
        const status = handleAction(body);
        if (status !== 200) return json(res, status, { error: status === 503 ? 'save-failed' : status === 409 ? 'job-conflict' : 'bad-action' });
        json(res, 200, state);
      });
    }

    // Wholesale replacement (import / reset). Only the app shell holds the token, pages cannot reach this.
    if (req.method === 'POST' && url.pathname === '/admin/replace') {
      return readJson(MAX_ADMIN_BODY, (body) => {
        if (!body || typeof body !== 'object' || !('state' in body)) return json(res, 400, { error: 'bad-request' });
        const fresh = normalize(body.state);
        // an imported save keeps its own first day; a reset starts a new one
        const next = reduce({ ...fresh, moodAt: now(), since: fresh.since || now() }, { type: 'tick', now: now() });
        if (!writer.commit(next)) return json(res, 503, { error: 'save-failed' });
        state = next;
        for (const k of Object.keys(lastAt)) delete lastAt[k];
        publish();
        json(res, 200, state);
      });
    }

    json(res, 404, { error: 'not-found' });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });

  const ticker = setInterval(tick, TICK_INTERVAL_MS);
  scheduleSave();
  const heartbeat = setInterval(() => {
    for (const res of clients) res.write(': ping\n\n');
  }, HEARTBEAT_MS);

  return {
    port: server.address().port,
    getState: () => state,
    async close() {
      clearInterval(ticker);
      clearInterval(heartbeat);
      for (const res of clients) res.end();
      clients.clear();
      writer.schedule(state);
      const saved = writer.close();
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      });
      return saved;
    },
  };
}
