import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalize, reduce } from '../src/shared/reducer.mjs';
import { MAX_REPORTS, SLOT_PRICE, desktopJob, reservedWear } from '../src/shared/jobs.mjs';
import { dispatchGrowth } from '../src/shared/growth.mjs';
import { startServer } from '../server/index.mjs';

const test = async (name, fn) => { await fn(); console.log('PASS ' + name); };
const MISS = [0.5, 0.5, 0.99, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0];
// standard machine on the desktop, a mini machine waiting in the garage with a remembered long stick
const base = normalize({ schemaVersion: 5, xp: 5000, coins: 5000, owned: ['m_mini', 'm_wheeled', 'stick_mini_tele'],
  loadouts: { m_mini: { stick: 'stick_mini_tele' } } });
const two = reduce(base, { type: 'buySlot' });
let n = 0;
const start = (state, site, machine, now = 1000) => reduce(state, { type: 'startJob', site, machine, now, id: `slot-${n++}`, rolls: MISS });

await test('the second slot costs 1000 coins once; saves clamp the slot count', () => {
  assert.equal(base.jobSlots, 1);
  assert.equal(two.jobSlots, 2);
  assert.equal(two.coins, base.coins - SLOT_PRICE);
  assert.equal(reduce(two, { type: 'buySlot' }), two);
  const poor = { ...base, coins: SLOT_PRICE - 1 };
  assert.equal(reduce(poor, { type: 'buySlot' }), poor);
  assert.equal(normalize({ jobSlots: 9 }).jobSlots, 2);
  assert.equal(normalize({ jobSlots: 'x' }).jobSlots, 1);
  assert.equal(normalize({}).jobSlots, 1);
});

await test('one slot allows one job; two slots allow two different machines at two sites', () => {
  const one = start(base, 'quarry', 'm_std');
  assert.equal(one.jobs.length, 1);
  assert.equal(start(one, 'yard', 'm_mini'), one, 'no free slot');
  const a = start(two, 'quarry', 'm_std');
  const b = start(a, 'yard', 'm_mini');
  assert.deepEqual(b.jobs.map((j) => [j.site, j.machineId]), [['quarry', 'm_std'], ['yard', 'm_mini']]);
  assert.equal(start(b, 'river', 'm_wheeled'), b, 'both slots in use');
});

await test('a machine and a site can each hold only one job; unowned or unfit machines cannot leave', () => {
  const a = start(two, 'yard', 'm_std');
  assert.equal(start(a, 'quarry', 'm_std'), a, 'machine already out');
  assert.equal(start(a, 'yard', 'm_mini'), a, 'site already busy');
  assert.equal(start(two, 'yard', 'm_mining'), two, 'not owned');
  assert.equal(start(two, 'quarry', 'm_mini'), two, 'mini cannot work the quarry');
  assert.equal(start(two, 'yard', 'acc_beacon'), two, 'not a machine');
});

await test('durability is shared: wear of jobs still out is set aside before departure', () => {
  const tight = { ...two, durability: 20 };
  const a = start(tight, 'quarry', 'm_std');
  assert.equal(reservedWear(a), 18);
  assert.equal(start(a, 'yard', 'm_mini'), a, '20 - 18 reserved < 8');
  const enough = start({ ...two, durability: 26 }, 'quarry', 'm_std');
  assert.equal(start(enough, 'yard', 'm_mini').jobs.length, 2);
});

await test('a garage machine leaves with its remembered parts and does not move the desktop', () => {
  const a = start(two, 'yard', 'm_mini');
  const [job] = a.jobs;
  assert.equal(job.machineId, 'm_mini');
  assert.equal(job.equippedSnapshot.stick, 'stick_mini_tele');
  assert.equal(job.desktop, false);
  assert.deepEqual(a.equipped, two.equipped);
  assert.equal(desktopJob(a), null);
  const b = start(a, 'quarry', 'm_std');
  assert.equal(desktopJob(b).machineId, 'm_std');
});

await test('only one job runs with the desktop pet, even after switching the desktop machine', () => {
  const a = start(two, 'quarry', 'm_std');
  const switched = reduce(a, { type: 'equip', id: 'm_mini' });
  assert.equal(desktopJob(switched).id, a.jobs[0].id, 'the pet keeps working the job it left with');
  const b = start(switched, 'yard', 'm_mini');
  assert.equal(b.jobs[1].desktop, false);
});

await test('jobs are claimed and recalled by id; results keep the newest first', () => {
  const both = start(start(two, 'quarry', 'm_std', 1000), 'yard', 'm_mini', 2000);
  const [quarry, yard] = both.jobs;
  assert.equal(reduce(both, { type: 'claim', jobId: quarry.id, now: yard.end }), both, 'quarry not finished yet');
  const afterYard = reduce(both, { type: 'claim', jobId: yard.id, now: yard.end });
  assert.deepEqual(afterYard.jobs.map((j) => j.id), [quarry.id]);
  assert.equal(afterYard.reports[0].jobId, yard.id);
  assert.equal(afterYard.reports[0].desktop, false);
  const afterBoth = reduce(afterYard, { type: 'claim', jobId: quarry.id, now: quarry.end });
  assert.deepEqual(afterBoth.reports.map((r) => r.jobId), [quarry.id, yard.id]);
  assert.equal(reduce(afterBoth, { type: 'claim', jobId: quarry.id, now: quarry.end }), afterBoth, 'no second payout');
  const recalled = reduce(both, { type: 'cancelJob', jobId: quarry.id, now: 1500 });
  assert.deepEqual(recalled.jobs.map((j) => j.id), [yard.id]);
  assert.equal(recalled.reports, both.reports);
  // without an id the earliest finished job is claimed
  assert.equal(reduce(both, { type: 'claim', now: quarry.end }).reports[0].jobId, yard.id);
  let many = afterBoth;
  for (let i = 0; i < 3; i++) { const s = start(many, 'yard', 'm_mini', 10_000 * (i + 1)); many = reduce(s, { type: 'claim', jobId: s.jobs[0].id, now: s.jobs[0].end }); }
  assert.equal(many.reports.length, MAX_REPORTS);
  assert.equal(reduce(many, { type: 'ackReport' }).reports.every((r) => r.seen), true);
});

await test('guarantee counters and growth results stay per job with two jobs out', () => {
  const both = start(start(two, 'scrap', 'm_std', 1000), 'yard', 'm_mini', 1000);
  const [scrap, yard] = both.jobs;
  const done = reduce(reduce(both, { type: 'claim', jobId: yard.id, now: scrap.end }), { type: 'claim', jobId: scrap.id, now: scrap.end });
  assert.deepEqual(done.machinePity, { yard: 1, scrap: 1 });
  const low = start(start({ ...two, xp: 68 }, 'yard', 'm_std'), 'alley', 'm_mini');
  const after = reduce(low, { type: 'claim', jobId: low.jobs[1].id, now: low.jobs[1].end });
  assert.equal(dispatchGrowth(low, after, low.jobs[1].id).to, 3);
  assert.equal(dispatchGrowth(low, after, low.jobs[0].id), null);
});

await test('old saves: the single job and report move into the lists; duplicates are dropped', () => {
  const old = normalize({ schemaVersion: 4, owned: ['m_mini'], job: { id: 'old', site: 'yard', start: 1, end: 2, rulesVersion: 4 },
    report: { site: 'yard', coins: 5, at: 1, drops: [], jobId: 'older' } });
  assert.equal(old.schemaVersion, 5);
  assert.deepEqual(old.jobs.map((j) => [j.id, j.desktop]), [['old', true]]);
  assert.deepEqual(old.reports.map((r) => [r.jobId, r.desktop]), [['older', true]]);
  const job = (id, site, machine, desktop) => ({ id, site, start: 1, end: 2, rulesVersion: 4, desktop, equippedSnapshot: { machine } });
  const messy = normalize({ jobSlots: 2, owned: ['m_mini'], jobs: [job('a', 'yard', 'm_std', true), job('b', 'yard', 'm_mini', true), job('c', 'alley', 'm_std'), job('a', 'alley', 'm_mini'), job('d', 'alley', 'm_mini', true)] });
  assert.deepEqual(messy.jobs.map((j) => [j.id, j.desktop]), [['a', true], ['d', false]]);
  const exported = normalize(JSON.parse(JSON.stringify(start(start(two, 'quarry', 'm_std'), 'yard', 'm_mini'))));
  assert.equal(exported.jobs.length, 2);
  assert.equal(exported.jobSlots, 2);
});

await test('local service: machine choice, slot purchase and per-job idempotent claims', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-slots-'));
  let t = 1_000_000;
  const server = await startServer({ dataDir: dir, token: 'slots', now: () => t });
  try {
    const H = { Authorization: 'Bearer slots', 'Content-Type': 'application/json' };
    const post = (route, body) => fetch(`http://127.0.0.1:${server.port}${route}`, { method: 'POST', headers: H, body: JSON.stringify(body) });
    assert.equal((await post('/admin/replace', { state: { ...base, coins: 1200 } })).status, 200);
    assert.equal((await post('/dispatch', { type: 'startJob', site: 'yard', machine: 'm_mini' })).status, 200);
    assert.equal((await post('/dispatch', { type: 'startJob', site: 'quarry', machine: 'm_std' })).status, 409, 'one slot only');
    assert.equal((await post('/dispatch', { type: 'buySlot' })).status, 200);
    assert.equal(server.getState().coins, 200);
    assert.equal((await post('/dispatch', { type: 'buySlot' })).status, 409);
    assert.equal((await post('/dispatch', { type: 'startJob', site: 'quarry', machine: 'm_mining' })).status, 409, 'forged unowned machine');
    assert.equal((await post('/dispatch', { type: 'startJob', site: 'quarry', machine: 'm_std' })).status, 200);
    const [yard] = server.getState().jobs;
    t = yard.end;
    assert.equal((await post('/dispatch', { type: 'claim', jobId: yard.id })).status, 200);
    const paid = server.getState().coins;
    assert.equal((await post('/dispatch', { type: 'claim', jobId: yard.id })).status, 200, 'retry is answered as done');
    assert.equal(server.getState().coins, paid);
    assert.equal(server.getState().jobs.length, 1);
  } finally { await server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
