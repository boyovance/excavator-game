import { SITES, partById } from './parts.mjs';

// Saved jobs retain their departure version. 2 = accepted M4 economy; 3 = plus the new-machine guarantee;
// 4 = plus the scrap yard's recycling specialty.
export const CURRENT_ECONOMY_VERSION = 4;
export const ECONOMY_VERSIONS = [1, 2, 3, 4];
export const economyVersion = (version) => ECONOMY_VERSIONS.includes(version) ? version : 1;
const CANDIDATE = {
  yard: { coins: [12, 32] }, alley: { coins: [42, 78] },
  quarry: { coins: [85, 155], xp: 75 }, scrap: { coins: [80, 160] },
  river: { coins: [150, 230] }, slope: { coins: [220, 320] },
  rail: { coins: [90, 140] }, mine: { coins: [300, 700] },
};
const previewSites = SITES.map((site) => ({ ...site, ...CANDIDATE[site.id] }));
export const economySites = (version = CURRENT_ECONOMY_VERSION) => economyVersion(version) >= 2 ? previewSites : SITES;
export const economySite = (id, version = CURRENT_ECONOMY_VERSION) => economySites(version).find((s) => s.id === id);
export const departureDurability = (site, version = CURRENT_ECONOMY_VERSION) => economyVersion(version) >= 2 ? site.wear : 1;
const RECYCLING_SITES = ['scrap'];
/** How a duplicate part is turned into coins: a share of its price, clamped. Rules 1 had no upper bound. */
export function refundRule(siteId, version = CURRENT_ECONOMY_VERSION) {
  const v = economyVersion(version);
  if (v === 1) return { rate: 0.5, min: 10, max: Infinity };
  if (v >= 4 && RECYCLING_SITES.includes(siteId)) return { rate: 0.5, min: 10, max: 50, recycling: true };
  return { rate: 0.25, min: 5, max: 25 };
}
export function duplicateRefund(id, version = CURRENT_ECONOMY_VERSION, siteId) {
  const price = partById(id)?.price ?? 60;
  const { rate, min, max } = refundRule(siteId, version);
  return Math.max(min, Math.min(max, Math.floor(price * rate)));
}
