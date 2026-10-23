import { grantsOf } from './machine.mjs';
import { fitsMachine, partById } from './parts.mjs';
import { num, withMood } from './util.mjs';
import { MAX_REPORTS, ROLLS_NEEDED, jobById, jobMultiplier } from './jobs.mjs';
import { economySite, duplicateRefund, economyVersion } from './economy.mjs';
import { PITY_FROM_VERSION, pityLimit, unownedMachines } from './pity.mjs';

const BASE_COINS = 4;
// coin spread (2) + jackpot (1) + a chance/item pair for each of up to 3 drops (6) + a machine drop chance and pick (2)

/** Multiply one stat across everything equipped; parts without it count as x1. */
function statProduct(equipped, stat) {
  let product = 1;
  for (const id of Object.values(equipped ?? {})) product *= partById(id)?.stats?.[stat] ?? 1;
  return product;
}

/** Coins one finished dig pays with the given equipment. */
export function digCoins(equipped) {
  return Math.max(1, Math.round(BASE_COINS * statProduct(equipped, 'coin')));
}

/** Fill in time and randomness. Run by the trusted side (the server) before reduce(). */
export function stamp(action, now = Date.now()) {
  if (action.type === 'startJob') {
    return { ...action, now, id: globalThis.crypto.randomUUID(), rolls: Array.from({ length: ROLLS_NEEDED }, () => Math.random()) };
  }
  if (action.type === 'claim' || action.type === 'cancelJob') return { type: action.type, jobId: action.jobId, now };
  if (action.type === 'ackMilestone') return { type: 'ackMilestone', now };
  return action;
}

/** Pick a part from the site's loot, only among parts the current machine can actually use and machines you do not own yet. */
function rollDrop(site, roll, machineId) {
  const usable = site.loot.filter(([id]) => fitsMachine(partById(id), machineId));
  const loot = usable.length ? usable : site.loot;
  const total = loot.reduce((n, [, w]) => n + w, 0);
  let t = roll * total;
  for (const [id, w] of loot) {
    t -= w;
    if (t < 0) return id;
  }
  return loot[loot.length - 1][0];
}

/** Collect a finished job: coins, drops, xp and wear, all rolled from the dice the server supplied. */
export function claimJob(state, action) {
  const now = num(action.now);
  // without an id, the earliest finished job is meant
  const job = action.jobId ? jobById(state, action.jobId)
    : state.jobs.filter((j) => now >= j.end).sort((a, b) => a.end - b.end)[0] ?? null;
  if (!job || now < job.end) return state;
  const version = economyVersion(job.rulesVersion);
  const site = economySite(job.site, version);
  // Dice, all supplied by the server: 0-1 coin spread, 2 jackpot, then a (chance, item) pair per possible drop.
  const rolls = job.rolls;
  const [lo, hi] = site.coins;
  // two dice averaged: most hauls land in the middle, very small and very big ones are rare
  let coins = lo + Math.floor(((rolls[0] + rolls[1]) / 2) * (hi - lo + 1));
  const base = coins;
  const jackpot = rolls[2] < site.jackpot;
  if (jackpot) coins *= 2;
  const jackpotBonus = coins - base;
  const beforeEquipment = coins;
  coins = Math.round(coins * jobMultiplier(job.equippedSnapshot));
  const equipmentBonus = coins - beforeEquipment;
  let duplicates = 0;

  let owned = state.owned;
  const drops = [];
  site.drops.forEach((chance, i) => {
    if (rolls[3 + 2 * i] >= chance) return;
    const id = rollDrop(site, rolls[4 + 2 * i], job.machineId);
    const dup = owned.includes(id);
    const refund = dup ? duplicateRefund(id, version, site.id) : 0;
    if (dup) { coins += refund; duplicates += refund; }
    else owned = [...owned, id];
    drops.push({ id, dup, coins: refund });
  });
  // a whole machine may come back too, one the player does not own yet;
  // from rules 3 on, the Nth job in a row at a site without one is guaranteed to bring one
  const pool = unownedMachines(site, owned);
  const counted = version >= PITY_FROM_VERSION && pool.length > 0;
  const before = counted ? job.pity ?? 0 : 0;
  const natural = !!site.machineDrop && rolls[9] < site.machineDrop.chance;
  const forced = counted && !natural && before + 1 >= pityLimit(site);
  let gotMachine = false;
  if ((natural || forced) && pool.length) {
    const total = pool.reduce((n, [, w]) => n + w, 0);
    let at = rolls[10] * total;
    const [id] = pool.find(([, w]) => (at -= w) < 0) ?? pool[pool.length - 1];
    owned = [...new Set([...owned, id, ...grantsOf(id)])];
    drops.push({ id, dup: false, ...(forced ? { pity: true } : {}) });
    gotMachine = true;
  }
  const after = gotMachine ? 0 : before + 1;
  const machinePity = counted ? { ...state.machinePity, [site.id]: after } : state.machinePity;
  if (counted && !after) delete machinePity[site.id];
  const remaining = Math.max(version >= 2 ? 0 : 1, state.durability - site.wear);
  return withMood(
    {
      ...state,
      coins: state.coins + coins,
      owned,
      machinePity,
      xp: state.xp + site.xp,
      durability: remaining,
      jobs: state.jobs.filter((j) => j !== job),
      reports: [{ jobId: job.id, machineId: job.machineId, desktop: job.desktop, site: site.id, coins, drops, jackpot, at: num(action.now), seen: false,
        breakdown: { base, jackpotBonus, equipmentBonus, duplicates, xp: site.xp, wear: Math.max(0, state.durability - remaining) },
        ...(counted && !gotMachine ? { pity: { count: after, limit: pityLimit(site) } } : {}) }, ...state.reports].slice(0, MAX_REPORTS),
    },
    8,
  );
}
