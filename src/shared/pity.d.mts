import type { Site } from './parts.mjs';
import type { GameState } from './reducer.mjs';
export const PITY_FROM_VERSION: number;
export function pityLimit(site: Site | undefined): number;
export function unownedMachines(site: Site | undefined, owned: string[]): [string, number][];
export function normalizeMachinePity(raw: unknown): Record<string, number>;
export function pityProgress(state: Pick<GameState, 'owned' | 'machinePity'>, siteId: string): { count: number; limit: number; guaranteed: boolean } | null;
