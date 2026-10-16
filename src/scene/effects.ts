import Phaser from 'phaser';
import { armPoints, toCanvas } from '../geometry';
import { POSES, type PoseName } from '../poses';
import { H, W } from '../skins/types';
import { SLOW_BELOW, type Particle, type State } from './constants';
import type { SceneHost } from './host';

/** Dirt, smoke, sleep Zs and coin pops, plus the particles that other effects hand over. */
export class Effects {
  private particles: Particle[] = [];
  private smokeTimer = 0;

  constructor(private host: SceneHost) {}

  add(p: Particle) {
    this.particles.push(p);
  }

  /** world position of a point given in sprite-local logical units */
  private worldPoint(lx: number, ly: number) {
    const s = this.host.sprite!;
    const dir = s.flipX ? -1 : 1;
    return {
      x: s.x + (lx - W / 2) * this.host.scalePx * dir,
      y: s.y - (H - ly) * this.host.scalePx,
    };
  }

  spawnDirt(pose: PoseName, count: number, speedY: [number, number], speedX: [number, number]) {
    const { scene, build, skin, scalePx } = this.host;
    const p3 = toCanvas(armPoints(POSES[pose], build).p3, build);
    const { x, y } = this.worldPoint(p3.x, p3.y);
    const dir = this.host.sprite!.flipX ? -1 : 1;
    const size = Math.max(2, Math.round(scalePx * 0.9));
    for (let i = 0; i < count; i++) {
      const color = Phaser.Display.Color.HexStringToColor(Phaser.Utils.Array.GetRandom(skin.dirt)).color;
      this.particles.push({
        r: scene.add.rectangle(x, y, size, size, color),
        vx: dir * Phaser.Math.Between(speedX[0], speedX[1]),
        vy: -Phaser.Math.Between(speedY[0], speedY[1]),
        g: 900,
        life: 900,
        fade: 300,
      });
    }
  }

  private spawnSmoke() {
    const { x, y } = this.worldPoint(16.5, 15 + (this.host.pose === 'walk1' ? 1 : 0));
    const size = Math.max(3, Math.round(this.host.scalePx * 1.4));
    const shade = Phaser.Math.Between(0x80, 0xb0);
    const color = (shade << 16) | (shade << 8) | shade;
    this.particles.push({
      r: this.host.scene.add.rectangle(x, y, size, size, color),
      vx: Phaser.Math.Between(-12, 12),
      vy: -Phaser.Math.Between(25, 45),
      g: 0,
      life: 1100,
      fade: 700,
    });
  }

  spawnZ() {
    const { scene, scalePx } = this.host;
    const { x, y } = this.worldPoint(30, 10);
    const z = scene.add
      .text(x, y, 'z', {
        fontFamily: 'monospace',
        fontSize: `${Math.round(scalePx * 5)}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#2f4258',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
    scene.tweens.add({
      targets: z,
      y: y - scalePx * 14,
      x: x + scalePx * 4,
      alpha: 0,
      duration: 1800,
      onComplete: () => z.destroy(),
    });
  }

  popCoins(amount: number) {
    const { scene, build, scalePx } = this.host;
    const p3 = toCanvas(armPoints(POSES.dig3, build).p3, build);
    const { x, y } = this.worldPoint(p3.x, p3.y);
    const text = scene.add
      .text(x, y - 8, `+${amount}`, {
        fontFamily: 'monospace',
        fontSize: `${Math.round(scalePx * 5)}px`,
        fontStyle: 'bold',
        color: '#ffd54a',
        stroke: '#5a3d00',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
    scene.tweens.add({
      targets: text,
      y: y - 8 - scalePx * 14,
      alpha: 0,
      duration: 1000,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  updateParticles(dt: number) {
    this.particles = this.particles.filter((p) => {
      p.life -= dt * 1000;
      p.vy += p.g * dt;
      p.r.x += p.vx * dt;
      p.r.y += p.vy * dt;
      p.r.alpha = Math.min(1, p.life / p.fade);
      if (p.life <= 0 || (p.g > 0 && p.r.y >= this.host.ground)) {
        p.r.destroy();
        return false;
      }
      return true;
    });
  }

  updateSmoke(delta: number, durability: number, state: State) {
    if (durability >= SLOW_BELOW || state === 'drag' || state === 'away') return;
    this.smokeTimer -= delta;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = durability <= 0 ? 220 : 650;
      this.spawnSmoke();
    }
  }
}
