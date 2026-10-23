import { DEFAULT_EQUIPPED, partById, siteById } from './parts.mjs';
import { loadoutFor } from './machine.mjs';
import { economySite, economyVersion, CURRENT_ECONOMY_VERSION } from './economy.mjs';
import { PITY_FROM_VERSION, pityLimit } from './pity.mjs';

export const RULES_VERSION = CURRENT_ECONOMY_VERSION;
export const ROLLS_NEEDED = 11;
export const MAX_SLOTS = 2;
export const SLOT_PRICE = 1000;
/** Results kept for the garage: the latest few, newest first. */
export const MAX_REPORTS = MAX_SLOTS;

export const jobById = (state, id) => state.jobs.find((j) => j.id === id) ?? null;
/** The job the desktop pet takes part in: the one that left with the machine then on the desktop. */
export const desktopJob = (state) => state.jobs.find((j) => j.desktop) ?? null;
export const machineBusy = (state, machineId) => state.jobs.some((j) => j.machineId === machineId);
export const siteBusy = (state, siteId) => state.jobs.some((j) => j.site === siteId);
/** Durability already promised to jobs still out; wear is only taken when each is claimed. */
export const reservedWear = (state) => state.jobs.reduce((n, j) => n + (economySite(j.site, j.rulesVersion)?.wear ?? 0), 0);
export const jobMultiplier = (equipped) => Object.values(equipped).reduce((n, id) => n * (partById(id)?.stats?.jobCoin ?? 1), 1);

// Stable migration for old saves: reading/retrying the same job must not reroll its reward.
export function legacyRolls(id) {
  let seed = 2166136261;
  for (const c of id) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: ROLLS_NEEDED }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
}

export function normalizeJob(raw, equipped, owned) {
  if (!raw || !siteById(raw.site) || !Number.isFinite(raw.start) || !Number.isFinite(raw.end) || raw.end <= raw.start) return null;
  const id = typeof raw.id === 'string' && /^[\w-]{1,128}$/.test(raw.id)
    ? raw.id : `legacy-${raw.site}-${Math.max(0, raw.start)}-${Math.max(0, raw.end)}`;
  const saved = raw.equippedSnapshot && typeof raw.equippedSnapshot === 'object' ? raw.equippedSnapshot : equipped;
  const machineId = partById(saved.machine)?.slot === 'machine' && owned.includes(saved.machine) ? saved.machine : equipped.machine;
  const snapshot = { ...DEFAULT_EQUIPPED, machine: machineId, ...loadoutFor(machineId, owned, saved) };
  for (const [slot, value] of Object.entries(saved)) {
    const part = partById(value);
    if (part?.slot === slot && owned.includes(value) && !(slot in snapshot)) snapshot[slot] = value;
  }
  // Preserve cosmetic slots as well as gameplay equipment.
  for (const slot of ['paint', 'skin', 'hair', 'haircolor', 'outfit', 'hat']) {
    if (partById(saved[slot])?.slot === slot && owned.includes(saved[slot])) snapshot[slot] = saved[slot];
  }
  const rolls = Array.isArray(raw.rolls) && raw.rolls.length === ROLLS_NEEDED && raw.rolls.every((r) => Number.isFinite(r) && r >= 0 && r < 1)
    ? [...raw.rolls] : legacyRolls(id);
  const rulesVersion = economyVersion(raw.rulesVersion);
  const job = { id, site: raw.site, start: raw.start, end: raw.end, machineId, equippedSnapshot: snapshot, rulesVersion, rolls, desktop: raw.desktop === true };
  if (rulesVersion >= PITY_FROM_VERSION) {
    const limit = pityLimit(siteById(raw.site));
    const n = Math.floor(Number(raw.pity));
    job.pity = limit && Number.isFinite(n) && n > 0 ? Math.min(limit - 1, n) : 0;
  }
  return job;
}
