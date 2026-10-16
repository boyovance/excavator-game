import type { GameState, Report } from './reducer.mjs';
import type { Site } from './parts.mjs';
export interface GrowthStage { id: string; level: number; coins: number; sites: string[] }
export const GROWTH_STAGES: GrowthStage[];
export const LEGACY_SITES: string[];
export function xpForLevel(level: number): number;
export function siteLevel(id: string): number;
export function siteUnlocked(state: Pick<GameState, 'xp' | 'legacySites'>, id: string): boolean;
export function canVisitSite(state: GameState, site: Site | undefined): boolean;
export function claimGrowth(state: GameState, id: string): GameState;
export interface DispatchGrowth { from: number; to: number; stages: GrowthStage[]; sites: string[]; report: Report }
export function dispatchGrowth(before: GameState, after: GameState, jobId: string): DispatchGrowth | null;
