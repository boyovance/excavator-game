import assert from 'node:assert/strict';
import { normalize, reduce } from '../src/shared/reducer.mjs';
import { PARTS } from '../src/shared/parts.mjs';
import { duplicateRefund, refundRule, CURRENT_ECONOMY_VERSION } from '../src/shared/economy.mjs';

const test = async (name, fn) => { await fn(); console.log('PASS ' + name); };
// two part drops, no jackpot, no machine
const ROLLS = [0.5, 0.5, 0.99, 0, 0.3, 0, 0.7, 0.99, 0, 0.99, 0];
const everything = normalize({ schemaVersion: 4, xp: 5000, coins: 1000, owned: PARTS.map((p) => p.id) });
function claimAt(site, version, state = everything) {
  const started = reduce(state, { type: 'startJob', site, now: 1000, id: `r-${site}-${version}`, rolls: ROLLS }, version);
  return reduce(started, { type: 'claim', jobId: started.jobs[0].id, now: started.jobs[0].end });
}

await test('only the scrap yard recycles at 50% (10-50) from rules 4 on', () => {
  assert.equal(CURRENT_ECONOMY_VERSION, 4);
  assert.deepEqual(refundRule('scrap', 4), { rate: 0.5, min: 10, max: 50, recycling: true });
  for (const site of ['yard', 'alley', 'quarry', 'river', 'slope', 'rail', 'mine']) assert.deepEqual(refundRule(site, 4), { rate: 0.25, min: 5, max: 25 });
  assert.deepEqual(refundRule('scrap', 3), { rate: 0.25, min: 5, max: 25 });
  assert.deepEqual(refundRule('scrap', 2), { rate: 0.25, min: 5, max: 25 });
  assert.equal(refundRule('scrap', 1).max, Infinity);
  for (const p of PARTS) {
    const r = duplicateRefund(p.id, 4, 'scrap');
    assert.ok(r >= 10 && r <= 50, `${p.id}: ${r}`);
    assert.ok(r >= duplicateRefund(p.id, 4, 'quarry'));
  }
  assert.equal(duplicateRefund('acc_beacon', 4, 'scrap'), 25);
  assert.equal(duplicateRefund('acc_beacon', 4, 'quarry'), 12);
});

await test('a rules 4 scrap job pays the higher refund for every duplicate', () => {
  const now = claimAt('scrap', 4);
  const before = claimAt('scrap', 3);
  assert.equal(now.reports[0].drops.length, 2);
  assert.ok(now.reports[0].drops.every((d) => d.dup && d.coins === duplicateRefund(d.id, 4, 'scrap')));
  assert.deepEqual(now.reports[0].drops.map((d) => d.id), before.reports[0].drops.map((d) => d.id));
  assert.equal(now.reports[0].breakdown.duplicates, now.reports[0].drops.reduce((n, d) => n + d.coins, 0));
  assert.ok(now.reports[0].breakdown.duplicates > before.reports[0].breakdown.duplicates);
  assert.equal(now.coins - before.coins, now.reports[0].breakdown.duplicates - before.reports[0].breakdown.duplicates);
  assert.equal(now.reports[0].breakdown.base, before.reports[0].breakdown.base);
  assert.equal(now.xp, before.xp);
});

await test('other sites keep the standard refund under rules 4', () => {
  const quarry = claimAt('quarry', 4);
  assert.ok(quarry.reports[0].drops.every((d) => d.coins === duplicateRefund(d.id, 4, 'quarry')));
});

await test('a scrap job that left under rules 3 still settles at 25% after the upgrade', () => {
  const started = reduce(everything, { type: 'startJob', site: 'scrap', now: 1000, id: 'old-scrap', rolls: ROLLS }, 3);
  const reloaded = normalize(JSON.parse(JSON.stringify(started)));
  assert.equal(reloaded.jobs[0].rulesVersion, 3);
  const done = reduce(reloaded, { type: 'claim', jobId: 'old-scrap', now: reloaded.jobs[0].end });
  assert.ok(done.reports[0].drops.every((d) => d.coins === duplicateRefund(d.id, 3, 'scrap')));
});

await test('check-in dominance separates real gaps from short/long trade-offs', async () => {
  const { checkInDominance, checkInRates } = await import('../src/shared/balance.mjs');
  const row = (siteId, minutes, net, xp, parts = 1, machines = 0) => ({ siteId, minutes, mean: { net, parts, machines }, hourly: { xp: xp * 60 / minutes } });
  const short = row('short', 5, 30, 12);
  const long = row('long', 120, 600, 240);
  const twin = row('twin', 120, 550, 220);
  assert.equal(checkInRates(short, 0).net, 360);
  assert.equal(checkInRates(short, 60).net, 30);
  assert.equal(checkInRates(long, 60).net, 300);
  const { perInterval, always } = checkInDominance([short, long, twin]);
  assert.ok(perInterval[0].pairs.some((p) => p.better === 'short' && p.worse === 'long'));
  assert.ok(perInterval.at(-1).pairs.some((p) => p.better === 'long' && p.worse === 'short'));
  assert.deepEqual(always.map((p) => `${p.better}>${p.worse}`), ['long>twin']);
});
