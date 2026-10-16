import Phaser from 'phaser';
import { type PoseName } from '../poses';

export type State =
  | 'idle'
  | 'walk'
  | 'dig'
  | 'drag'
  | 'fall'
  | 'broken'
  | 'leave'
  | 'away'
  | 'return'
  | 'sleep'
  | 'cheer'
  | 'play'
  | 'working'
  | 'waiting';

export interface Particle {
  r: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  g: number;
  life: number;
  fade: number;
}

export const DIG_SEQ: PoseName[] = ['dig0', 'dig1', 'dig2', 'dig3', 'dump0', 'dump1', 'dump1', 'dig0'];
export const DIG_FRAME_MS = 260;

/** How the machine moves while it works a job, by the tool it carries. */
export interface WorkMotion {
  seq: PoseName[];
  frameMs: number;
  /** throws dirt and rubble */
  dirt: boolean;
}

const STRIKE_TOOLS = ['breaker', 'compactor', 'pulverizer', 'shear', 'processor', 'ripper', 'auger'];
const SWEEP_TOOLS = ['mower', 'mulcher', 'treesaw', 'rake', 'cutterhead', 'screen'];
const HANDLE_TOOLS = ['grapple', 'peel', 'log', 'clamshell', 'magnet'];

export function workMotion(tool?: string): WorkMotion {
  // hammering, crushing and drilling: short fast strokes, down and up again
  if (tool && STRIKE_TOOLS.includes(tool)) return { seq: ['dig0', 'dig2', 'dig1', 'dig2', 'dig1', 'dig2', 'dig0'], frameMs: 170, dirt: true };
  // mowing, mulching and raking: slow sweeping passes
  if (tool && SWEEP_TOOLS.includes(tool)) return { seq: ['dig0', 'dig1', 'tinker0', 'dig1', 'dig0', 'tinker1'], frameMs: 320, dirt: false };
  // grabbing and lifting: pick up, swing over, put down
  if (tool && HANDLE_TOOLS.includes(tool)) return { seq: ['dig1', 'dig2', 'dig3', 'dump0', 'dump1', 'dig0'], frameMs: 300, dirt: false };
  return { seq: DIG_SEQ, frameMs: DIG_FRAME_MS, dirt: true };
}
export const WALK_FRAME_MS = 180;
export const WALK_WEAR_PER_SEC = 0.05;
export const SLOW_BELOW = 30;
export const RECOVER_AT = 15;
export const FONT = "'Microsoft YaHei', sans-serif";

/** One frame of a small scripted action: which pose, how long, and optionally a turn or a hop. */
export interface PlayStep {
  pose: PoseName;
  ms: number;
  flip?: boolean;
  hop?: boolean;
}

export const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
