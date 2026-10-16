import { normalize, reduce, levelInfo, moodLabel, partName } from '../src/shared/reducer.mjs';
import { checkLink } from '../src/shared/links.mjs';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const base = normalize(null);

ok(partName('paint_gold') === '香檳金', 'Chinese part names intact: ' + partName('paint_gold'));
ok(base.name === '小黃' && base.mood === 60 && base.xp === 0, 'defaults: name/mood/xp');

ok(reduce(base, { type: 'poke' }).mood === 63 && reduce(base, { type: 'poke' }).xp === 1, 'poke raises mood and xp');
ok(reduce({ ...base, mood: 99 }, { type: 'poke' }).mood === 100, 'mood capped at 100');
ok(reduce({ ...base, mood: 41 }, { type: 'mood', amount: -50 }).mood === 40, 'mood can never fall below the calm floor (40)');
ok(reduce(base, { type: 'rename', name: '  大黃  ' }).name === '大黃', 'rename trims');
ok(reduce(base, { type: 'rename', name: 'x'.repeat(40) }).name.length === 12, 'rename capped at 12 chars');
ok(reduce(base, { type: 'rename', name: '   ' }) === base, 'blank rename ignored');
ok(reduce({ ...base, durability: 50, coins: 100 }, { type: 'repair' }).mood === 70, 'repair raises mood by 10');
ok(reduce({ ...base, coins: 999 }, { type: 'buy', id: 'cab_cage' }).mood === 65, 'buying raises mood by 5');
ok(reduce(base, { type: 'dig' }).xp === 2, 'dig gives xp');
ok(reduce({ ...base, durability: 0 }, { type: 'dig' }).coins === base.coins, 'broken machine cannot dig');
ok(reduce({ ...base, equipped: { ...base.equipped, bucket: 'bucket_tooth' } }, { type: 'dig' }).coins === 20 + 6, 'tooth bucket pays 6 per dig');
const m = reduce({ ...base, moodAt: 0 }, { type: 'tick', now: 1000 });
ok(m.moodAt === 1000 && m.mood === 60, 'first tick only sets the clock');
const high = { ...m, mood: 90 };
ok(reduce(high, { type: 'tick', now: 1000 + 90000 * 3 + 5 }).mood === 87, 'a happy pet settles down 1 per 90s');
ok(reduce({ ...high, durability: 10 }, { type: 'tick', now: 1000 + 90000 * 3 }).mood === 87, 'a worn machine does not make it settle faster');
ok(reduce(high, { type: 'tick', now: 1000 + 90000 * 1000 }).mood === 70, 'settling is capped at 20 steps per catch-up');
ok(reduce({ ...m, mood: 60 }, { type: 'tick', now: 1000 + 90000 * 1000 }).mood === 55, 'it stops at the calm baseline (55) instead of going lower');
ok(reduce({ ...m, mood: 55 }, { type: 'tick', now: 1000 + 90000 * 50 }).mood === 55, 'a calm pet that is ignored stays calm for ever');
ok(reduce({ ...m, mood: 42 }, { type: 'tick', now: 1000 + 90000 * 5 }).mood === 47, 'a pet below the baseline drifts back up');
ok(normalize({ mood: 3 }).mood === 40, 'an old save with a very low mood is lifted to calm');
ok(normalize({ mood: 20 }).mood === 40, 'a low mood of 20 is lifted to calm too');
ok(reduce(m, { type: 'tick', now: 500 }).moodAt === 500, 'clock going backwards resets the clock');

const job = reduce({ ...base, xp: 500 }, { type: 'startJob', site: 'mine', now: 0 });
const claimed = reduce(job, { type: 'claim', now: 120 * 60000, rolls: [0, 0, 0] });
ok(claimed.xp - job.xp === 300, 'mine job gives 300 xp: ' + (claimed.xp - job.xp));

ok(levelInfo(0).level === 1 && levelInfo(19).level === 1 && levelInfo(20).level === 2 && levelInfo(80).level === 3, 'level thresholds 0/20/80');
ok(levelInfo(35).into === 15 && levelInfo(35).need === 60, 'level progress: ' + JSON.stringify(levelInfo(35)));
ok(moodLabel(95) === '很開心' && moodLabel(80) === '開心' && moodLabel(50) === '平靜' && moodLabel(40) === '平靜', 'mood labels: very happy / happy / calm');
ok(!['低落', '鬧脾氣'].some((w) => [40, 50, 60, 100].map(moodLabel).includes(w)), 'no sulking label is reachable');

// companion days: every different day the pet runs counts once, whatever the clock does
import { companionDays, MILESTONES } from '../src/shared/reducer.mjs';
const day = (offset, hour = 12, minute = 0) => new Date(2026, 0, 10 + offset, hour, minute).getTime();
const fresh = { ...base, since: 0, together: 0, lastDay: '', moodAt: 0 };
let s1 = reduce(fresh, { type: 'tick', now: day(0, 9) });
ok(s1.together === 1 && s1.lastDay === '2026-01-10' && s1.since === day(0, 9), 'the first run is day 1 and records the first day');
ok(reduce(s1, { type: 'tick', now: day(0, 23, 59) }).together === 1, 'later the same day is still day 1');
ok(reduce(s1, { type: 'tick', now: day(1, 0, 5) }).together === 2, 'the next calendar day counts as day 2, even a few minutes after midnight');
const s3 = reduce(reduce(s1, { type: 'tick', now: day(1, 8) }), { type: 'tick', now: day(41, 8) });
ok(s3.together === 3, 'jumping the clock forward 40 days adds only one day: ' + s3.together);
ok(reduce(s3, { type: 'tick', now: day(5, 8) }).together === 3, 'moving the clock back adds nothing');
ok(reduce(reduce(s3, { type: 'tick', now: day(5, 8) }), { type: 'tick', now: day(41, 20) }).together === 3, 'and a date already counted is not counted again');
ok(reduce(s3, { type: 'tick', now: day(42, 8) }).together === 4, 'the next new day after the jump counts normally');

const legacy = { ...base, since: day(-5, 13), together: 0, lastDay: '', moodAt: 0 };
ok(reduce(legacy, { type: 'tick', now: day(0, 9) }).together === 6, 'an older save carries over the calendar days since you met (6)');
ok(reduce({ ...legacy, together: 9 }, { type: 'tick', now: day(0, 9) }).together === 9, 'a save that already has a count keeps it');
ok(reduce({ ...base, since: 123 }, { type: 'tick', now: day(0, 9) }).since === 123, 'ticks never move the first day');
ok(companionDays({ together: 7 }) === 7 && companionDays({ together: 0 }) === 1 && companionDays({}) === 1, 'companionDays reads the stored count and is at least 1');
ok(normalize({ together: -5, lastDay: 'x' }).together === 0 && normalize({ together: 'x', lastDay: 'x' }).lastDay === '', 'normalize repairs bad companion fields');
ok(normalize({ lastDay: '2026-01-10', together: 4 }).lastDay === '2026-01-10', 'a well-formed day string is kept');

const met = { ...base, together: 6, milestone: 0, coins: 0 };
ok(reduce(met, { type: 'ackMilestone' }) === met, 'nothing is due before day 7');
const d7 = reduce({ ...met, together: 7 }, { type: 'ackMilestone' });
ok(d7.milestone === 7 && d7.coins === 30 && d7.mood === base.mood + 5, 'day 7 gives the first gift (+30) and a mood lift');
ok(reduce(d7, { type: 'ackMilestone' }) === d7, 'acknowledging twice does not pay twice');
const d120 = reduce({ ...met, together: 119 }, { type: 'ackMilestone' });
ok(d120.milestone === 100 && d120.coins === 30 + 100 + 300, 'a count past day 100 collects every missed milestone: ' + d120.coins);
ok(reduce(d120, { type: 'ackMilestone' }) === d120, 'and then nothing is left');
ok(reduce({ ...met, together: 7 }, { type: 'ackMilestone', now: day(900), days: 1000, coins: 9999 }).coins === 30, 'neither the clock nor the client can pick the day or the gift');
ok(MILESTONES.every(([d, c], i) => c > 0 && (i === 0 || d > MILESTONES[i - 1][0])), 'milestones are increasing and give a gift');

const n = normalize({ name: 42, mood: 'abc', xp: -5 });
ok(n.name === '小黃' && n.mood === 60 && n.xp === 0, 'normalize repairs bad pet fields');

const S = [{ id: 'a', name: 'A', host: 'news.example.com' }, { id: 'b', name: 'B', host: 'example.org', subdomains: true }];
const good = (u) => checkLink(u, S).ok;
ok(good('https://news.example.com/a/1'), 'allows exact host over https');
ok(!good('http://news.example.com/a'), 'blocks http');
ok(!good('https://news.example.com.evil.net/a'), 'blocks suffix lookalike');
ok(!good('https://evil.net/?u=https://news.example.com/'), 'blocks allowed host in query string');
ok(!good('https://news.example.com@evil.net/'), 'blocks credentials trick');
ok(!good('https://user:pw@news.example.com/'), 'blocks embedded credentials');
ok(!good('https://news.example.com:8443/'), 'blocks odd port');
ok(!good('https://sub.news.example.com/'), 'subdomain blocked when not allowed');
ok(good('https://sub.example.org/x'), 'subdomain allowed when enabled');
ok(!good('https://notexample.org/x'), 'enabled-subdomain rule does not match sibling domain');
ok(good('https://NEWS.Example.com./x'), 'case and trailing dot normalized');
ok(!good('javascript:alert(1)') && !good('not a url') && !good(null), 'rejects junk and javascript:');
ok(!good('https://news.exаmple.com/'), 'blocks unicode homoglyph host');
