import { DEFAULT_EQUIPPED, MACHINE_SLOTS, PARTS, TINT_SLOTS, partById, siteById } from './parts.mjs';
import { grantsOf, loadoutFor } from './machine.mjs';
import { DATE_RE } from './milestones.mjs';
import { HEX_COLOR, MOOD_FLOOR, NAME_MAX, clamp, num } from './util.mjs';
import { MAX_REPORTS, MAX_SLOTS, normalizeJob } from './jobs.mjs';
import { GROWTH_STAGES, LEGACY_SITES } from './growth.mjs';
import { normalizeMachinePity, pityLimit } from './pity.mjs';

const cleanTint = (raw) => {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const { id } of TINT_SLOTS) {
      const c = typeof raw[id] === 'string' ? raw[id].toLowerCase() : '';
      if (HEX_COLOR.test(c)) out[id] = c;
    }
  }
  return out;
};

const FREE_IDS = PARTS.filter((p) => p.price === 0).map((p) => p.id);

export const DEFAULT_STATE = {
  schemaVersion: 5,
  /** how many jobs may be out at once; the second slot is bought in the garage */
  jobSlots: 1,
  growthClaimed: [],
  legacySites: [],
  /** per site: jobs in a row (rules 3+) that brought no new machine */
  machinePity: {},
  name: '小黃',
  mood: 60,
  moodAt: 0,
  /** when you met, in ms; the server fills it in. Only used to carry older saves over to `together`. */
  since: 0,
  /** days you have spent together (see companionDays) and the local date of the last one counted */
  together: 0,
  lastDay: '',
  /** the largest milestone day already celebrated */
  milestone: 0,
  xp: 0,
  coins: 20,
  durability: 100,
  owned: FREE_IDS,
  equipped: DEFAULT_EQUIPPED,
  /** the parts each machine type was wearing when you last switched away from it */
  loadouts: {},
  /** custom colours per machine region, "#rrggbb"; a missing region keeps its default colour */
  tint: {},
  /** jobs still out, in departure order */
  jobs: [],
  /** latest results, newest first */
  reports: [],
};

function normalizeReport(r) {
  // older saves stored a single `drop` / `dup`; newer ones store a list of drops
  const drops =
    r && Array.isArray(r.drops)
      ? r.drops.filter((d) => d && partById(d.id)).slice(0, 4).map((d) => ({ id: d.id, dup: !!d.dup, ...(Number.isFinite(d.coins) ? { coins: Math.max(0, d.coins) } : {}),
        ...(d.pity === true && partById(d.id).slot === 'machine' ? { pity: true } : {}) }))
      : r && partById(r.drop)
        ? [{ id: r.drop, dup: !!r.dup }]
        : [];
  return r && siteById(r.site)
      ? {
          site: r.site,
          coins: Math.max(0, Math.floor(num(r.coins))),
          drops,
          jackpot: !!r.jackpot,
          at: num(r.at),
          seen: !!r.seen,
          desktop: r.desktop !== false,
          jobId: typeof r.jobId === 'string' ? r.jobId.slice(0, 128) : undefined,
          machineId: partById(r.machineId)?.slot === 'machine' ? r.machineId : undefined,
          breakdown: r.breakdown && typeof r.breakdown === 'object'
            ? Object.fromEntries(['base', 'jackpotBonus', 'equipmentBonus', 'duplicates', 'xp', 'wear'].map((key) => [key, num(r.breakdown[key])])) : undefined,
          ...(r.pity && typeof r.pity === 'object' && pityLimit(siteById(r.site))
            ? { pity: { limit: pityLimit(siteById(r.site)), count: clamp(Math.floor(num(r.pity.count)), 0, pityLimit(siteById(r.site)) - 1) } } : {}),
        }
      : null;
}

export function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const owned = new Set(FREE_IDS);
  if (Array.isArray(s.owned)) for (const id of s.owned) if (partById(id)) owned.add(id);
  const saved = s.equipped && typeof s.equipped === 'object' ? s.equipped : {};
  // saves from before machine types existed: wheels only fit the wheeled machine, so move such a save there
  if (!saved.machine && saved.tracks === 'tracks_wheels' && owned.has('tracks_wheels')) {
    owned.add('m_wheeled');
    saved.machine = 'm_wheeled';
  }
  // owning a machine type means owning the parts it comes with
  for (const id of [...owned]) if (partById(id)?.slot === 'machine') for (const g of grantsOf(id)) owned.add(g);
  const ownedList = [...owned];
  const equipped = { ...DEFAULT_EQUIPPED };
  for (const [slot, id] of Object.entries(saved)) {
    const p = partById(id);
    if (p && p.slot === slot && owned.has(id) && !MACHINE_SLOTS.includes(slot)) equipped[slot] = id;
  }
  const machine = partById(saved.machine)?.slot === 'machine' && owned.has(saved.machine) ? saved.machine : 'm_std';
  Object.assign(equipped, { machine }, loadoutFor(machine, ownedList, saved));
  const loadouts = {};
  if (s.loadouts && typeof s.loadouts === 'object') {
    for (const [id, parts] of Object.entries(s.loadouts)) {
      if (id !== machine && owned.has(id) && partById(id)?.slot === 'machine') loadouts[id] = loadoutFor(id, ownedList, parts);
    }
  }
  // older saves held a single job and a single report
  // a single job from before slots always ran on the desktop
  const rawJobs = Array.isArray(s.jobs) ? s.jobs : s.job ? [{ ...s.job, desktop: true }] : [];
  const jobSlots = Math.floor(num(s.jobSlots)) >= MAX_SLOTS ? MAX_SLOTS : 1;
  const jobs = [];
  for (const raw of rawJobs) {
    if (jobs.length >= jobSlots) break;
    const job = normalizeJob(raw, equipped, ownedList);
    // one job per machine, per site and per id; anything else could pay or count twice
    if (job && !jobs.some((j) => j.id === job.id || j.machineId === job.machineId || j.site === job.site)) {
      jobs.push(jobs.some((j) => j.desktop) ? { ...job, desktop: false } : job);
    }
  }
  const rawReports = Array.isArray(s.reports) ? s.reports : s.report ? [s.report] : [];
  const reports = rawReports.map(normalizeReport).filter((r, i, all) => r && (!r.jobId || all.findIndex((o) => o?.jobId === r.jobId) === i)).slice(0, MAX_REPORTS);
  const name = typeof s.name === 'string' ? s.name.trim().slice(0, NAME_MAX) : '';
  return {
    schemaVersion: 5,
    jobSlots,
    growthClaimed: [...new Set(Array.isArray(s.growthClaimed) ? s.growthClaimed.filter((id) => GROWTH_STAGES.some((g) => g.id === id)) : [])],
    legacySites: Object.keys(s).length && num(s.schemaVersion) < 3 ? [...LEGACY_SITES]
      : [...new Set(Array.isArray(s.legacySites) ? s.legacySites.filter((id) => LEGACY_SITES.includes(id)) : [])],
    machinePity: normalizeMachinePity(s.machinePity),
    name: name || DEFAULT_STATE.name,
    mood: clamp(num(s.mood, DEFAULT_STATE.mood), MOOD_FLOOR, 100),
    moodAt: Math.max(0, num(s.moodAt)),
    since: Math.max(0, num(s.since)),
    together: Math.max(0, Math.floor(num(s.together))),
    lastDay: typeof s.lastDay === 'string' && DATE_RE.test(s.lastDay) ? s.lastDay : '',
    milestone: Math.max(0, Math.floor(num(s.milestone))),
    xp: Math.max(0, Math.floor(num(s.xp))),
    coins: Math.max(0, Math.floor(num(s.coins, DEFAULT_STATE.coins))),
    durability: clamp(num(s.durability, 100), 0, 100),
    owned: ownedList,
    equipped,
    loadouts,
    tint: cleanTint(s.tint),
    jobs,
    reports,
  };
}
