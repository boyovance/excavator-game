import Phaser from 'phaser';
import type { ActionName } from '../api';
import { dayPeriod } from '../shared/lines.mjs';
import type { PlayStep } from './constants';

/** Small scripted actions. They run from idle (or walking), never over a job, a nap or a breakdown. */
export function actionSteps(name: ActionName, facing: boolean): PlayStep[] {
  switch (name) {
    case 'stretch':
      return [
        { pose: 'stretch0', ms: 700 },
        { pose: 'stretch1', ms: 500 },
        { pose: 'stretch0', ms: 500 },
        { pose: 'stretch1', ms: 500 },
        { pose: 'idle', ms: 300 },
      ];
    case 'wave':
      return [
        { pose: 'wave0', ms: 260 },
        { pose: 'wave1', ms: 260 },
        { pose: 'wave0', ms: 260 },
        { pose: 'wave1', ms: 260 },
        { pose: 'wave0', ms: 260 },
        { pose: 'wave1', ms: 260 },
        { pose: 'idle', ms: 200 },
      ];
    case 'tinker':
      return [
        { pose: 'tinker0', ms: 320 },
        { pose: 'tinker1', ms: 160 },
        { pose: 'tinker0', ms: 320 },
        { pose: 'tinker1', ms: 160 },
        { pose: 'tinker0', ms: 320 },
        { pose: 'tinker1', ms: 160 },
        { pose: 'idle', ms: 300 },
      ];
    case 'look':
      return [
        { pose: 'idle', ms: 900, flip: !facing },
        { pose: 'idle', ms: 900, flip: facing },
        { pose: 'idle', ms: 700, flip: !facing },
        { pose: 'idle', ms: 600, flip: facing },
      ];
    case 'hop':
      return [
        { pose: 'cheer0', ms: 420, hop: true },
        { pose: 'cheer1', ms: 420, hop: true },
        { pose: 'cheer0', ms: 420, hop: true },
      ];
  }
}

export interface ActionHandlers {
  walk(): void;
  dig(): void;
  idle(ms: number): void;
  nodOff(): void;
  cheer(ms: number): void;
  act(name: ActionName): void;
}

/** Weighted pick; the weights are where mood / time of day / wear shape the pet's personality. */
export function chooseAction(mood: number, durability: number, run: ActionHandlers) {
  const hour = new Date().getHours();
  const night = hour >= 23 || hour < 6;
  const act = (name: ActionName) => () => run.act(name);
  const table: [number, () => void][] = [
    [55, () => run.walk()],
    [mood >= 70 ? 43 : 33, () => run.dig()],
    [12, () => run.idle(Phaser.Math.Between(1500, 3500))],
    [night ? 25 : 3, () => run.nodOff()],
    [mood >= 70 ? 6 : 0, () => run.cheer(1600)],
    // small actions: morning stretches, tinkering when worn, waving and hopping when happy
    [night ? 2 : dayPeriod(hour) === 'morning' ? 9 : 4, act('stretch')],
    [mood >= 70 ? 6 : 3, act('wave')],
    [durability < 70 ? 9 : 4, act('tinker')],
    [5, act('look')],
    [mood >= 70 ? 5 : 0, act('hop')],
  ];
  const total = table.reduce((n, [w]) => n + w, 0);
  let t = Math.random() * total;
  for (const [w, go] of table) {
    t -= w;
    if (t < 0) {
      go();
      return;
    }
  }
  run.idle(1500);
}
