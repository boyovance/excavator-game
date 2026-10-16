export type Period = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export const MAX_LINE_LENGTH: number;
export function dayPeriod(hour: number): Period;

export const GREETING: Record<Period, string[]>;
export const IDLE: Record<Period | 'general' | 'worn', string[]>;
export const POKE: Record<'happy' | 'calm' | 'ticklish' | 'dizzy' | 'woken' | 'broken', string[]>;
export const WORK: {
  start(site: string): string[];
  busyEarly: string[];
  digDone: string[];
  recalled: string[];
};
export const SLEEP: { sleepy: string[]; wake: string[] };
export function LEVEL_UP(level: number): string[];
export const REPAIR: string[];
export const EQUIP: Record<string, string[]>;
export const ACTION: Record<'stretch' | 'wave' | 'tinker' | 'look' | 'hop', string[]>;
export const MILESTONE: Record<number, string>;
