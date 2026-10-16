import type { Part } from './parts.mjs';
import type { GameState } from './reducer.mjs';
export type CatalogFilter = 'all' | 'owned' | 'missing' | 'shop' | 'work';
export interface PartSource { kind: 'initial' | 'shop' | 'machine' | 'site'; id: string; name: string; available: boolean; note: string }
export function buyable(part: Part): boolean;
export function previewEquipment(state: GameState, id: string): Record<string, string> | null;
export function equipmentStats(equipped: Record<string, string>, durability?: number): { dig: number; job: number; speed: number };
export function partSources(part: Part, machineId: string, state?: Pick<GameState, 'xp' | 'legacySites'>): PartSource[];
export function catalogParts(state: GameState, options: { slot: string; query?: string; filter?: CatalogFilter; compatibleOnly?: boolean }): Part[];
