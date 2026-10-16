import { normalize, reduce, stamp } from '../src/shared/reducer.mjs';
import { claimWithRolls } from './job-fixtures.mjs';

let s = normalize(null);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

s = reduce(s, { type: 'startJob', site: 'yard', now: 1000 });
ok(s.job && s.job.end === 1000 + 5 * 60000, 'startJob sets end 5min later');
ok(reduce(s, { type: 'startJob', site: 'mine', now: 5 }) === s, 'cannot start second job');
ok(reduce(s, { type: 'claim', now: 2000, rolls: [0.5, 0, 0] }) === s, 'claim before end ignored');

const R = (c1, c2, jp, d1, p1, d2 = 1, p2 = 0, d3 = 1, p3 = 0) => [c1, c2, jp, d1, p1, d2, p2, d3, p3, 0.99, 0];
const done = claimWithRolls(s, { type: 'claim', now: 1000 + 5 * 60000, rolls: R(0.5, 0.5, 0.9, 0.1, 0) });
ok(done.job === null && done.report && !done.report.seen, 'claim clears job and writes report');
ok(done.coins === 20 + done.report.coins && done.report.coins >= 10 && done.report.coins <= 30, 'coins in range: ' + done.report.coins);
ok(done.report.drops.length === 1 && done.report.drops[0].id === 'acc_beacon' && done.owned.includes('acc_beacon'), 'first loot entry dropped and owned');
ok(done.durability === 92, 'wear applied: ' + done.durability);

const low = claimWithRolls(s, { type: 'claim', now: 999999999, rolls: R(0, 0, 0.9, 1, 0) });
const high = claimWithRolls(s, { type: 'claim', now: 999999999, rolls: R(0.999, 0.999, 0.9, 1, 0) });
ok(low.report.coins === 10 && high.report.coins === 30, 'coin extremes hit the range ends: ' + low.report.coins + '/' + high.report.coins);
const jp = claimWithRolls(s, { type: 'claim', now: 999999999, rolls: R(0, 0, 0.0, 1, 0) });
ok(jp.report.jackpot && jp.report.coins === 20, 'jackpot doubles coins');

s = reduce(done, { type: 'startJob', site: 'yard', now: 0 });
const dup = claimWithRolls(s, { type: 'claim', now: 999999999, rolls: R(0, 0, 0.9, 0.1, 0) });
ok(dup.report.drops[0].dup && dup.report.coins >= 10 + 15, 'duplicate converts to coins: ' + dup.report.coins);

const noDrop = claimWithRolls(s, { type: 'claim', now: 999999999, rolls: R(0, 0.5, 0.9, 0.99, 0.5) });
ok(noDrop.report.drops.length === 0, 'no drop when roll >= chance');

// longer jobs pay better: average coins per minute and expected part count rise with duration
const avg = (id) => {
  let sum = 0, parts = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const st = reduce(normalize(null), stamp({ type: 'startJob', site: id }, 0));
    const r = reduce(st, stamp({ type: 'claim' }, 1e12)).report;
    sum += r.coins;
    parts += r.drops.length;
  }
  return { coins: sum / N, parts: parts / N };
};
const y = avg('yard'), q = avg('quarry'), m = avg('mine');
ok(y.coins < q.coins && q.coins < m.coins, 'longer site pays more coins');
ok(y.parts < q.parts && q.parts < m.parts, 'longer site drops more parts: ' + [y.parts, q.parts, m.parts].map((x) => x.toFixed(2)));
ok(y.coins / 5 < m.coins / 120, 'mine pays more per minute than yard');

const old = normalize({ report: { site: 'yard', coins: 5, drop: 'acc_beacon', dup: true, at: 1, seen: true } });
ok(old.report.drops.length === 1 && old.report.drops[0].dup === true && old.report.jackpot === false, 'old single-drop report migrates');

const base = normalize(null);
ok(reduce(base, { type: 'buy', id: 'paint_gold' }).owned.length === base.owned.length, 'cannot buy work-only part');
ok(reduce({ ...base, coins: 999 }, { type: 'buy', id: 'bucket_wide' }).equipped.bucket === 'bucket_wide', 'buy equips part');
ok(reduce(done, { type: 'ackReport' }).report.seen === true, 'ackReport marks seen');
ok(reduce({ ...base, durability: 0 }, { type: 'startJob', site: 'yard', now: 0 }).job === null, 'broken pet cannot start job');
ok(reduce(s, { type: 'cancelJob' }).job === null && reduce(s, { type: 'cancelJob' }).report === s.report, 'cancel gives no report');
const st = stamp({ type: 'startJob', now: 1, rolls: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9] });
ok(st.now > 1000 && st.rolls.every((r) => r < 1), 'stamp overrides client time and rolls');
ok(normalize({ coins: 'x', job: { site: 'nope' }, equipped: { paint: 'paint_gold' } }).equipped.paint === 'paint_yellow', 'normalize rejects unowned/invalid');
