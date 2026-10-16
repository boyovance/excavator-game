import type Phaser from 'phaser';
import type { SceneHost } from './host';
import { drawScenery } from './sceneryArt';

/** The place the pet is working at, drawn behind and beside it while a job runs. */
export class Scenery {
  private g?: Phaser.GameObjects.Graphics;
  private site = '';
  private drawnAt = 0;

  constructor(private host: SceneHost) {}

  show(site: string) {
    this.hide();
    this.site = site;
    this.g = this.host.scene.add.graphics().setDepth(-1);
    this.drawnAt = 0;
    this.update();
  }

  hide() {
    this.g?.destroy();
    this.g = undefined;
    this.site = '';
  }

  /** Follows the pet, and is redrawn when the pet changes size. */
  update() {
    const s = this.host.sprite;
    if (!this.g || !s) return;
    if (this.drawnAt !== this.host.scalePx) {
      drawScenery(this.g, this.site, this.host.scalePx);
      this.drawnAt = this.host.scalePx;
    }
    this.g.setPosition(s.x, s.y);
  }
}
