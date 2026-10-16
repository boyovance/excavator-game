import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalize, reduce } from '../src/shared/reducer.mjs';
import { SITES, PARTS, partById } from '../src/shared/parts.mjs';
import { economySites, economySite, duplicateRefund } from '../src/shared/economy.mjs';
import { sampleSite, comparison, firstPurchase, machineWait, targetMachineTime, maintenanceRun, scenario, seededRandom, simulateTrip } from '../src/shared/balance.mjs';
import { startServer } from '../server/index.mjs';
const test = (name, fn) => { fn(); console.log('PASS ' + name); };
const base = normalize(null);
const begin = (s = base, version = 1) => reduce(s, { type: 'startJob', site: 'yard', id: 'balance-test', now: 1000, rolls: Array(11).fill(0.5) }, version);
const finish = (s, version = 1) => reduce(s, { type: 'claim', jobId: s.job.id, now: s.job.end }, version);
test('original tables, ordinary departure and refund defaults remain unchanged', () => {
  assert.equal(economySites(), SITES);
  assert.deepEqual(economySite('yard').coins, [10, 30]);
  assert.deepEqual(economySite('yard', 2).coins, [12, 32]);
  assert.equal(begin().job.rulesVersion, 1);
  assert.equal(finish(begin()).report.breakdown.base, 20);
  assert.equal(duplicateRefund('acc_beacon'), 25);
  assert.equal(duplicateRefund('acc_beacon', 2), 12);
});
test('candidate is opt-in trusted context, not a client action property', () => {
  const a = reduce(base, { type: 'startJob', site: 'yard', now: 1000, rulesVersion: 2, previewVersion: 2 });
  assert.equal(a.job.rulesVersion, 1);
  assert.equal(begin(base, 99).job.rulesVersion, 1);
  assert.equal(begin(base, 2).job.rulesVersion, 2);
});
test('version captured at departure survives reload and opposite settlement context', () => {
  for (const version of [1, 2]) {
    const s = begin(base, version);
    const saved = normalize(JSON.parse(JSON.stringify(s)));
    assert.deepEqual(saved.job, s.job);
    assert.deepEqual(finish(saved, version === 1 ? 2 : 1).report, finish(s, version).report);
  }
  const s = begin();
  assert.equal(normalize({ ...s, job: { ...s.job, rulesVersion: undefined } }).job.rulesVersion, 1);
  assert.equal(normalize({ ...s, job: { ...s.job, rulesVersion: 99 } }).job.rulesVersion, 1);
});
test('candidate departure requires full wear budget and can reach zero; original keeps one', () => {
  const low = { ...base, durability: 7 };
  assert.equal(begin(low, 2), low);
  assert(begin(low, 1).job);
  assert.equal(finish(begin({ ...base, durability: 8 }, 2)).durability, 0);
  assert.equal(finish(begin({ ...base, durability: 1 }, 1)).durability, 1);
  assert.equal(maintenanceRun(1).completed, 20);
  assert.equal(maintenanceRun(2).completed, 12);
});
test('candidate refunds are capped and all per-trip accounting adds up without double claims', () => {
  for (const p of PARTS) assert(duplicateRefund(p.id, 2) >= 5 && duplicateRefund(p.id, 2) <= 25);
  for (const version of [1, 2]) {
    const s = begin(scenario('m_std', 'all', 'full'), version); const done = finish(s);
    const b = done.report.breakdown;
    assert.equal(b.base + b.jackpotBonus + b.equipmentBonus + b.duplicates, done.report.coins);
    assert.equal(done.coins - s.coins, done.report.coins);
    assert.equal(reduce(done, { type: 'claim', jobId: s.job.id, now: s.job.end }), done);
  }
});
test('fixed seed simulation is repeatable, does not mutate tables and full collection has no new drops', () => {
  const original = JSON.stringify({ SITES, PARTS });
  const options = { siteId: 'yard', samples: 200, seed: 42, version: 2, collection: 'full' };
  const a = sampleSite(options);
  assert.deepEqual(a, sampleSite(options));
  assert.notDeepEqual(a, sampleSite({ ...options, seed: 43 }));
  assert.equal(a.hourly.newParts, 0); assert.equal(a.hourly.machines, 0);
  assert.equal(a.mean.base + a.mean.jackpotBonus + a.mean.equipmentBonus + a.mean.duplicates - a.mean.repair, a.mean.net);
  assert.equal(JSON.stringify({ SITES, PARTS }), original);
  assert.throws(() => sampleSite({ siteId: 'yard', samples: 0 }));
  assert.equal(sampleSite({ machine: 'm_mini', siteId: 'mine' }), null);
});
test('scenario equipment is owned and compatible and comparison pairs same sites/dice', () => {
  for (const m of PARTS.filter((p) => p.machine)) for (const loadout of ['stock', 'shop', 'all']) {
    const s = scenario(m.id, loadout, 'starter');
    assert(Object.values(s.equipped).every((id) => s.owned.includes(id)));
    for (const id of Object.values(s.equipped)) assert(!partById(id).fits || partById(id).fits.includes(m.id));
  }
  const [a, b] = comparison({ samples: 100 });
  assert.deepEqual(a.map((r) => r.siteId), b.map((r) => r.siteId));
  assert.deepEqual(a.map((r) => r.hourly.parts), b.map((r) => r.hourly.parts));
});
test('starter route and target-machine quantiles use real accumulated state and reproduce', () => {
  const a = firstPurchase({ version: 2, samples: 60 });
  assert.equal(a.failures, 0); assert(a.p50Minutes >= 20 && a.p50Minutes <= 35);
  assert(a.p90Minutes >= a.p50Minutes); assert.deepEqual(a, firstPurchase({ version: 2, samples: 60 }));
  const opts = { siteId: 'mine', machine: 'm_std', target: 'm_mining', samples: 40 };
  const target = targetMachineTime(opts);
  assert.equal(target.censored, 0); assert(target.p90Hours >= target.p50Hours);
  assert.deepEqual(target, targetMachineTime(opts));
  const candidate = targetMachineTime({ ...opts, version: 2 });
  assert.equal(candidate.p50Hours, target.p50Hours); assert.equal(candidate.p90Hours, target.p90Hours);
  assert.equal(machineWait('rail', 'm_rail'), null);
});
test('zero-coin zero-durability candidate can recover and earn without negative money', () => {
  let s = { ...base, coins: 0, durability: 0 }; const random = seededRandom();
  for (let trip = 0; trip < 100; trip++) {
    while (s.durability < 15) s = reduce(s, { type: 'rest', amount: 1 });
    const result = simulateTrip(s, 'yard', 2, random);
    assert(result.accepted); s = result.state;
    if (s.coins >= 150 && !s.owned.includes('m_mini')) s = reduce(s, { type: 'buy', id: 'm_mini' });
    s = reduce(s, { type: 'repair' });
    assert(s.coins >= 0 && s.durability >= 0 && s.durability <= 100);
  }
  assert(s.owned.includes('m_mini'));
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-balance-service-'));
let server;
try {
  server = await startServer({ dataDir: dir, token: 'balance-test' });
  const request = (action) => fetch(`http://127.0.0.1:${server.port}/dispatch`, { method: 'POST', headers: { Authorization: 'Bearer balance-test', 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
  assert.equal((await request({ type: 'startJob', site: 'yard', rulesVersion: 2, previewVersion: 2 })).status, 200);
  assert.equal(server.getState().job.rulesVersion, 1);
  console.log('PASS ordinary server ignores forged preview version and retains production rules');
} finally { await server?.close(); fs.rmSync(dir, { recursive: true, force: true }); }
