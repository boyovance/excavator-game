import { PARTS, SLOTS, fitsMachine, partById, siteOpenTo } from './parts.mjs';
import { normalize, reduce, repairCost } from './reducer.mjs';
import { economySite, economySites } from './economy.mjs';
import { GROWTH_STAGES } from './growth.mjs';
import { jobMultiplier } from './jobs.mjs';

export function seededRandom(seed = 20261016) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = Math.imul(value ^ value >>> 15, 1 | value);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const dice = (random) => Array.from({ length: 11 }, random);
export const MACHINES = PARTS.filter((p) => p.machine);
export function scenario(machine = 'm_std', loadout = 'stock', collection = 'starter') {
  if (!partById(machine)?.machine) throw new Error('Unknown machine');
  let s = normalize({ schemaVersion: 3, xp: 500, coins: 1000, owned: [machine], equipped: { machine } });
  if (loadout !== 'stock') for (const { id: slot } of SLOTS.filter((v) => v.id !== 'machine')) {
    const choices = PARTS.filter((p) => p.slot === slot && fitsMachine(p, machine) &&
      (s.owned.includes(p.id) || loadout === 'all' || p.price != null && !p.workOnly));
    const best = choices.reduce((a, p) => (p.stats?.jobCoin ?? 1) > (a.stats?.jobCoin ?? 1) ? p : a, partById(s.equipped[slot]));
    s = { ...s, owned: [...new Set([...s.owned, best.id])], equipped: { ...s.equipped, [slot]: best.id } };
  }
  const extra = collection === 'full' ? PARTS : collection === 'half' ? PARTS.filter((_p, i) => i % 2 === 0) : [];
  return normalize({ ...s, owned: [...s.owned, ...extra.map((p) => p.id)] });
}

/** Uses real departure/claim rules; simulated time advances without touching a real clock/save. */
export function simulateTrip(state, siteId, version, random, time = 1000, id = 'balance-trip') {
  const active = reduce(state, { type: 'startJob', site: siteId, now: time, id, rolls: dice(random) }, version);
  if (active === state) return { state, accepted: false, minutes: 0 };
  return { state: reduce(active, { type: 'claim', jobId: active.job.id, now: active.job.end }), accepted: true,
    minutes: economySite(siteId, version).minutes };
}

export function sampleSite({ machine = 'm_std', loadout = 'stock', collection = 'starter', siteId, version = 1, samples = 2000, seed = 20261016 }) {
  if (!Number.isInteger(samples) || samples < 1 || samples > 100000) throw new Error('Invalid sample count');
  const state = scenario(machine, loadout, collection);
  const site = economySite(siteId, version);
  if (!site || !siteOpenTo(site, machine)) return null;
  const random = seededRandom(seed);
  // Build one valid departure, then vary only its saved dice. Every trial resets ownership/durability.
  const template = reduce(state, { type: 'startJob', site: siteId, now: 1000, id: 'batch', rolls: Array(11).fill(0.5) }, version);
  const totals = { base: 0, jackpotBonus: 0, equipmentBonus: 0, duplicates: 0, gross: 0, repair: 0, net: 0, newParts: 0, parts: 0, machines: 0 };
  let minNet = Infinity;
  for (let i = 0; i < samples; i++) {
    const active = { ...template, job: { ...template.job, rolls: dice(random) } };
    const done = reduce(active, { type: 'claim', jobId: active.job.id, now: active.job.end });
    const r = done.report;
    for (const key of ['base', 'jackpotBonus', 'equipmentBonus', 'duplicates']) totals[key] += r.breakdown[key];
    const repair = repairCost(done.durability);
    totals.gross += r.coins; totals.repair += repair; totals.net += r.coins - repair;
    totals.parts += r.drops.filter((d) => partById(d.id).slot !== 'machine').length;
    totals.newParts += r.drops.filter((d) => !d.dup && partById(d.id).slot !== 'machine').length;
    totals.machines += r.drops.filter((d) => partById(d.id).slot === 'machine').length;
    minNet = Math.min(minNet, r.coins - repair);
  }
  const mean = Object.fromEntries(Object.entries(totals).map(([key, total]) => [key, total / samples]));
  const perHour = 60 / site.minutes;
  return { machine, loadout, collection, siteId, name: site.name, version, samples, seed, minutes: site.minutes,
    multiplier: jobMultiplier(state.equipped), mean, minNet,
    hourly: { net: mean.net * perHour, xp: site.xp * perHour, parts: mean.parts * perHour, newParts: mean.newParts * perHour, machines: mean.machines * perHour },
    operationsPerHour: perHour };
}

const quantile = (values, p) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)];
export function firstPurchase({ version = 1, samples = 1000, seed = 20261016 } = {}) {
  const random = seededRandom(seed);
  const times = [];
  let failures = 0;
  for (let i = 0; i < samples; i++) {
    let s = normalize(null); let elapsed = 0;
    for (let trip = 0; trip < 100; trip++) {
      const result = simulateTrip(s, 'yard', version, random, 1000 + elapsed * 60000);
      if (!result.accepted) break;
      s = reduce(result.state, { type: 'repair' }); elapsed += result.minutes;
      for (const g of GROWTH_STAGES) s = reduce(s, { type: 'claimGrowth', id: g.id });
      if (s.coins >= partById('m_mini').price) {
        s = reduce(s, { type: 'buy', id: 'm_mini' });
        if (s.equipped.machine === 'm_mini' && s.coins >= 0) times.push(elapsed);
        break;
      }
      if (trip === 99) failures++;
    }
  }
  return { version, samples, seed, completed: times.length, failures: samples - times.length,
    p50Minutes: times.length ? quantile(times, 0.5) : null, p90Minutes: times.length ? quantile(times, 0.9) : null };
}

/** Exact geometric percentiles for the first eligible machine, not a promise or a pity timer. */
export function machineWait(siteId, machine = 'm_std', version = 1) {
  const s = scenario(machine);
  const site = economySite(siteId, version);
  if (!site || !siteOpenTo(site, machine) || !site.machineDrop) return null;
  const pool = site.machineDrop.pool.filter(([id]) => !s.owned.includes(id));
  if (!pool.length) return null;
  const p = site.machineDrop.chance;
  const rounds = (q) => Math.ceil(Math.log(1 - q) / Math.log(1 - p));
  return { siteId, machine, chance: p, eligible: pool.map(([id]) => id), p50Hours: rounds(0.5) * site.minutes / 60,
    p90Hours: rounds(0.9) * site.minutes / 60 };
}

export function targetMachineTime({ siteId, machine, target, version = 1, samples = 1000, seed = 20261016 }) {
  const initial = scenario(machine);
  const site = economySite(siteId, version);
  if (!site?.machineDrop?.pool.some(([id]) => id === target) || !siteOpenTo(site, machine) || initial.owned.includes(target)) return null;
  const random = seededRandom(seed); const times = [];
  for (let i = 0; i < samples; i++) {
    let s = initial;
    for (let trip = 1; trip <= 2000; trip++) {
      const result = simulateTrip(s, siteId, version, random);
      if (!result.accepted) break;
      s = reduce(result.state, { type: 'repair' });
      if (s.owned.includes(target)) { times.push(trip * site.minutes / 60); break; }
    }
  }
  // Censored failures belong above the observation window, not silently removed from percentiles.
  const complete = times.length;
  while (times.length < samples) times.push(Infinity);
  const q = (p) => { const v = quantile(times, p); return Number.isFinite(v) ? v : null; };
  return { version, siteId, machine, target, samples, seed, completed: complete, censored: samples - complete,
    p50Hours: q(0.5), p90Hours: q(0.9), windowHours: 2000 * site.minutes / 60 };
}

/** Dominance on four scalar rates; distinct loot sources are deliberately not valued as money. */
export function dominance(rows) {
  const keys = ['net', 'xp', 'parts', 'machines'];
  return rows.flatMap((a) => rows.filter((b) => a !== b && keys.every((k) => a.hourly[k] >= b.hourly[k]) &&
    keys.some((k) => a.hourly[k] > b.hourly[k] * 1.02 + 0.001)).map((b) => ({ better: a.siteId, worse: b.siteId })));
}

export function maintenanceRun(version, trips = 20) {
  let s = scenario(); const random = seededRandom(); let completed = 0;
  for (let i = 0; i < trips; i++) {
    const result = simulateTrip(s, 'yard', version, random);
    if (!result.accepted) break;
    s = result.state; completed++;
  }
  return { version, requested: trips, completed, durability: s.durability, coins: s.coins - 1000 };
}

export function comparison(options = {}) {
  return [1, 2].map((version) => economySites(version).map((site) => sampleSite({ ...options, version, siteId: site.id })).filter(Boolean));
}
