import Phaser from 'phaser';
import { H } from '../skins/types';
import { siteName, type GameState, type Job } from '../shared/reducer.mjs';
import { FONT } from './constants';
import type { SceneHost } from './host';

/** The bar and clock above the pet while it is out on a job. */
export class Progress {
  private bar?: Phaser.GameObjects.Graphics;
  private label?: Phaser.GameObjects.Text;

  constructor(private host: SceneHost) {}

  enter() {
    const { scene, scalePx } = this.host;
    this.bar ??= scene.add.graphics().setDepth(9);
    this.label ??= scene.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: `${Math.max(11, scalePx * 3.6)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#2b2b2b',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(9);
  }

  leave() {
    this.bar?.destroy();
    this.label?.destroy();
    this.bar = undefined;
    this.label = undefined;
  }

  draw(job: Job | null) {
    const s = this.host.sprite;
    if (!job || !s || !this.bar || !this.label) return;
    const { scalePx } = this.host;
    const total = Math.max(1, job.end - job.start);
    const left = Math.max(0, job.end - Date.now());
    const pct = Phaser.Math.Clamp(1 - left / total, 0, 1);
    const w = Math.round(22 * scalePx);
    const h = Math.max(5, Math.round(scalePx * 1.8));
    const x = s.x - w / 2;
    const y = s.y - H * scalePx - h - 4;
    this.bar
      .clear()
      .fillStyle(0x000000, 0.45)
      .fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 3)
      .fillStyle(0xffd54a, 1)
      .fillRect(x, y, w * pct, h);
    const sec = Math.ceil(left / 1000);
    const clock = left > 0 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '待領取';
    this.label.setText(`${siteName(job.site)}  ${clock}`).setPosition(s.x, y - 4);
  }
}
