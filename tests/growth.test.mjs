import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalize, reduce } from '../src/shared/reducer.mjs';
import { GROWTH_STAGES, LEGACY_SITES, canVisitSite, siteUnlocked, xpForLevel } from '../src/shared/growth.mjs';
import { SITES, partById, siteById } from '../src/shared/parts.mjs';
import { partSources } from '../src/shared/catalog.mjs';
import { startServer } from '../server/index.mjs';
const test = (name, fn) => { fn(); console.log('PASS ' + name); };
const base = normalize(null);
test('fresh profile opens only yard and reset has no legacy rights', () => {
  assert.equal(base.schemaVersion, 3);
  assert.deepEqual(base.growthClaimed, []); assert.deepEqual(base.legacySites, []);
  assert.deepEqual(SITES.filter((s) => siteUnlocked(base, s.id)).map((s) => s.id), ['yard']);
  assert.equal(siteUnlocked(base, 'invalid'), false);
  assert.deepEqual(normalize({}).legacySites, []);
});
for (const g of GROWTH_STAGES) test(`${g.id}: boundary, one-time reward and automatic unlock independent of claiming`, () => {
  const before = { ...base, xp: xpForLevel(g.level) - 1 };
  const after = reduce(before, { type: 'poke' });
  for (const id of g.sites) {
    assert.equal(siteUnlocked(before, id), false);
    assert.equal(siteUnlocked(after, id), true);
  }
  assert.equal(reduce(before, { type: 'claimGrowth', id: g.id }), before);
  const claimed = reduce(after, { type: 'claimGrowth', id: g.id, coins: 999999, xp: 999999 });
  assert.equal(claimed.coins, after.coins + g.coins);
  assert.equal(claimed.xp, after.xp);
  assert.equal(reduce(claimed, { type: 'claimGrowth', id: g.id }), claimed);
});
test('unlock and machine restrictions apply together, invalid IDs cannot grant rewards', () => {
  const high = { ...base, xp: 500 };
  assert(canVisitSite(high, siteById('mine')));
  assert(!canVisitSite(high, siteById('alley')));
  assert.equal(reduce(base, { type: 'startJob', site: 'mine', now: 1 }), base);
  assert(reduce(high, { type: 'startJob', site: 'mine', now: 1 }).job);
  assert.equal(reduce(high, { type: 'claimGrowth', id: 'invalid' }), high);
});
test('multiple levels can be claimed independently and remain claimed after normalization', () => {
  let s = { ...base, xp: 900 };
  for (const g of [...GROWTH_STAGES].reverse()) s = reduce(s, { type: 'claimGrowth', id: g.id });
  assert.equal(s.coins, base.coins + 200);
  const saved = normalize(s);
  assert.deepEqual(saved.growthClaimed, s.growthClaimed);
  for (const g of GROWTH_STAGES) assert.equal(reduce(saved, { type: 'claimGrowth', id: g.id }), saved);
});
test('legacy migration preserves inventory, loadouts, active snapshots and access but not free rewards', () => {
  const old = reduce(normalize({ schemaVersion: 2, xp: 0, coins: 123, owned: ['stick_long'], equipped: { stick: 'stick_long' } }), { type: 'startJob', site: 'mine', now: 1000 });
  const migrated = normalize({ ...old, schemaVersion: 2 });
  assert.deepEqual(migrated.legacySites, LEGACY_SITES);
  assert.deepEqual(migrated.owned, old.owned); assert.deepEqual(migrated.equipped, old.equipped);
  assert.deepEqual(migrated.job, old.job); assert.equal(migrated.coins, old.coins);
  assert.deepEqual(normalize(migrated), migrated);
  assert.equal(reduce(migrated, { type: 'claimGrowth', id: 'level-2' }), migrated);
  const finished = reduce(migrated, { type: 'claim', jobId: migrated.job.id, now: migrated.job.end });
  assert.equal(finished.job, null); assert.equal(finished.xp, 300);
  assert.equal(normalize({ xp: 0 }).legacySites.length, LEGACY_SITES.length);
});
test('new version fields are deduplicated and unknown or malformed IDs discarded', () => {
  const s = normalize({ ...base, growthClaimed: ['level-2', 'level-2', 'bad', null], legacySites: ['mine', 'mine', 'future', {}] });
  assert.deepEqual(s.growthClaimed, ['level-2']); assert.deepEqual(s.legacySites, ['mine']);
  assert.deepEqual(normalize({ ...base, growthClaimed: {}, legacySites: 'mine' }).legacySites, []);
});
test('catalog source availability matches level restrictions and preserved legacy permissions', () => {
  const source = (s) => partSources(partById('acc_gps'), 'm_std', s).find((p) => p.id === 'mine');
  assert.equal(source(base).available, false); assert.match(source(base).note, /Lv.6/);
  assert.equal(source({ ...base, xp: 500 }).available, true);
  assert.equal(source(normalize({ schemaVersion: 2, xp: 0 })).available, true);
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-growth-'));
const file = path.join(dir, 'state.json');
const headers = { Authorization: 'Bearer growth-test', 'Content-Type': 'application/json' };
let server;
const boot = async () => { server = await startServer({ dataDir: dir, token: 'growth-test', now: () => 2_000_000, onSaveError() {} }); };
const request = (body, route = '/dispatch') => fetch(`http://127.0.0.1:${server.port}${route}`, { method: 'POST', headers, body: JSON.stringify(body) });
try {
  await boot();
  assert.equal((await request({ type: 'claimGrowth' })).status, 400);
  assert.equal((await request({ type: 'claimGrowth', id: {} })).status, 400);
  assert.equal((await request({ type: 'claimGrowth', id: 'level-2', xp: 9999, coins: 9999 })).status, 409);
  assert.equal((await request({ type: 'startJob', site: 'mine', xp: 9999, legacySites: ['mine'] })).status, 409);
  assert.equal((await request({ type: 'claimGrowth', id: 'invalid' })).status, 409);
  console.log('PASS growth server rejects missing/forged rewards, experience and unlock rights');
  await request({ state: { ...base, xp: 80 } }, '/admin/replace');
  fs.mkdirSync(`${file}.tmp`);
  assert.equal((await request({ type: 'claimGrowth', id: 'level-2' })).status, 503);
  assert.equal(server.getState().coins, base.coins); assert.deepEqual(server.getState().growthClaimed, []);
  fs.rmdirSync(`${file}.tmp`);
  assert.equal((await request({ type: 'claimGrowth', id: 'level-2', coins: 9999 })).status, 200);
  const disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(disk.coins, base.coins + 20); assert.deepEqual(disk.growthClaimed, ['level-2']);
  console.log('PASS growth failed save changes neither coins nor marker; retry commits both before success');
  const responses = await Promise.all(Array.from({ length: 5 }, () => request({ type: 'claimGrowth', id: 'level-2' })));
  assert(responses.every((r) => r.status === 200));
  await server.close(); await boot();
  await request({ type: 'claimGrowth', id: 'level-2' });
  assert.equal(server.getState().coins, base.coins + 20);
  await request({ type: 'claimGrowth', id: 'level-3' });
  assert.equal(server.getState().coins, base.coins + 50);
  console.log('PASS growth concurrent retries, restart and independent stage claims pay once');
} finally {
  if (fs.existsSync(`${file}.tmp`) && fs.statSync(`${file}.tmp`).isDirectory()) fs.rmdirSync(`${file}.tmp`);
  await server?.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
