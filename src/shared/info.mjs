import { partById, siteById } from './parts.mjs';

export const repairCost = (durability) => Math.ceil((100 - durability) * 0.3);
export const partName = (id) => partById(id)?.name ?? id;
export const siteName = (id) => siteById(id)?.name ?? id;

export function levelInfo(xp) {
  const level = 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 20));
  const base = 20 * (level - 1) ** 2;
  const next = 20 * level ** 2;
  return { level, into: xp - base, need: next - base };
}

export function moodLabel(mood) {
  if (mood >= 85) return '很開心';
  if (mood >= 70) return '開心';
  return '平靜';
}
