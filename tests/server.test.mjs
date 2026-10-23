import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../server/index.mjs';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-'));
const TOKEN = 'secret-token';
let t = 1_000_000;
const clock = () => t;

let srv = await startServer({ dataDir: dir, token: TOKEN, now: clock });
const base = () => `http://127.0.0.1:${srv.port}`;
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const get = (p, headers = H) => fetch(base() + p, { headers });
const post = (body, headers = H) => fetch(base() + '/dispatch', { method: 'POST', headers, body: JSON.stringify(body) });
const state = async () => (await (await get('/state')).json());

ok((await get('/state', {})).status === 401, 'no token -> 401');
ok((await get('/state', { Authorization: 'Bearer nope' })).status === 401, 'wrong token -> 401');
ok((await get('/state', { ...H, Origin: 'https://evil.example' })).status === 403, 'browser Origin header -> 403');

const hostStatus = await new Promise((resolve) => {
  const r = http.request({ host: '127.0.0.1', port: srv.port, path: '/state', headers: { ...H, Host: 'evil.example' } }, (res) => resolve(res.statusCode));
  r.end();
});
ok(hostStatus === 403, 'wrong Host header (DNS rebinding) -> 403');

const s0 = await state();
ok(s0.coins === 20 && s0.durability === 100, 'fresh state');

ok((await post({ type: 'dig' })).status === 200, 'dig accepted');
let s = await state();
ok(s.coins === 24 && s.durability === 97 && s.xp === 2, `dig pays 4 coins, wears 3: ${s.coins}/${s.durability}`);
await post({ type: 'dig' });
ok((await state()).coins === 24, 'second dig inside cooldown is ignored');
t += 1600;
await post({ type: 'dig' });
ok((await state()).coins === 28, 'dig after cooldown works');

for (const bad of [{ type: 'earn', coins: 9999, wear: 0 }, { type: 'tick', now: 0 }, { type: 'mood', amount: 100 }, { type: 'nope' }, null, 'x']) {
  const r = await post(bad);
  ok(r.status === 400, 'rejects client action ' + JSON.stringify(bad));
}
ok((await state()).coins === 28, 'cheat attempts did not change coins');

t += 20_000;
const before = (await state()).durability;
await post({ type: 'wear', amount: 9999 });
ok(before - (await state()).durability === 1, 'wear amount forced to 1 by server');

await post({ type: 'rest', amount: 50 });
ok((await state()).durability === before - 1, 'rest ignored while not broken');

await post({ type: 'startJob', site: 'yard' });
const jobId = (await state()).jobs[0].id;
await post({ type: 'claim', jobId });
ok((await state()).jobs[0] !== null, 'early claim ignored (server clock)');
t += 5 * 60_000 + 1000;
await post({ type: 'claim', jobId });
s = await state();
ok(s.jobs.length === 0 && s.reports[0] && s.reports[0].coins >= 10, 'claim after server time elapsed pays: ' + s.reports[0]?.coins);
ok(typeof s.reports[0].coins === 'number' && s.reports[0].coins <= 60, 'coins roll decided by server in range (including jackpot)');

ok((await post({ type: 'rename', name: 'x'.repeat(500) })).status === 200 && (await state()).name.length === 12, 'long name truncated');

const m0 = (await state()).mood;
t += 90_000 * 3;
ok(m0 - (await state()).mood >= 3, `mood decays with server time: ${m0} -> ${(await state()).mood}`);

const big = await fetch(base() + '/dispatch', { method: 'POST', headers: H, body: JSON.stringify({ type: 'rename', name: 'a'.repeat(10000) }) });
ok(big.status === 413, 'oversized body -> 413');
const notJson = await fetch(base() + '/dispatch', { method: 'POST', headers: { ...H, 'Content-Type': 'text/plain' }, body: '{}' });
ok(notJson.status === 415, 'non-json content type -> 415');
ok((await get('/nothing')).status === 404, 'unknown route -> 404');

// SSE
const ctrl = new AbortController();
const sse = await fetch(base() + '/events', { headers: H, signal: ctrl.signal });
const reader = sse.body.getReader();
const dec = new TextDecoder();
const nextEvent = async () => {
  let buf = '';
  while (!buf.includes('\n\n')) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value);
  }
  return JSON.parse(buf.split('data: ')[1]);
};
const first = await nextEvent();
ok(first.coins === (await state()).coins, 'SSE sends current state on connect');
t += 2000;
const pending = nextEvent();
await post({ type: 'poke' });
const pushed = await pending;
ok(pushed.xp === first.xp + 1, 'SSE pushes state after a dispatch');
ctrl.abort();

// admin replace (import / reset)
const adminPost = (body, headers = H) => fetch(base() + '/admin/replace', { method: 'POST', headers, body: JSON.stringify(body) });
ok((await adminPost({ state: null }, { 'Content-Type': 'application/json' })).status === 401, 'admin route requires the token');
const sseCtrl = new AbortController();
const sse2 = await fetch(base() + '/events', { headers: H, signal: sseCtrl.signal });
const rd2 = sse2.body.getReader();
await rd2.read(); // initial state
const pushed2 = rd2.read();
const rep = await adminPost({ state: { coins: 777, name: '匯入的', durability: 55, xp: 40, owned: ['paint_blue', 'nonexistent'], equipped: { paint: 'paint_blue', bucket: 'paint_gold', hat: 'hat_crown' }, evil: 'x' } });
const imported = await rep.json();
ok(rep.status === 200 && imported.coins === 777 && imported.name === '匯入的' && imported.xp === 40, 'import replaces state');
ok(imported.equipped.paint === 'paint_blue' && imported.equipped.bucket === 'bucket_std' && imported.equipped.hat === 'hat_none', 'import drops unowned / mismatched equipment');
ok(!imported.owned.includes('nonexistent') && !('evil' in imported), 'import drops unknown ids and fields');
ok(new TextDecoder().decode((await pushed2).value).includes('"coins":777'), 'import is pushed to connected clients');
ok((await state()).coins === 777, 'import is visible to later reads');
const resetRes = await (await adminPost({ state: null })).json();
ok(resetRes.coins === 20 && resetRes.xp === 0 && resetRes.owned.length > 5 && resetRes.jobs.length === 0, 'reset gives a fresh state');
await post({ type: 'dig' });
t += 1600;
await post({ type: 'dig' });
ok((await state()).coins === 28, 'cooldowns cleared after replace, digging works');
ok((await adminPost({ nostate: 1 })).status === 400, 'admin route rejects bodies without state');
ok((await adminPost({ state: { coins: 'x'.repeat(100000) } })).status === 413, 'admin route enforces its size limit');
ok((await post({ type: 'replace', state: { coins: 99999 } })).status === 400, 'clients cannot replace state through /dispatch');
sseCtrl.abort();
fs.writeFileSync(path.join(dir, 'unused'), '');

// companion days: counted per different day the server runs, not from the clock span
const DAYMS = 86400000;
const sNow = await state();
ok(sNow.since > 0 && sNow.since <= t && sNow.together === 1, 'the server recorded the day you met as day 1');
const sinceKept = sNow.since;
t += 3 * DAYMS;
let sA = await state();
ok(sA.since === sinceKept && sA.together === 2, 'a 3-day clock jump counts as only one more day: ' + sA.together);
t += 3600_000;
ok((await state()).together === 2, 'more requests the same day do not add days');
t -= 5 * DAYMS;
ok((await state()).together === 2, 'turning the clock back adds nothing');
t += 5 * DAYMS + 3600_000;
ok((await state()).together === 2, 'and getting back to an already counted day adds nothing either');
await post({ type: 'ackMilestone' });
ok((await state()).milestone === 0, 'acknowledging early celebrates nothing (day 2 of 7)');
for (let i = 0; i < 5; i++) {
  t += DAYMS;
  await state();
}
const before7 = (await state()).coins;
ok((await state()).together === 7, 'five more real days bring the count to 7');
await post({ type: 'ackMilestone', days: 9999, coins: 99999 });
const after7 = await state();
ok(after7.milestone === 7 && after7.coins === before7 + 30, 'on day 7 the server pays the gift, ignoring what the client claims');
const imp = await (await adminPost({ state: { coins: 5, since: 1700000000000, together: 40, lastDay: '2026-01-01', milestone: 30 } })).json();
ok(imp.since === 1700000000000 && imp.milestone === 30 && imp.together >= 40, 'an imported save keeps its own count and milestone');
const rst = await (await adminPost({ state: null })).json();
ok(rst.together === 1 && rst.milestone === 0 && rst.since === t, 'a reset starts again at day 1');
{
  // a save from before the counter existed: the oldest file in the data folder gives the first day
  const oldDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-old-'));
  fs.writeFileSync(path.join(oldDir, 'state.json'), JSON.stringify({ coins: 77, name: 'old save' }));
  const realNow = Date.now();
  const old = await startServer({ dataDir: oldDir, token: TOKEN, now: () => realNow + 2 * DAYMS });
  const os2 = old.getState();
  ok(os2.coins === 77 && os2.since > realNow - 60_000 && os2.since <= realNow + 1000, 'an older save gets its first day from the oldest file');
  ok(os2.together >= 3 && os2.together <= 4, 'and carries over the calendar days since then: ' + os2.together);
  await old.close();
  fs.rmSync(oldDir, { recursive: true, force: true });
}

// persistence + restart
const saved = await state();
await srv.close();
srv = await startServer({ dataDir: dir, token: TOKEN, now: clock });
const after = await state();
ok(after.coins === saved.coins && after.name === saved.name && after.xp === saved.xp, 'state survives restart');

// corrupt main file -> falls back to backup
await srv.close();
ok(fs.existsSync(path.join(dir, 'state.bak.json')), 'backup file exists');
fs.writeFileSync(path.join(dir, 'state.json'), '{ not json');
srv = await startServer({ dataDir: dir, token: TOKEN, now: clock });
const recovered = await state();
ok(recovered.coins > 0 && recovered.name === saved.name, 'recovers from backup when state.json is corrupt');
await srv.close();

fs.rmSync(dir, { recursive: true, force: true });
