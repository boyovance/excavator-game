import { SITES, partById } from './parts.mjs';

// Candidate data is opt-in for the balance sandbox. Production always starts v1 jobs.
export const ECONOMY_VERSIONS = [1, 2];
export const economyVersion = (version) => ECONOMY_VERSIONS.includes(version) ? version : 1;
const CANDIDATE = {
  yard: { coins: [12, 32] }, alley: { coins: [42, 78] },
  quarry: { coins: [85, 155], xp: 75 }, scrap: { coins: [80, 160] },
  river: { coins: [150, 230] }, slope: { coins: [220, 320] },
  rail: { coins: [90, 140] }, mine: { coins: [300, 700] },
};
const previewSites = SITES.map((site) => ({ ...site, ...CANDIDATE[site.id] }));
export const economySites = (version = 1) => economyVersion(version) === 2 ? previewSites : SITES;
export const economySite = (id, version = 1) => economySites(version).find((s) => s.id === id);
export const departureDurability = (site, version = 1) => economyVersion(version) === 2 ? site.wear : 1;
export function duplicateRefund(id, version = 1) {
  const price = partById(id)?.price ?? 60;
  return economyVersion(version) === 2 ? Math.max(5, Math.min(25, Math.floor(price * 0.25))) : Math.max(10, Math.floor(price * 0.5));
}
