import { levelInfo } from './info.mjs';
import { SITES, siteOpenTo } from './parts.mjs';

export const GROWTH_STAGES = [
  { id: 'level-2', level: 2, coins: 20, sites: ['alley'] },
  { id: 'level-3', level: 3, coins: 30, sites: ['quarry', 'scrap'] },
  { id: 'level-4', level: 4, coins: 40, sites: ['river', 'rail'] },
  { id: 'level-5', level: 5, coins: 50, sites: ['slope'] },
  { id: 'level-6', level: 6, coins: 60, sites: ['mine'] },
];
// Explicit migration list: future sites must not become grandfathered by accident.
export const LEGACY_SITES = ['yard', 'alley', 'quarry', 'scrap', 'river', 'slope', 'rail', 'mine'];
export const xpForLevel = (level) => 20 * (level - 1) ** 2;
export const siteLevel = (id) => GROWTH_STAGES.find((s) => s.sites.includes(id))?.level ?? 1;
export function siteUnlocked(state, id) {
  return SITES.some((s) => s.id === id) &&
    (levelInfo(state.xp).level >= siteLevel(id) || (state.legacySites ?? []).includes(id));
}
export const canVisitSite = (state, site) => !!site && siteUnlocked(state, site.id) && siteOpenTo(site, state.equipped.machine);
export function claimGrowth(state, id) {
  const stage = GROWTH_STAGES.find((s) => s.id === id);
  if (!stage || state.xp < xpForLevel(stage.level) || state.growthClaimed.includes(id)) return state;
  return { ...state, coins: state.coins + stage.coins, growthClaimed: [...state.growthClaimed, id] };
}

/** Derive the transition from the committed report, never from a render/SSE event. */
export function dispatchGrowth(before, after, jobId) {
  const report = after.reports.find((r) => r.jobId === jobId);
  if (!before.jobs.some((j) => j.id === jobId) || !report?.breakdown) return null;
  const previousXp = Math.max(0, after.xp - report.breakdown.xp);
  const from = levelInfo(previousXp).level;
  const to = levelInfo(after.xp).level;
  if (to <= from) return null;
  const stages = GROWTH_STAGES.filter((g) => g.level > from && g.level <= to);
  const sites = stages.flatMap((g) => g.sites).filter((id) => !siteUnlocked({ ...before, xp: previousXp }, id));
  return { from, to, stages, sites, report };
}
