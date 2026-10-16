import * as L from '../src/shared/lines.mjs';
import { SLOTS, SITES } from '../src/shared/parts.mjs';
import { MILESTONES } from '../src/shared/reducer.mjs';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

// collect every line, whatever shape the pools have
const pools = [];
const add = (name, v) => {
  if (Array.isArray(v)) pools.push([name, v]);
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) add(`${name}.${k}`, x);
  else if (typeof v === 'string') pools.push([name, [v]]);
};
for (const key of ['GREETING', 'IDLE', 'POKE', 'SLEEP', 'REPAIR', 'EQUIP', 'ACTION', 'MILESTONE']) add(key, L[key]);
add('WORK.busyEarly', L.WORK.busyEarly);
add('WORK.digDone', L.WORK.digDone);
add('WORK.recalled', L.WORK.recalled);
add('WORK.start', L.WORK.start('採石場'));
add('LEVEL_UP', L.LEVEL_UP(12));

const all = pools.flatMap(([, lines]) => lines);
ok(all.length >= 100, 'the pet has plenty to say (' + all.length + ' lines)');
ok(all.every((s) => typeof s === 'string' && s.trim() === s && s.length > 0), 'no empty lines and no stray spaces around lines');
const tooLong = all.filter((s) => s.length > L.MAX_LINE_LENGTH);
ok(tooLong.length === 0, `every line fits the bubble (<= ${L.MAX_LINE_LENGTH} chars)` + (tooLong.length ? ': ' + tooLong.join(' | ') : ''));
for (const [name, lines] of pools) {
  if (new Set(lines).size !== lines.length) ok(false, 'duplicate lines inside ' + name);
}
ok(true, 'no pool repeats a line inside itself');

// the sulky mood is gone, so no line may nag the player or sound unhappy about being ignored
const nagging = all.filter((s) => /哼|不理我|別戳|不想動|討厭|生氣|為什麼不/.test(s));
ok(nagging.length === 0, 'no line sulks or nags' + (nagging.length ? ': ' + nagging.join(' | ') : ''));

// coverage
for (const p of ['morning', 'noon', 'afternoon', 'evening', 'night']) {
  ok(L.GREETING[p].length >= 3 && L.IDLE[p].length >= 3, `period "${p}" has greetings and idle lines`);
}
ok(L.IDLE.general.length >= 8 && L.IDLE.worn.length >= 3, 'general and worn-machine idle pools are filled in');
ok(SLOTS.every((s) => (L.EQUIP[s.id] ?? []).length >= 1), 'every part slot has a reaction when its part is swapped');
ok(Object.keys(L.EQUIP).every((k) => SLOTS.some((s) => s.id === k)), 'no reaction exists for a slot that does not exist');
ok(MILESTONES.every(([day]) => typeof L.MILESTONE[day] === 'string'), 'every milestone day has its own line');
ok(Object.keys(L.ACTION).sort().join() === 'hop,look,stretch,tinker,wave', 'a line exists for every small action');
ok(SITES.every((s) => L.WORK.start(s.name).every((x) => x.includes(s.name) || x.includes('開工'))), 'job-start lines work for every site name');
ok(L.WORK.start('深層礦坑').every((x) => x.length <= L.MAX_LINE_LENGTH), 'even the longest site name still fits the bubble');
ok(L.LEVEL_UP(1000).every((x) => x.length <= L.MAX_LINE_LENGTH) && L.LEVEL_UP(7).some((x) => x.includes('7')), 'level-up lines mention the level and stay short');

// time of day
const expected = { 4: 'night', 5: 'morning', 10: 'morning', 11: 'noon', 13: 'noon', 14: 'afternoon', 17: 'afternoon', 18: 'evening', 22: 'evening', 23: 'night', 0: 'night' };
ok(Object.entries(expected).every(([h, p]) => L.dayPeriod(Number(h)) === p), 'day periods: ' + JSON.stringify(expected));
ok([...Array(24).keys()].every((h) => L.GREETING[L.dayPeriod(h)]), 'every hour of the day has a greeting pool');
