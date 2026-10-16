import { PARTS, SLOTS, SITES, DEFAULT_EQUIPPED, partById } from '../src/shared/parts.mjs';
import { normalize, reduce } from '../src/shared/reducer.mjs';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

const ids = PARTS.map((p) => p.id);
ok(new Set(ids).size === ids.length, 'part ids are unique (' + ids.length + ' parts)');
ok(PARTS.every((p) => SLOTS.some((s) => s.id === p.slot)), 'every part belongs to a known slot');
ok(SLOTS.every((s) => PARTS.find((p) => p.slot === s.id)?.price === 0), 'the first part of every slot is the free default');

// every part can actually be obtained: bought in the shop, or listed in a work-site loot table
const lootIds = new Set(SITES.flatMap((s) => [...s.loot.map(([id]) => id), ...(s.machineDrop?.pool ?? []).map(([id]) => id)]));
ok(SITES.every((s) => s.loot.every(([id]) => partById(id))), 'every loot entry points at a real part');
const unobtainable = PARTS.filter((p) => (p.price === null || p.workOnly) && !lootIds.has(p.id)).map((p) => p.id);
ok(unobtainable.length === 0, 'every work-only part drops somewhere' + (unobtainable.length ? ': ' + unobtainable : ''));
ok(PARTS.filter((p) => p.price !== null && p.price !== 0).every((p) => p.price > 0 && Number.isInteger(p.price)), 'prices are positive integers');

// real-excavator data the skins depend on
const buckets = PARTS.filter((p) => p.slot === 'bucket');
ok(buckets.every((b) => b.shape && b.shape.thickness >= 3 && b.shape.thickness <= 7), 'every bucket has a drawable shape (' + buckets.map((b) => b.id).join(', ') + ')');
ok(buckets.every((b) => typeof b.stats?.coin === 'number' && b.stats.coin >= 1), 'every bucket has a coin multiplier');
const tracks = PARTS.filter((p) => p.slot === 'tracks');
ok(tracks.every((t) => ['steel', 'rubber', 'wheels', 'spider', 'float', 'expand', 'outrigger', 'spiderwheel', 'wide', 'swamp', 'rail'].includes(t.look)), 'every undercarriage has a known look');
ok(tracks.every((t) => typeof t.stats?.speed === 'number'), 'every undercarriage has a speed multiplier');

// price should rise with benefit inside a slot, so nothing is strictly better and cheaper
for (const slot of ['bucket', 'tracks']) {
  const key = slot === 'bucket' ? 'coin' : 'speed';
  const shop = PARTS.filter((p) => p.slot === slot && p.price !== null && (!p.fits || p.fits.includes('m_std'))).sort((a, b) => a.price - b.price);
  const monotone = shop.every((p, i) => i === 0 || p.stats[key] >= shop[i - 1].stats[key]);
  ok(monotone, slot + ': a more expensive shop part is never worse than a cheaper one');
}

// new slots: boom, stick, counterweight, and attachments in the bucket slot
for (const slot of ['boom', 'stick', 'counterweight']) ok(SLOTS.some((s) => s.id === slot) && DEFAULT_EQUIPPED[slot], 'slot "' + slot + '" exists with a default: ' + DEFAULT_EQUIPPED[slot]);
ok(PARTS.filter((p) => p.slot === 'boom').every((p) => p.boom.segments.length >= 1 && p.boom.segments.every(([len]) => len > 3)), 'every boom has drawable segments');
const totalLen = (p) => p.boom.segments.reduce((n, [l]) => n + l, 0);
ok(PARTS.filter((p) => p.slot === 'boom').every((p) => Math.abs(totalLen(p) - 17) < 0.01), 'all booms are the same overall length (17), so poses stay in frame');
ok(PARTS.filter((p) => p.slot === 'stick').every((p) => p.stick.length >= 9 && p.stick.length <= 18), 'stick lengths stay within the drawing limits');
ok(PARTS.filter((p) => p.slot === 'counterweight').every((p) => ['long', 'zts', 'heavy', 'ballast', 'mining'].includes(p.look)), 'every counterweight has a known look');
const tools = PARTS.filter((p) => p.slot === 'bucket' && p.shape.tool);
ok(['auger', 'breaker', 'grapple'].every((k) => tools.some((t) => t.shape.tool === k)), 'grapple, breaker and auger attachments exist');
ok(['bucket_grapple', 'bucket_breaker', 'bucket_auger'].every((id) => partById(id)), 'attachment ids present');

// stacking: every equipped part multiplies the pay
import { digCoins } from '../src/shared/reducer.mjs';
ok(digCoins(DEFAULT_EQUIPPED) === 4, 'default machine pays 4 per dig');
ok(digCoins({ ...DEFAULT_EQUIPPED, stick: 'stick_short' }) === 4 /* 4*1.1=4.4 */, 'short stick alone rounds to 4');
ok(digCoins({ ...DEFAULT_EQUIPPED, bucket: 'bucket_breaker', stick: 'stick_short', boom: 'boom_tab', counterweight: 'cw_heavy' }) === Math.round(4 * 1.6 * 1.1 * 1.05 * 1.05), 'bucket x stick x boom x counterweight stack: ' + digCoins({ ...DEFAULT_EQUIPPED, bucket: 'bucket_breaker', stick: 'stick_short', boom: 'boom_tab', counterweight: 'cw_heavy' }));
const job = (equipped) => { let s = { ...normalize(null), equipped }; s = reduce(s, { type: 'startJob', site: 'mine', now: 0 }); return reduce(s, { type: 'claim', now: 999999999, rolls: [0, 0.99, 0] }).report.coins; };
ok(job({ ...DEFAULT_EQUIPPED, stick: 'stick_long' }) > job(DEFAULT_EQUIPPED), 'the long stick raises job pay: ' + job(DEFAULT_EQUIPPED) + ' -> ' + job({ ...DEFAULT_EQUIPPED, stick: 'stick_long' }));
ok(job({ ...DEFAULT_EQUIPPED, bucket: 'bucket_breaker' }) === job(DEFAULT_EQUIPPED), 'a bucket does not change job pay (only the long stick does)');

// backward compatibility: every id that earlier versions could have saved still exists
const oldIds = ['paint_yellow', 'paint_orange', 'paint_blue', 'paint_green', 'paint_red', 'paint_white', 'paint_purple', 'paint_black', 'paint_gold', 'cab_std', 'cab_visor', 'cab_cage', 'bucket_std', 'bucket_wide', 'bucket_tooth', 'tracks_std', 'tracks_wheels', 'acc_none', 'acc_beacon', 'acc_flag', 'acc_antenna', 'skin_1', 'hair_short', 'hc_black', 'fit_red', 'hat_none'];
ok(oldIds.every((id) => partById(id)), 'all part ids from earlier versions still exist');
const legacy = normalize({ owned: ['bucket_tooth', 'tracks_wheels', 'paint_black'], equipped: { bucket: 'bucket_tooth', tracks: 'tracks_wheels', paint: 'paint_black' }, coins: 5 });
ok(legacy.equipped.bucket === 'bucket_tooth' && legacy.equipped.tracks === 'tracks_wheels' && legacy.equipped.machine === 'm_wheeled' && legacy.owned.includes('paint_black'), 'an older save keeps its equipment (wheels move it to the wheeled machine)');

// new parts behave in the shop
const rich = { ...normalize(null), coins: 999 };
for (const id of ['bucket_trench', 'tracks_rubber', 'acc_blade', 'acc_worklight']) {
  const bought = reduce(rich, { type: 'buy', id });
  ok(bought.owned.includes(id) && bought.equipped[partById(id).slot] === id && bought.coins === 999 - partById(id).price, 'can buy ' + id);
}
ok(reduce(rich, { type: 'buy', id: 'bucket_crusher' }) === rich, 'the crusher bucket cannot be bought, only found');
const withCrusher = { ...rich, owned: [...rich.owned, 'bucket_crusher'] };
ok(reduce(withCrusher, { type: 'equip', id: 'bucket_crusher' }).equipped.bucket === 'bucket_crusher', 'a found crusher bucket can be equipped');

// valuable work-only parts: never sold, only found while working
const workOnly = PARTS.filter((p) => p.price === null || p.workOnly);
console.log((workOnly.length >= 5 ? 'PASS ' : 'FAIL ') + 'work-only parts: ' + workOnly.length);
console.log((workOnly.every((p) => SITES.some((s) => s.loot.some(([id]) => id === p.id) || s.machineDrop?.pool.some(([id]) => id === p.id))) ? 'PASS ' : 'FAIL ') + 'every work-only part can drop');
const richState = { ...normalize(null), coins: 999999 };
console.log((workOnly.every((p) => !reduce(richState, { type: 'buy', id: p.id }).owned.includes(p.id)) ? 'PASS ' : 'FAIL ') + 'work-only parts cannot be bought');
console.log((['bucket_tilt', 'acc_gps', 'boom_reach'].every((id) => workOnly.some((p) => p.id === id)) ? 'PASS ' : 'FAIL ') + 'tiltrotator, 3D guidance and long-reach boom are work-only');

