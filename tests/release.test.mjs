import assert from 'node:assert/strict';
import { normalize, reduce } from '../src/shared/reducer.mjs';
import { economySites, economySite, CURRENT_ECONOMY_VERSION } from '../src/shared/economy.mjs';
import { PARTS, siteOpenTo } from '../src/shared/parts.mjs';
import { scenario } from '../src/shared/balance.mjs';

const rolls = [0.5, 0.5, 0.99, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0];
assert.equal(CURRENT_ECONOMY_VERSION, 4);
for (const m of PARTS.filter((p) => p.machine)) for (const site of economySites().filter((s) => siteOpenTo(s, m.id))) {
  const s = { ...scenario(m.id), durability: site.wear - 1 };
  const action = { type: 'startJob', site: site.id, now: 1000, id: 'release-boundary', rolls, rulesVersion: 1 };
  assert.equal(reduce(s, action), s);
  const started = reduce({ ...s, durability: site.wear }, action);
  assert.equal(started.job.rulesVersion, CURRENT_ECONOMY_VERSION);
  assert.equal(started.job.end - started.job.start, site.minutes * 60000);
  const finished = reduce(started, { type: 'claim', jobId: started.job.id, now: started.job.end });
  assert.equal(finished.durability, 0);
  assert.equal(finished.report.breakdown.xp, site.xp);
  assert.equal(finished.report.breakdown.wear, site.wear);
  assert(finished.coins >= started.coins);
}
console.log('PASS Release economy: every compatible machine/site enforces exact wear boundary and current-version settlement');

const raw = { ...normalize(null), durability: 1, job: { site: 'yard', id: 'pre-version', start: 1000, end: 301000, rolls } };
const old = normalize(raw);
assert.equal(old.job.rulesVersion, 1);
const oldDone = reduce(old, { type: 'claim', jobId: old.job.id, now: old.job.end });
assert.equal(oldDone.report.breakdown.base, 20);
assert.equal(oldDone.durability, 1);
assert.deepEqual(economySite('yard', 1).coins, [10, 30]);
assert.deepEqual(economySite('yard').coins, [12, 32]);
assert.equal(economySite('quarry').xp, 75);
console.log('PASS Release migration: missing job version remains original, current lookup uses accepted values');

// Shared durability may change after departure: never create negative durability or re-charge rewards.
const active = reduce(normalize(null), { type: 'startJob', site: 'yard', now: 1000, id: 'wear-during-job', rolls });
const drained = { ...active, durability: 3 };
const paid = reduce(drained, { type: 'claim', jobId: active.job.id, now: active.job.end });
assert.equal(paid.durability, 0); assert.equal(paid.report.breakdown.wear, 3);
assert.equal(reduce(paid, { type: 'claim', jobId: active.job.id, now: active.job.end }), paid);
assert.deepEqual(normalize(JSON.parse(JSON.stringify(active))).job, active.job);
console.log('PASS Release v2: intervening wear, zero floor, reload and idempotent payout');
