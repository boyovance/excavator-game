import Phaser from 'phaser';
import { H } from '../skins/types';
import { FONT } from './constants';
import type { SceneHost } from './host';

/** The speech bubble above the pet. */
export class Speech {
  private bubble?: Phaser.GameObjects.Container;
  private bubbleHalfWidth = 0;

  constructor(private host: SceneHost) {}

  show(text: string, ms: number) {
    const { scene } = this.host;
    this.bubble?.destroy();

    const label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT,
        fontSize: `${Math.max(14, this.host.scalePx * 4.8)}px`,
        fontStyle: 'bold',
        color: '#2b2113',
        align: 'center',
      })
      .setOrigin(0.5, 1);
    const padX = 12;
    const padY = 7;
    const tail = 8;
    const w = label.width + padX * 2;
    const h = label.height + padY * 2;
    label.setPosition(0, -tail - padY);

    // a dark outline keeps the bubble readable on both light and dark desktops
    const body = scene.add.graphics();
    body.fillStyle(0xfffbe8, 1).lineStyle(2.5, 0x2b2113, 1);
    body.fillRoundedRect(-w / 2, -tail - h, w, h, 9).strokeRoundedRect(-w / 2, -tail - h, w, h, 9);
    body.fillTriangle(-6, -tail - 1, 6, -tail - 1, 0, 0).lineBetween(-6, -tail, 0, 0).lineBetween(6, -tail, 0, 0);

    const bubble = scene.add.container(0, 0, [body, label]).setDepth(10);
    this.bubbleHalfWidth = w / 2;
    this.bubble = bubble;
    this.place();
    scene.time.delayedCall(ms, () => {
      if (this.bubble === bubble) this.bubble = undefined;
      bubble.destroy();
    });
  }

  place() {
    const { sprite, scene, scalePx } = this.host;
    if (!this.bubble || !sprite) return;
    const half = this.bubbleHalfWidth + 4;
    this.bubble.x = Phaser.Math.Clamp(sprite.x, half, Math.max(half, scene.scale.width - half));
    // leave room for the progress bar while working
    this.bubble.y = sprite.y - H * scalePx - (this.host.working ? 8 + 8 * scalePx : 6);
  }
}
