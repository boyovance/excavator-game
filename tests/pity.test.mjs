import assert from 'node:assert/strict';
import { normalize, reduce } from '../src/shared/reducer.mjs';
import { SITES } from '../src/shared/parts.mjs';
import { pityLimit, pityProgress } from '../src/shared/pity.mjs';

const test = (name, fn) => { fn(); console.log('PASS ' + name); };
const MISS = [0.5, 0.5, 0.99, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0];
const HIT = MISS.map((r, i) => i === 9 ? 0 : r);
const base = normalize({ schemaVersion: 4, xp: 5000, coins: 100000 });
let n = 0;
function trip(state, site, rolls = MISS, version) {
  const started = reduce({ ...state, durability: 100 }, { type: 'startJob', site, now: 1000, id: `pity-${n++}`, rolls }, version);
  assert.ok(started.job, `job started at ${site}`);
  return reduce(started, { type: 'claim', jobId: started.job.id, now: started.job.end });
}
const machineDrops = (s) => s.report.drops.filter((d) => d.id.startsWith('m_'));

test('limit is the average number of tries per site', () => {
  assert.deepEqual(Object.fromEntries(SITES.map((s) => [s.id, pityLimit(s)])),
    { yard: 34, alley: 17, quarry: 15, scrap: 13, river: 10, slope: 10, rail: 0, mine: 9 });
});

test('N-1 misses count up, the Nth job is guaranteed and resets the counter', () => {
  let s = base;
  for (let i = 1; i <= 8; i++) {
    s = trip(s, 'mine');
    assert.equal(s.machinePity.mine, i);
    assert.deepEqual(machineDrops(s), []);
    assert.deepEqual(s.report.pity, { count: i, limit: 9 });
  }
  assert.deepEqual(pityProgress(s, 'mine'), { count: 8, limit: 9, guaranteed: true });
  s = trip(s, 'mine');
  const [drop] = machineDrops(s);
  assert.equal(drop.pity, true);
  // rolls[10] = 0 picks the first unowned machine by weight, exactly as a natural drop would
  assert.equal(drop.id, 'm_mining');
  assert.ok(s.owned.includes('m_mining'));
  assert.equal(s.machinePity.mine, undefined);
  assert.equal(s.report.pity, undefined);
  assert.deepEqual(pityProgress(s, 'mine'), { count: 0, limit: 9, guaranteed: false });
});

test('a natural drop resets the counter without the pity mark', () => {
  let s = trip(trip(base, 'mine'), 'mine');
  assert.equal(s.machinePity.mine, 2);
  s = trip(s, 'mine', HIT);
  const [drop] = machineDrops(s);
  assert.ok(drop && !drop.pity);
  assert.equal(s.machinePity.mine, undefined);
});

test('sites count independently', () => {
  let s = trip(trip(base, 'mine'), 'yard');
  assert.deepEqual(s.machinePity, { mine: 1, yard: 1 });
  s = trip(s, 'mine', HIT);
  assert.deepEqual(s.machinePity, { yard: 1 });
});

test('a site with every machine owned neither counts nor shows progress', () => {
  const s = normalize({ ...base, owned: [...base.owned, 'm_mining', 'm_demo'] });
  assert.equal(pityProgress(s, 'mine'), null);
  const after = trip(s, 'mine');
  assert.deepEqual(after.machinePity, {});
  assert.equal(after.report.pity, undefined);
  assert.equal(pityProgress(base, 'rail'), null);
});

test('rules 1 and 2 jobs keep their old settlement and never touch the counter', () => {
  const primed = { ...base, machinePity: { mine: 8 } };
  for (const version of [1, 2]) {
    const s = trip(primed, 'mine', MISS, version);
    assert.equal(s.report.drops.some((d) => d.id.startsWith('m_')), false);
    assert.deepEqual(s.machinePity, { mine: 8 });
    assert.equal(s.report.pity, undefined);
    assert.equal(normalize(JSON.parse(JSON.stringify(reduce(primed, { type: 'startJob', site: 'mine', now: 1, id: 'v', rolls: MISS }, version)))).job.pity, undefined);
  }
});

test('progress is captured at departure; reload and retry cannot reroll or double count', () => {
  const primed = { ...base, machinePity: { mine: 8 } };
  const started = reduce(primed, { type: 'startJob', site: 'mine', now: 1000, id: 'fixed', rolls: MISS });
  assert.equal(started.job.pity, 8);
  const reloaded = normalize(JSON.parse(JSON.stringify(started)));
  assert.deepEqual(reloaded.job, started.job);
  const claim = { type: 'claim', jobId: 'fixed', now: started.job.end };
  const a = reduce(started, claim);
  const b = reduce(reloaded, claim);
  assert.deepEqual(b.report, a.report);
  assert.deepEqual(b.machinePity, a.machinePity);
  assert.equal(reduce(a, claim), a);
  assert.equal(machineDrops(a)[0].pity, true);
});

test('old saves start at zero and bad values are cleaned', () => {
  assert.deepEqual(normalize({ schemaVersion: 3, xp: 10 }).machinePity, {});
  assert.equal(normalize({ schemaVersion: 3 }).schemaVersion, 4);
  assert.deepEqual(normalize({ machinePity: { mine: 50, yard: -3, river: 'x', rail: 4, nowhere: 2, quarry: 2.7 } }).machinePity, { mine: 8, quarry: 2 });
  assert.deepEqual(normalize({ machinePity: [1, 2] }).machinePity, {});
  const job = normalize({ ...base, job: { site: 'mine', id: 'j', start: 1, end: 2, rulesVersion: 3, pity: 99 } }).job;
  assert.equal(job.pity, 8);
  const report = normalize({ ...base, report: { site: 'mine', coins: 1, at: 1, drops: [{ id: 'm_mining', dup: false, pity: true }, { id: 'acc_gps', dup: false, pity: true }], pity: { count: 77 } } }).report;
  assert.deepEqual(report.drops, [{ id: 'm_mining', dup: false, pity: true }, { id: 'acc_gps', dup: false }]);
  assert.deepEqual(report.pity, { count: 8, limit: 9 });
  assert.equal(normalize({ ...base, report: { site: 'rail', coins: 1, at: 1, drops: [], pity: { count: 1 } } }).report.pity, undefined);
});

test('export and restore keep the counter', () => {
  const s = trip(trip(base, 'river'), 'river');
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(s))).machinePity, { river: 2 });
});

test('catalog sources state the guarantee for drop-only machines', async () => {
  const { partSources } = await import('../src/shared/catalog.mjs');
  const { partById } = await import('../src/shared/parts.mjs');
  const notes = partSources(partById('m_mining'), 'm_std', base).filter((s) => s.kind === 'site').map((s) => s.note);
  assert.ok(notes.length && notes.every((n) => n.includes('連續 9 趟未帶回必得一台')), notes.join(' | '));
});
