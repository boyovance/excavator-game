import type { Pose } from './skins/types';

export const POSES = {
  idle: { track: 0, bob: 0, boom: 40, stick: -40, bucket: -80 },
  walk0: { track: 0, bob: 0, boom: 40, stick: -40, bucket: -80 },
  walk1: { track: 1, bob: 1, boom: 40, stick: -40, bucket: -80 },
  dig0: { track: 0, bob: 0, boom: 35, stick: -40, bucket: -70 },
  dig1: { track: 0, bob: 0, boom: 18, stick: -60, bucket: -100 },
  dig2: { track: 0, bob: 0, boom: 5, stick: -70, bucket: -125 },
  dig3: { track: 0, bob: 0, boom: 28, stick: -25, bucket: -155, load: true },
  lift: { track: 0, bob: 0, boom: 15, stick: -80, bucket: -100 },
  broken: { track: 0, bob: 0, boom: 8, stick: -85, bucket: -110 },
  sleep: { track: 0, bob: 0, boom: 2, stick: -72, bucket: -120 },
  dump0: { track: 0, bob: 0, boom: 42, stick: -15, bucket: -150, load: true },
  dump1: { track: 0, bob: 0, boom: 42, stick: -15, bucket: -60 },
  cheer0: { track: 0, bob: 0, boom: 45, stick: 5, bucket: -40 },
  cheer1: { track: 0, bob: 1, boom: 36, stick: -5, bucket: -40 },
  stretch0: { track: 0, bob: 0, boom: 62, stick: 10, bucket: -10 },
  stretch1: { track: 0, bob: 0, boom: 58, stick: 5, bucket: -20 },
  wave0: { track: 0, bob: 0, boom: 46, stick: 18, bucket: -35 },
  wave1: { track: 0, bob: 0, boom: 46, stick: 0, bucket: -55 },
  tinker0: { track: 0, bob: 0, boom: 14, stick: -52, bucket: -80 },
  tinker1: { track: 0, bob: 0, boom: 5, stick: -68, bucket: -100 },
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;
