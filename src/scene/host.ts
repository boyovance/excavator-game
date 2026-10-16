import type Phaser from 'phaser';
import type { PoseName } from '../poses';
import type { Build, Skin } from '../skins/types';

/** What the helper classes need from the scene, so they never reach into its private state. */
export interface SceneHost {
  readonly scene: Phaser.Scene;
  readonly sprite: Phaser.GameObjects.Image | undefined;
  readonly scalePx: number;
  readonly ground: number;
  readonly skin: Skin;
  readonly build: Build;
  readonly pose: PoseName | '';
  readonly working: boolean;
  say(text: string, ms?: number): void;
}
