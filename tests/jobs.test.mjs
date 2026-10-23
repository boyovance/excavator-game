import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalize, reduce, stamp } from '../src/shared/reducer.mjs';
import { JobController } from '../src/scene/jobs.ts';
import { startServer } from '../server/index.mjs';

const test = (name, check) => { check(); console.log('PASS ' + name); };
const dice = [0.5, 0.5, 0.99, 0.01, 0, 0.99, 0, 0.99, 0, 0.99, 0];
const base = normalize({ owned: ['stick_long', 'm_micro', 'acc_beacon'], equipped: { stick: 'stick_long' } });
const start = reduce(base, { type: 'startJob', site: 'yard', id: 'snapshot-test', now: 1000, rolls: dice });
const end = start.jobs[0].end;
const claim = (s, now = end, jobId = start.jobs[0].id) => reduce(s, { type: 'claim', now, jobId, rolls: Array(11).fill(0) });
test('start stores independent equipment, id and fixed dice', () => {
  assert.equal(start.jobs[0].equippedSnapshot.stick, 'stick_long');
  assert.notEqual(start.jobs[0].equippedSnapshot, base.equipped);
  assert.notEqual(start.jobs[0].rolls, dice);
});
const done = claim(start);
test('claim ignores client dice and itemizes exactly the paid total', () => {
  assert.equal(done.reports[0].jackpot, false);
  assert.equal(done.reports[0].breakdown.base, 22);
  assert.equal(done.reports[0].drops[0].dup, true);
  assert.equal(done.reports[0].breakdown.duplicates, done.reports[0].drops[0].coins);
  const b = done.reports[0].breakdown;
  assert.equal(b.base + b.jackpotBonus + b.equipmentBonus + b.duplicates, done.reports[0].coins);
  assert.equal(done.coins - start.coins, done.reports[0].coins);
});
test('changing equipment or machine after departure does not change the reward', () => {
  let switched = reduce(start, { type: 'equip', id: 'stick_std' });
  switched = reduce(switched, { type: 'equip', id: 'm_micro' });
  assert.equal(switched.equipped.machine, 'm_micro');
  assert.deepEqual(claim(switched).reports[0], done.reports[0]);
});
test('early, wrong-id and repeat claims do not pay', () => {
  assert.equal(claim(start, end - 1), start);
  assert.equal(claim(start, end, 'other'), start);
  assert.equal(claim(done), done);
});
test('cancel only before completion, with the matching job', () => {
  assert.equal(reduce(start, { type: 'cancelJob', now: end, jobId: start.jobs[0].id }), start);
  assert.equal(reduce(start, { type: 'cancelJob', now: end - 1, jobId: 'other' }), start);
  const cancelled = reduce(start, { type: 'cancelJob', now: end - 1, jobId: start.jobs[0].id });
  assert.equal(cancelled.jobs.length, 0);
  assert.equal(cancelled.coins, start.coins);
  assert.equal(cancelled.reports[0], start.reports[0]);
});
test('elapsed time alone never claims or starts another job', () => {
  const later = reduce(start, { type: 'tick', now: end + 86400_000 * 10 });
  assert.equal(later.jobs[0], start.jobs[0]);
  assert.equal(later.coins, start.coins);
});
test('schema migration is stable and preserves old progress and ownership', () => {
  const raw = { ...base, jobs: undefined, job: { site: 'yard', start: 1000, end }, schemaVersion: undefined };
  const a = normalize(raw);
  assert.equal(a.schemaVersion, 5);
  assert.equal(a.coins, base.coins);
  assert.deepEqual(a.owned, base.owned);
  assert.deepEqual(a.jobs[0], normalize(raw).jobs[0]);
  assert.deepEqual(a.jobs[0], normalize(JSON.parse(JSON.stringify(a))).jobs[0]);
  assert.deepEqual(start.jobs[0], normalize(JSON.parse(JSON.stringify(start))).jobs[0]);
});
test('trusted stamping replaces client id, clock and random draws', () => {
  const a = stamp({ type: 'startJob', id: 'evil', now: 0, rolls: [9] }, 123);
  assert.notEqual(a.id, 'evil');
  assert.equal(a.now, 123);
  assert.equal(a.rolls.length, 11);
  assert(a.rolls.every((n) => n >= 0 && n < 1));
  assert.equal(stamp({ type: 'claim', rolls: [0] }).rolls, undefined);
});

test('scene controller returns from away and waits without a claim callback', () => {
  let state = 'away';
  const calls = [];
  const control = new JobController({ state: () => state, mode: () => 'away', visible: () => state !== 'away',
    working: () => { state = 'working'; }, waiting: () => { state = 'waiting'; calls.push('waiting'); },
    leave: () => { state = 'leave'; }, returning: () => { state = 'return'; calls.push('return'); },
    clear: () => calls.push('clear'), claimed: () => calls.push('claimed'), recalled: () => calls.push('recall'), started: () => calls.push('start'),
  });
  control.resume(start.jobs[0], false, end);
  assert.equal(state, 'return');
  state = 'idle'; control.resume(start.jobs[0], false, end);
  control.resume(start.jobs[0], false, end + 1);
  assert.deepEqual(calls, ['return', 'waiting']);
  state = 'drag'; control.resume(start.jobs[0], false, end); assert.equal(state, 'drag');
  state = 'waiting'; control.changed(start, done);
  assert.deepEqual(calls.slice(-2), ['clear', 'claimed']);
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exc-jobs-'));
const file = path.join(dir, 'state.json');
const headers = { Authorization: 'Bearer jobs-test', 'Content-Type': 'application/json' };
let time = 2_000_000;
const errors = [];
let server;
const boot = async () => { server = await startServer({ dataDir: dir, token: 'jobs-test', now: () => time, onSaveError: (e) => errors.push(e.code) }); };
const request = (action) => fetch(`http://127.0.0.1:${server.port}/dispatch`, { method: 'POST', headers, body: JSON.stringify(action) });
try {
  await boot();
  assert.equal((await request({ type: 'claim' })).status, 400);
  assert.equal((await request({ type: 'cancelJob', jobId: '' })).status, 400);
  fs.mkdirSync(`${file}.tmp`);
  assert.equal((await request({ type: 'startJob', site: 'yard' })).status, 503);
  assert.equal(server.getState().jobs.length, 0);
  fs.rmdirSync(`${file}.tmp`);
  console.log('PASS departure save failure does not occupy a slot; claim and recall require a job id');
  assert.equal((await request({ type: 'startJob', site: 'yard', now: 0, id: 'forged', rolls: dice })).status, 200);
  const active = server.getState();
  assert.notEqual(active.jobs[0].id, 'forged');
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).jobs[0], active.jobs[0]);
  console.log('PASS server persists departure before success, ignores forged random seed and time');
  fs.mkdirSync(`${file}.tmp`);
  assert.equal((await request({ type: 'cancelJob', jobId: active.jobs[0].id })).status, 503);
  assert.equal(server.getState().jobs[0].id, active.jobs[0].id);
  fs.rmdirSync(`${file}.tmp`);
  console.log('PASS failed recall persistence keeps the current job');
  assert.equal((await request({ type: 'claim', jobId: active.jobs[0].id })).status, 409);
  assert.equal((await request({ type: 'startJob', site: 'yard' })).status, 409);
  await server.close();
  time = active.jobs[0].end + 86400_000;
  await boot();
  assert.deepEqual(server.getState().jobs[0], active.jobs[0]);
  assert.equal(server.getState().coins, active.coins);
  console.log('PASS offline restart keeps the same completed job and unpaid balance');
  assert.equal((await request({ type: 'cancelJob', jobId: active.jobs[0].id })).status, 409);
  assert.equal((await request({ type: 'claim', jobId: 'stale' })).status, 409);
  // Fault injection only in this test-owned temporary directory.
  fs.mkdirSync(`${file}.tmp`);
  assert.equal((await request({ type: 'claim', jobId: active.jobs[0].id })).status, 503);
  assert.equal(server.getState().coins, active.coins);
  assert.deepEqual(server.getState().jobs[0], active.jobs[0]);
  const expected = claim(server.getState(), time, active.jobs[0].id).reports[0];
  fs.rmdirSync(`${file}.tmp`);
  assert.equal((await request({ type: 'claim', jobId: active.jobs[0].id })).status, 200);
  assert.deepEqual(server.getState().reports[0], expected);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).reports[0].jobId, active.jobs[0].id);
  console.log('PASS failed save leaves rewards unpaid; retry keeps identical dice and commits before success');
  const paid = server.getState().coins;
  const responses = await Promise.all(Array.from({ length: 5 }, () => request({ type: 'claim', jobId: active.jobs[0].id })));
  assert(responses.every((r) => r.status === 200));
  assert.equal(server.getState().coins, paid);
  await server.close(); await boot();
  assert.equal(server.getState().coins, paid);
  assert.equal(server.getState().jobs.length, 0);
  assert.equal((await request({ type: 'claim', jobId: active.jobs[0].id })).status, 200);
  console.log('PASS simultaneous repeats and restart retries return success without paying twice');
  await request({ type: 'startJob', site: 'yard' });
  const second = server.getState().jobs[0];
  time = second.end;
  await request({ type: 'claim', jobId: active.jobs[0].id });
  assert.equal(server.getState().jobs[0].id, second.id);
  assert.equal(server.getState().coins, paid);
  console.log('PASS late retry for a previous job cannot claim a different completed job');
  assert(errors.length > 0);
} finally {
  if (fs.existsSync(`${file}.tmp`) && fs.statSync(`${file}.tmp`).isDirectory()) fs.rmdirSync(`${file}.tmp`);
  await server?.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
