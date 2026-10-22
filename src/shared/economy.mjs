import { SITES, partById } from './parts.mjs';

// Saved jobs retain their departure version. 2 = accepted M4 economy; 3 = the same economy plus the new-machine guarantee.
export const CURRENT_ECONOMY_VERSION = 3;
export const ECONOMY_VERSIONS = [1, 2, 3];
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
export function duplicateRefund(id, version = CURRENT_ECONOMY_VERSION) {
  const price = partById(id)?.price ?? 60;
  return economyVersion(version) >= 2 ? Math.max(5, Math.min(25, Math.floor(price * 0.25))) : Math.max(10, Math.floor(price * 0.5));
}
