import Phaser from 'phaser';
import { POSES } from '../poses';
import { drawPose } from '../render';
import { H, W, type Build } from '../skins/types';
import { machineDefaults, partById } from '../shared/parts.mjs';
import type { Drop, Report } from '../shared/reducer.mjs';
import { FONT } from './constants';
import type { Effects } from './effects';
import type { SceneHost } from './host';
import { drawPartIcon } from './partIcon';

/** The part cards that pop out of the pet after a job. */
export class Loot {
  private loot: Phaser.GameObjects.Image[] = [];
  private lootEvents: Phaser.Time.TimerEvent[] = [];

  constructor(
    private host: SceneHost,
    private effects: Effects,
  ) {}

  get cards() {
    return this.loot;
  }

  /** One card per dropped part, popping out of the pet in a row. Click a card to put it away. */
  spawn(r: Report) {
    const s = this.host.sprite;
    if (!s || r.drops.length === 0) return;
    this.destroy();

    const gap = 132;
    const span = 80 + (r.drops.length - 1) * gap + 130;
    const dir = s.x < this.host.scene.scale.width - span - 40 ? 1 : -1;
    r.drops.forEach((drop, index) => this.spawnCard(drop, index, dir, gap));
  }

  private spawnCard(drop: Drop, index: number, dir: number, gap: number) {
    const { scene, skin, build, scalePx, ground } = this.host;
    const part = partById(drop.id);
    const s = this.host.sprite;
    if (!part || !s) return;

    const key = `loot-card-${index}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.createCanvas(key, 248, 176);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#fffbe8';
    ctx.strokeStyle = '#2b2113';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(3, 3, 242, 170, 18);
    ctx.fill();
    ctx.stroke();

    // the part on its own; machines (and anything without a picture of its own) show the whole machine
    if (!drawPartIcon(ctx, part)) {
      if (skin.supportsParts === false) {
        // fixed pictures cannot show the part, so draw a gift box instead
        ctx.fillStyle = '#e5493a';
        ctx.fillRect(74, 56, 100, 70);
        ctx.fillStyle = '#ffd54a';
        ctx.fillRect(116, 56, 16, 70);
        ctx.fillRect(74, 84, 100, 14);
        ctx.fillRect(100, 38, 48, 18);
      } else {
        const off = document.createElement('canvas');
        off.width = Math.ceil(W * skin.res);
        off.height = Math.ceil(H * skin.res);
        const shown = part.slot === 'machine' ? { ...build, machine: part.id, ...machineDefaults(part.id) } : { ...build, [part.slot]: part.id };
        drawPose(off.getContext('2d')!, skin, POSES.idle, shown as Build, 'idle');
        ctx.imageSmoothingEnabled = skin.smooth;
        ctx.drawImage(off, 16, 14, 216, 120);
      }
    }

    ctx.fillStyle = drop.dup ? '#78909c' : '#e53935';
    ctx.beginPath();
    ctx.roundRect(10, 10, drop.dup ? 72 : 56, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(drop.dup ? '重複' : '新!', drop.dup ? 46 : 38, 34);
    ctx.fillStyle = '#2b2113';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(part.name, 124, 164);
    tex.refresh();

    const restX = s.x + dir * (72 * scalePx * 0.5 + 80 + index * gap);
    const restY = ground - 6;
    const item = scene.add
      .image(s.x, s.y - H * scalePx * 0.6, key)
      .setOrigin(0.5, 1)
      .setScale(0.1)
      .setDepth(8 + index)
      .setInteractive({ useHandCursor: true });
    this.loot.push(item);
    const alive = () => this.loot.includes(item);

    // each card pops out a little after the previous one
    const delay = index * 220;
    const peak = item.y - 70;
    scene.tweens.add({ targets: item, x: restX, scale: 0.5, duration: 900, delay, ease: 'Sine.easeOut' });
    scene.tweens.add({
      targets: item,
      y: peak,
      duration: 320,
      delay,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!alive()) return;
        scene.tweens.add({
          targets: item,
          y: restY,
          duration: 650,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            if (!alive()) return;
            scene.tweens.add({ targets: item, y: restY - 5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          },
        });
      },
    });

    this.lootEvents.push(
      scene.time.addEvent({
        delay: 330,
        loop: true,
        callback: () => {
          if (!alive()) return;
          const size = Math.max(3, Math.round(this.host.scalePx * 1.2));
          this.effects.add({
            r: scene.add.rectangle(item.x + Phaser.Math.Between(-60, 60), item.y - Phaser.Math.Between(10, 80), size, size, 0xffe08a),
            vx: Phaser.Math.Between(-8, 8),
            vy: -Phaser.Math.Between(20, 45),
            g: 0,
            life: 800,
            fade: 500,
          });
        },
      }),
      scene.time.delayedCall(12_000, () => {
        if (!alive()) return;
        scene.tweens.add({ targets: item, alpha: 0, duration: 900, onComplete: () => this.removeCard(item) });
      }),
    );

    item.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.button !== 0 || p.getDistance() > 6) return;
      // the part is already in the warehouse; clicking just tidies the card away
      scene.tweens.killTweensOf(item);
      scene.tweens.add({
        targets: item,
        x: s.x,
        y: s.y - H * this.host.scalePx * 0.5,
        scale: 0.08,
        alpha: 0.2,
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => {
          this.removeCard(item);
          this.host.say(drop.dup ? `「${part.name}」重複了,已折算成金幣` : `「${part.name}」已收進倉庫`, 2600);
        },
      });
    });
  }

  private removeCard(item: Phaser.GameObjects.Image) {
    this.host.scene.tweens.killTweensOf(item);
    this.loot = this.loot.filter((c) => c !== item);
    item.destroy();
    if (this.loot.length === 0) this.stopTimers();
  }

  private stopTimers() {
    for (const e of this.lootEvents) e.remove(false);
    this.lootEvents = [];
  }

  destroy() {
    this.stopTimers();
    for (const item of this.loot) {
      this.host.scene.tweens.killTweensOf(item);
      item.destroy();
    }
    this.loot = [];
  }
}
