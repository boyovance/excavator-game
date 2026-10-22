import { SITES, siteById } from './parts.mjs';

// Jobs from this rules version on count towards the per-site new-machine guarantee.
export const PITY_FROM_VERSION = 3;

/** Jobs in a row without a new machine after which the next one is guaranteed: the average number of tries. */
export const pityLimit = (site) => site?.machineDrop ? Math.ceil(1 / site.machineDrop.chance - 1e-9) : 0;

export const unownedMachines = (site, owned) => site?.machineDrop ? site.machineDrop.pool.filter(([id]) => !owned.includes(id)) : [];

export function normalizeMachinePity(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const site of SITES) {
    const limit = pityLimit(site);
    const n = Math.floor(Number(raw[site.id]));
    if (limit && Number.isFinite(n) && n > 0) out[site.id] = Math.min(limit - 1, n);
  }
  return out;
}

/** Guarantee progress shown to the player; null when the site has no machine left to give. */
export function pityProgress(state, siteId) {
  const site = siteById(siteId);
  const limit = pityLimit(site);
  if (!limit || !unownedMachines(site, state.owned).length) return null;
  const count = Math.min(limit - 1, state.machinePity?.[siteId] ?? 0);
  return { count, limit, guaranteed: count + 1 >= limit };
}
