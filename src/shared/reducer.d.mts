export interface Job {
  id: string;
  machineId: string;
  equippedSnapshot: Record<string, string>;
  rulesVersion: number;
  rolls: number[];
  site: string;
  start: number;
  end: number;
}

export interface Drop {
  id: string;
  /** already owned, so it was turned into coins */
  dup: boolean;
  coins?: number;
}

export interface Report {
  jobId?: string;
  machineId?: string;
  breakdown?: { base: number; jackpotBonus: number; equipmentBonus: number; duplicates: number; xp: number; wear: number };
  site: string;
  coins: number;
  /** 0 to 3 parts brought back, and sometimes a whole machine as a fourth */
  drops: Drop[];
  /** a bumper haul: the coins were doubled */
  jackpot: boolean;
  at: number;
  seen: boolean;
}

export interface GameState {
  schemaVersion: number;
  growthClaimed: string[];
  legacySites: string[];
  name: string;
  /** 0..100 */
  mood: number;
  /** server bookkeeping: when mood decay was last applied (ms) */
  moodAt: number;
  /** when you met the pet (ms); only used to carry older saves over to `together` */
  since: number;
  /** days spent together, and the local date (YYYY-MM-DD) of the last one counted */
  together: number;
  lastDay: string;
  /** the largest companionship milestone already celebrated */
  milestone: number;
  xp: number;
  coins: number;
  durability: number;
  owned: string[];
  equipped: Record<string, string>;
  /** the parts each machine type was wearing when you last switched away from it */
  loadouts: Record<string, Record<string, string>>;
  /** custom colours per machine region ("#rrggbb"); a missing region keeps its default colour */
  tint: Record<string, string>;
  job: Job | null;
  report: Report | null;
}

/** Everything a client may ask for. The server decides amounts, time and dice. */
export type ClientAction =
  | { type: 'claimGrowth'; id: string }
  | { type: 'tint'; slot: string; color: string | null }
  | { type: 'dig' }
  | { type: 'wear' }
  | { type: 'rest' }
  | { type: 'poke' }
  | { type: 'rename'; name: string }
  | { type: 'buy'; id: string }
  | { type: 'equip'; id: string }
  | { type: 'repair' }
  | { type: 'startJob'; site: string }
  | { type: 'cancelJob'; jobId: string }
  | { type: 'claim'; jobId: string }
  | { type: 'ackReport' }
  | { type: 'ackMilestone' };

/** Internal actions the reducer understands (a superset of what clients can send). */
export type Action =
  | { type: 'claimGrowth'; id: string }
  | { type: 'tint'; slot: string; color: string | null }
  | { type: 'dig' }
  | { type: 'tick'; now: number }
  | { type: 'wear'; amount: number }
  | { type: 'rest'; amount: number }
  | { type: 'mood'; amount: number }
  | { type: 'poke' }
  | { type: 'rename'; name: string }
  | { type: 'buy'; id: string }
  | { type: 'equip'; id: string }
  | { type: 'repair' }
  | { type: 'startJob'; site: string; now?: number; id?: string; rolls?: number[] }
  | { type: 'cancelJob'; now?: number; jobId?: string }
  | { type: 'claim'; now?: number; jobId?: string }
  | { type: 'ackReport' }
  | { type: 'ackMilestone'; now?: number };

/** [day, coins]: companionship days the pet celebrates, and the gift for each. */
export const MILESTONES: [number, number][];
/** Days spent together: each different day the pet ran counts once, whatever the clock does. */
export function companionDays(state: Pick<GameState, 'together'>): number;

export const DEFAULT_STATE: GameState;
export function normalize(raw: unknown): GameState;
export function repairCost(durability: number): number;
export function partName(id: string): string;
export function siteName(id: string): string;
export function levelInfo(xp: number): { level: number; into: number; need: number };
export function moodLabel(mood: number): string;
export function digCoins(equipped: Record<string, string>): number;
export function stamp(action: Action, now?: number): Action;
export function reduce(state: GameState, action: Action): GameState;
