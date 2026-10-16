import type { GameState } from './reducer.mjs';
import type { Part } from './parts.mjs';
export interface SampleOptions { machine?: string; loadout?: string; collection?: string; siteId: string; version?: number; samples?: number; seed?: number }
export interface BalanceRow { machine: string; loadout: string; collection: string; siteId: string; name: string; version: number; samples: number; seed: number; minutes: number; multiplier: number; mean: Record<string, number>; minNet: number; hourly: { net: number; xp: number; parts: number; newParts: number; machines: number }; operationsPerHour: number }
export const MACHINES: Part[];
export function seededRandom(seed?: number): () => number;
export function dice(random: () => number): number[];
export function scenario(machine?: string, loadout?: string, collection?: string): GameState;
export function simulateTrip(state: GameState, siteId: string, version: number, random: () => number, time?: number, id?: string): { state: GameState; accepted: boolean; minutes: number };
export function sampleSite(options: SampleOptions): BalanceRow | null;
export function comparison(options?: Omit<SampleOptions, 'siteId' | 'version'>): BalanceRow[][];
export function firstPurchase(options?: { version?: number; samples?: number; seed?: number }): { version: number; samples: number; seed: number; completed: number; failures: number; p50Minutes: number | null; p90Minutes: number | null };
export function machineWait(siteId: string, machine?: string, version?: number): { siteId: string; machine: string; chance: number; eligible: string[]; p50Hours: number; p90Hours: number } | null;
export function dominance(rows: BalanceRow[]): { better: string; worse: string }[];
export function targetMachineTime(options: { siteId: string; machine: string; target: string; version?: number; samples?: number; seed?: number }): { version: number; siteId: string; machine: string; target: string; samples: number; seed: number; completed: number; censored: number; p50Hours: number | null; p90Hours: number | null; windowHours: number } | null;
export function maintenanceRun(version: number, trips?: number): { version: number; requested: number; completed: number; durability: number; coins: number };
