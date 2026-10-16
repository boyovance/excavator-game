import { PARTS, SLOTS, MACHINE_SLOTS, fitsMachine, machineDefaults, partById } from '../src/shared/parts.mjs';
import { normalize, reduce } from '../src/shared/reducer.mjs';

const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

const machines = PARTS.filter((p) => p.slot === 'machine');
const ids = machines.map((m) => m.id);
// buy a machine, or for work-only machines (found while working) hand it over the way a drop would
const getMachine = (st, id) =>
  partById(id).workOnly
    ? normalize({ ...st, owned: [...st.owned, id], equipped: { ...st.equipped, machine: id } })
    : reduce(st, { type: 'buy', id });
ok(machines.length === 11, 'eleven machine types: ' + ids.join(', '));
ok(SLOTS[0].id === 'machine', 'the machine type is the first slot');
ok(machines[0].id === 'm_std' && machines[0].price === 0, 'the standard crawler excavator is free and first');

// every machine comes with parts that exist, fit it, and fill every machine slot
for (const m of machines) {
  const d = machineDefaults(m.id);
  const good = MACHINE_SLOTS.every((s) => partById(d[s])?.slot === s && fitsMachine(partById(d[s]), m.id));
  ok(good, m.name + ': its default parts exist and fit it');
  ok(m.machine.size > 0 && m.machine.fit > 0 && m.machine.fit <= 1 && m.machine.drive && m.machine.use, m.name + ': has size, fit, drive and use');
}
// fits only names real machine types, and every part fits at least one
ok(PARTS.every((p) => !p.fits || (p.fits.length > 0 && p.fits.every((id) => ids.includes(id)))), 'fits lists only name real machine types');
for (const s of MACHINE_SLOTS) {
  ok(machines.every((m) => PARTS.some((p) => p.slot === s && fitsMachine(p, m.id))), 'every machine has something to put in the ' + s + ' slot');
}

// real-world rules
const fits = (part, machine) => fitsMachine(partById(part), machine);
ok(!fits('tracks_std', 'm_wheeled') && fits('tracks_wheels', 'm_wheeled') && !fits('tracks_wheels', 'm_std'), 'wheels only on wheeled machines (and handlers)');
ok(fits('tracks_spider', 'm_spider') && ids.filter((m) => fits('tracks_spider', m)).length === 1, 'walking legs only on the spider excavator');
ok(fits('tracks_float', 'm_amph') && ids.filter((m) => fits('tracks_float', m)).length === 1, 'pontoons only on the amphibious excavator');
ok(fits('cab_hdl', 'm_handler') && fits('cab_raised', 'm_demo') && !fits('cab_raised', 'm_std') && !fits('cab_hdl', 'm_demo'), 'raised cabs only on handlers and demolition machines, each with its own');
const handlerTools = PARTS.filter((p) => p.slot === 'bucket' && fitsMachine(p, 'm_handler')).map((p) => p.id).sort().join();
ok(handlerTools === ['bucket_clamshell', 'bucket_log', 'bucket_magnet', 'bucket_peel', 'bucket_screen', 'bucket_shear', 'bucket_sorting'].sort().join(), 'a material handler only takes handling tools: ' + handlerTools);
ok(!fits('bucket_tooth', 'm_mini') && !fits('bucket_auger', 'm_mining') && fits('bucket_face', 'm_mining') && !fits('bucket_face', 'm_std'), 'heavy rock tools fit mining machines, mini machines take small tools');
ok(fits('bucket_silent', 'm_demo') && fits('bucket_pulverizer', 'm_demo') && fits('bucket_shear', 'm_demo') && !fits('bucket_trench', 'm_demo') && !fits('bucket_pulverizer', 'm_std'), 'demolition machines take shears, pulverizers and silenced breakers, not trench buckets');
ok(fits('boom_demo', 'm_demo') && !fits('boom_demo', 'm_std'), 'the demolition boom only fits demolition machines');
ok(fits('cw_mini_zts', 'm_mini') && !fits('cw_mini_zts', 'm_mining') && fits('cw_mining', 'm_mining') && !fits('cw_mining', 'm_std'), 'zero-tail weights on small machines, giant weights on mining machines');

// switching machines
const rich = { ...normalize(null), coins: 99999 };
const mini = reduce(rich, { type: 'buy', id: 'm_mini' });
ok(mini.equipped.machine === 'm_mini' && mini.owned.includes('m_mini') && mini.coins === 99999 - 150, 'buying a machine pays for it and switches to it');
ok(mini.equipped.cab === 'cab_canopy' && mini.equipped.tracks === 'tracks_mini' && mini.equipped.counterweight === 'cw_mini_zts', 'the machine arrives wearing its own parts');
ok(reduce(mini, { type: 'equip', id: 'tracks_std' }) === mini, 'a part that does not fit the machine cannot be equipped');
ok(reduce(mini, { type: 'buy', id: 'bucket_tooth' }) === mini, 'a part that does not fit the machine cannot be bought');
const poor = { ...normalize(null), coins: 10 };
ok(reduce(poor, { type: 'buy', id: 'm_mini' }) === poor, 'a machine you cannot afford is not bought');

// the work-only parts a machine comes with are owned with it
const demo = getMachine(rich, 'm_demo');
ok(demo.equipped.bucket === 'bucket_pulverizer' && demo.owned.includes('bucket_pulverizer') && demo.owned.includes('boom_demo'), 'a demolition machine brings its pulverizer and boom');

// each machine remembers what it was wearing
let s = reduce(rich, { type: 'buy', id: 'bucket_wide' });
ok(s.equipped.bucket === 'bucket_wide', 'wide bucket on the standard machine');
s = reduce(s, { type: 'buy', id: 'm_mini' });
s = reduce(s, { type: 'equip', id: 'm_std' });
ok(s.equipped.machine === 'm_std' && s.equipped.bucket === 'bucket_wide', 'switching back restores the standard machine\'s bucket');
s = reduce(s, { type: 'equip', id: 'm_mini' });
ok(s.equipped.cab === 'cab_canopy', 'and the mini keeps its own parts');
ok(reduce(s, { type: 'equip', id: 'm_wheeled' }) === s, 'a machine that is not owned cannot be equipped');

// shared slots stay as they are
const painted = reduce(reduce(rich, { type: 'buy', id: 'paint_red' }), { type: 'buy', id: 'm_wheeled' });
ok(painted.equipped.paint === 'paint_red' && painted.equipped.skin === 'skin_1', 'paint and the driver stay when the machine changes');

// machine stats apply to pay
const pay = (st) => reduce(st, { type: 'dig' }).coins - st.coins;
ok(pay(mini) < pay(rich), 'a mini machine digs for less: ' + pay(mini) + ' < ' + pay(rich));
ok(pay(getMachine(rich, 'm_mining')) > pay(rich) * 1.5, 'a mining machine digs for much more');

// impossible saves are repaired
const broken = normalize({ owned: ['m_mini', 'tracks_rubber'], equipped: { machine: 'm_mini', tracks: 'tracks_wheels', bucket: 'bucket_tooth', paint: 'paint_red' } });
ok(broken.equipped.machine === 'm_mini' && broken.equipped.tracks === 'tracks_mini' && broken.equipped.bucket === 'bucket_mini', 'parts that cannot go on the machine are swapped for its own');
ok(normalize({ equipped: { machine: 'm_mining' } }).equipped.machine === 'm_std', 'a machine that is not owned falls back to the standard one');
ok(normalize(normalize({ owned: ['m_demo'], equipped: { machine: 'm_demo' } })).equipped.bucket === 'bucket_pulverizer', 'normalizing twice changes nothing');
ok(normalize({ owned: ['tracks_wheels'], equipped: { tracks: 'tracks_wheels' } }).equipped.machine === 'm_wheeled', 'an older save with wheels moves to the wheeled machine');

// drops only ever include parts the current machine can use
for (const id of ['m_std', 'm_mini', 'm_spider', 'm_handler', 'm_mining', 'm_amph']) {
  let st = getMachine({ ...normalize(null), coins: 99999 }, id);
  let allFit = true;
  for (let i = 0; i < 40; i++) {
    for (const site of ['yard', 'quarry', 'mine']) {
      const started = reduce(st, { type: 'startJob', site, now: 0 });
      if (!started.job) continue;
      const rolls = [0.5, 0.5, 0.99, 0, i / 40, 0, ((i * 7) % 40) / 40, 0, ((i * 13) % 40) / 40];
      const done = reduce(started, { type: 'claim', now: 1e12, rolls });
      for (const d of done.report.drops) if (!fitsMachine(partById(d.id), id)) allFit = false;
    }
  }
  ok(allFit, id + ': every drop is a part it can use');
}

// work sites need the right machine
import { SITES, siteById, siteOpenTo } from '../src/shared/parts.mjs';
const startAs = (machine, site) => {
  const st = getMachine({ ...normalize(null), coins: 99999 }, machine);
  return reduce(st, { type: 'startJob', site, now: 0 }).job !== null;
};
ok(ids.every((m) => startAs(m, 'yard')), 'every machine can work the scrap yard');
ok(!startAs('m_mini', 'quarry') && !startAs('m_spider', 'quarry') && startAs('m_mining', 'quarry') && startAs('m_wheeled', 'quarry'), 'small machines cannot work the quarry');
ok(!startAs('m_wheeled', 'mine') && !startAs('m_handler', 'mine') && !startAs('m_amph', 'mine') && startAs('m_std', 'mine') && startAs('m_mining', 'mine') && startAs('m_demo', 'mine'), 'only heavy crawler machines work the deep mine');
ok(SITES.every((s) => !s.machines || s.machines.every((m) => ids.includes(m))), 'site machine lists name real machine types');
ok(SITES.every((s) => ids.some((m) => siteOpenTo(s, m))), 'every site is open to at least one machine');
ok(siteOpenTo(siteById('yard'), 'm_mini') && !siteOpenTo(siteById('mine'), 'm_mini'), 'siteOpenTo follows the machine list');

// every machine has real places to work, with drops it can use
const open = (m) => SITES.filter((s) => siteOpenTo(s, m));
ok(ids.every((m) => open(m).length >= 2), 'every machine type can work at least two sites');
ok(open('m_amph').some((s) => s.id === 'river') && open('m_handler').some((s) => s.id === 'scrap') && open('m_spider').some((s) => s.id === 'slope') && open('m_mini').some((s) => s.id === 'alley'), 'each special machine has its own kind of site');
ok(!siteOpenTo(siteById('river'), 'm_mini') && !siteOpenTo(siteById('slope'), 'm_mining') && !siteOpenTo(siteById('scrap'), 'm_amph'), 'sites turn away machines that do not belong');
for (const s of SITES) {
  for (const m of ids.filter((m) => siteOpenTo(s, m))) {
    const usable = s.loot.filter(([id]) => fitsMachine(partById(id), m)).length;
    ok(usable >= 2, s.id + ' has at least two drops that ' + m + ' can use (' + usable + ')');
  }
}
ok(SITES.every((a) => SITES.every((b) => b.minutes <= a.minutes || b.coins[1] >= a.coins[1])), 'a longer site never tops out lower than a shorter one');
const perMin = (s) => (s.coins[0] + s.coins[1]) / 2 / s.minutes;
ok(perMin(siteById('mine')) > perMin(siteById('yard')) && SITES.every((s) => perMin(s) >= 3.5 && perMin(s) <= 5.5), 'pay per minute stays in a sane range: ' + SITES.map((s) => s.id + ' ' + perMin(s).toFixed(1)).join(', '));

// every machine has structural parts that belong to it alone
for (const mm of machines) {
  for (const slot of ['cab', 'boom', 'stick', 'tracks', 'counterweight']) {
    const own = PARTS.filter((p) => p.slot === slot && p.fits && p.fits.length === 1 && p.fits[0] === mm.id);
    ok(own.length >= 1, mm.name + ': has its own ' + slot + ' (' + own.map((p) => p.id).join(', ') + ')');
  }
}
// attachment tools are all drawable
import { TOOL_PRIMS } from '../src/shared/parts.mjs';
const toolNames = [...new Set(PARTS.filter((p) => p.shape?.tool).map((p) => p.shape.tool))];
const builtIn = ['breaker', 'grapple', 'auger'];
ok(toolNames.every((n) => builtIn.includes(n) || TOOL_PRIMS[n]), 'every attachment tool has a drawing: ' + toolNames.join(', '));
const colors = ['steel', 'dark', 'light', 'yellow', 'red'];
ok(Object.values(TOOL_PRIMS).every((list) => list.every((p) => (p[0] === 'bar' ? p.length === 7 && colors.includes(p[6]) : p[0] === 'disc' && p.length === 5 && colors.includes(p[4])))), 'tool drawings only use known shapes and colours');
ok(PARTS.filter((p) => p.slot === 'bucket').every((p) => fitsMachine(p, 'm_std') || p.fits.length >= 1), 'every attachment fits at least one machine');

// machines found while working
const workOnlyMachines = machines.filter((m) => m.workOnly);
ok(workOnlyMachines.length >= 6, 'several machine types are only found while working: ' + workOnlyMachines.map((m) => m.id).join(', '));
ok(workOnlyMachines.every((m) => reduce(rich, { type: 'buy', id: m.id }) === rich), 'work-only machines cannot be bought');
ok(machines.filter((m) => !m.workOnly).map((m) => m.id).join() === 'm_std,m_mini,m_wheeled,m_reach', 'the standard, mini, wheeled and long reach machines stay for sale');

// every machine can be reached from the free standard machine through jobs that can drop it
{
  const have = new Set(machines.filter((m) => !m.workOnly).map((m) => m.id));
  let grew = true;
  while (grew) {
    grew = false;
    for (const s of SITES) {
      if (![...have].some((m) => siteOpenTo(s, m))) continue;
      for (const [id] of s.machineDrop?.pool ?? []) if (!have.has(id)) { have.add(id); grew = true; }
    }
  }
  ok(ids.every((m) => have.has(m)), 'every machine type can be won through jobs, starting from the machines for sale (' + [...have].length + ' of ' + ids.length + ')');
}

// a machine drop: it is kept, it brings its own parts, and an owned machine never drops again
{
  const st = getMachine({ ...normalize(null), coins: 99999 }, 'm_mini');
  const started = reduce(st, { type: 'startJob', site: 'slope', now: 0 });
  const claim = (state, pick) => reduce(state, { type: 'claim', now: 1e12, rolls: [0.5, 0.5, 0.9, 1, 0, 1, 0, 1, 0, 0.0, pick] });
  const won = claim(started, 0.1);
  const machineIn = (r) => r.report.drops.filter((d) => d.id.startsWith('m_'));
ok(machineIn(won).length === 1 && machineIn(won)[0].id === 'm_spider' && !machineIn(won)[0].dup, 'a machine roll under the site chance brings a machine back');
  ok(won.owned.includes('m_spider') && won.owned.includes('tracks_spider') && won.owned.includes('bucket_spider'), 'a machine drop is kept and brings its own parts');
  const none = reduce(started, { type: 'claim', now: 1e12, rolls: [0.5, 0.5, 0.9, 1, 0, 1, 0, 1, 0, 0.5, 0.1] });
  ok(machineIn(none).length === 0, 'a machine roll over the site chance brings no machine');
  const again = claim({ ...started, owned: won.owned }, 0.1);
  ok(machineIn(again).length === 1 && machineIn(again)[0].id === 'm_micro', 'a machine you already own is skipped for another from the pool');
  const all = claim({ ...started, owned: [...won.owned, 'm_micro'] }, 0.1);
  ok(machineIn(all).length === 0, 'with every machine in the pool owned, no machine is picked');
  const four = reduce(started, { type: 'claim', now: 1e12, rolls: [0.5, 0.5, 0.9, 0, 0.1, 0, 0.1, 0, 0.1, 0.0, 0.1] });
  ok(four.report.drops.length === 4 && four.report.drops[3].id.startsWith('m_'), 'a report can hold three parts and a machine');
}
// odds per job stay modest
{
  const slope = SITES.find((s) => s.id === 'slope');
  ok(SITES.every((s) => !s.machineDrop || (s.machineDrop.chance > 0 && s.machineDrop.chance <= 0.15)), 'machine drop chances are between 0 and 15% per job');
  ok(slope.machineDrop.pool.every(([id]) => partById(id).workOnly), 'only work-only machines are in the drop pools');
}

// every work site has scenery to draw while the pet is out there
import { readFileSync } from 'node:fs';
const sceneryArt = readFileSync(new URL('../src/scene/sceneryArt.ts', import.meta.url), 'utf8');
for (const s of SITES) ok(sceneryArt.includes(['', '  ' + s.id + '(p) {'].join(String.fromCharCode(10))), s.name + ' (' + s.id + ') has scenery');
