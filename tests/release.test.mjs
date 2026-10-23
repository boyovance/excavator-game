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
  assert.equal(started.jobs[0].rulesVersion, CURRENT_ECONOMY_VERSION);
  assert.equal(started.jobs[0].end - started.jobs[0].start, site.minutes * 60000);
  const finished = reduce(started, { type: 'claim', jobId: started.jobs[0].id, now: started.jobs[0].end });
  assert.equal(finished.durability, 0);
  assert.equal(finished.reports[0].breakdown.xp, site.xp);
  assert.equal(finished.reports[0].breakdown.wear, site.wear);
  assert(finished.coins >= started.coins);
}
console.log('PASS Release economy: every compatible machine/site enforces exact wear boundary and current-version settlement');

const raw = { ...normalize(null), jobs: undefined, durability: 1, job: { site: 'yard', id: 'pre-version', start: 1000, end: 301000, rolls } };
const old = normalize(raw);
assert.equal(old.jobs[0].rulesVersion, 1);
const oldDone = reduce(old, { type: 'claim', jobId: old.jobs[0].id, now: old.jobs[0].end });
assert.equal(oldDone.reports[0].breakdown.base, 20);
assert.equal(oldDone.durability, 1);
assert.deepEqual(economySite('yard', 1).coins, [10, 30]);
assert.deepEqual(economySite('yard').coins, [12, 32]);
assert.equal(economySite('quarry').xp, 75);
console.log('PASS Release migration: missing job version remains original, current lookup uses accepted values');

// Shared durability may change after departure: never create negative durability or re-charge rewards.
const active = reduce(normalize(null), { type: 'startJob', site: 'yard', now: 1000, id: 'wear-during-job', rolls });
const drained = { ...active, durability: 3 };
const paid = reduce(drained, { type: 'claim', jobId: active.jobs[0].id, now: active.jobs[0].end });
assert.equal(paid.durability, 0); assert.equal(paid.reports[0].breakdown.wear, 3);
assert.equal(reduce(paid, { type: 'claim', jobId: active.jobs[0].id, now: active.jobs[0].end }), paid);
assert.deepEqual(normalize(JSON.parse(JSON.stringify(active))).jobs[0], active.jobs[0]);
console.log('PASS Release v2: intervening wear, zero floor, reload and idempotent payout');
