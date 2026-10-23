import Phaser from 'phaser';
import { POSES, type PoseName } from '../poses';
import { drawPose } from '../render';
import { H, W, type Build, type Skin } from '../skins/types';
import { partById } from '../shared/parts.mjs';
import { siteName, type Job } from '../shared/reducer.mjs';
import { FONT, workMotion, type WorkMotion } from './constants';

/** The garage machine out on a second slot is drawn this much smaller than the desktop pet. */
export const COMPANION_SCALE = 0.6;
const PREFIX = 'exc-c-';
const GAP = 6;
const FOLLOW_PX_PER_SEC = 160;

/**
 * A second, smaller machine standing beside the pet while it works a garage job.
 * Presentation only: it never claims, never takes the mouse, and keeps its own textures.
 */
export class Companion {
  private sprite?: Phaser.GameObjects.Image;
  private bar?: Phaser.GameObjects.Graphics;
  private label?: Phaser.GameObjects.Text;
  private job: Job | null = null;
  private drawn = '';
  private scalePx = 1;
  private motion: WorkMotion = workMotion();
  private pose: PoseName | '' = '';
  private idx = 0;
  private frameTimer = 0;
  private side = 1;

  constructor(private scene: Phaser.Scene) {}

  /** Show, update or remove the companion for the current garage job. */
  sync(job: Job | null, tint: Record<string, string>, skin: Skin, sizeSetting: number, near?: { x: number; width: number }) {
    if (!job) { this.remove(); return; }
    const build = { ...job.equippedSnapshot, tint } as unknown as Build;
    const signature = JSON.stringify([build, skin.id, skin.res]);
    if (signature !== this.drawn) {
      this.drawTextures(skin, build);
      this.drawn = signature;
      this.pose = '';
    }
    this.job = job;
    this.motion = workMotion(partById(build.bucket)?.shape?.tool);
    this.scalePx = sizeSetting * (partById(job.machineId)?.machine?.size ?? 1) * COMPANION_SCALE;
    if (!this.sprite) {
      const width = this.scene.scale.width;
      const start = near ? near.x : width * 0.3;
      this.side = start > width / 2 ? -1 : 1;
      this.sprite = this.scene.add.image(start, this.scene.scale.height, `${PREFIX}idle`).setOrigin(0.5, 1).setDepth(-0.5).setAlpha(0);
      this.scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 400 });
      this.bar = this.scene.add.graphics().setDepth(9);
      this.label = this.scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: `${Math.max(10, this.scalePx * 3.6)}px`, fontStyle: 'bold',
        color: '#ffffff', stroke: '#2b2b2b', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(9);
      if (near) this.sprite.x = this.targetX(near);
    }
    this.sprite.setScale(this.scalePx / skin.res);
    this.label?.setFontSize(Math.max(10, this.scalePx * 3.6));
    this.show(this.pose || 'idle');
  }

  /** Walk beside the pet when it is on screen; animate the work; draw the bar. */
  update(delta: number, pet?: { x: number; width: number }) {
    const s = this.sprite;
    const job = this.job;
    if (!s || !job) return;
    s.y = this.scene.scale.height;
    if (pet) {
      const target = this.targetX(pet);
      const step = FOLLOW_PX_PER_SEC * (delta / 1000);
      s.x += Phaser.Math.Clamp(target - s.x, -step, step);
    }
    const half = (W * this.scalePx) / 2;
    s.x = Phaser.Math.Clamp(s.x, half, this.scene.scale.width - half);

    if (Date.now() >= job.end) this.show('idle');
    else {
      this.frameTimer -= delta;
      if (this.frameTimer <= 0) {
        if (this.idx >= this.motion.seq.length) {
          this.idx = 0;
          this.show('idle');
          this.frameTimer = Phaser.Math.Between(500, 1200);
        } else {
          this.show(this.motion.seq[this.idx++]);
          this.frameTimer = this.motion.frameMs;
        }
      }
    }
    this.drawProgress();
  }

  /** Read-only view for tests. */
  debugState() {
    const s = this.sprite;
    return s ? { visible: s.visible && s.alpha > 0, x: Math.round(s.x), scale: s.scaleX, pose: this.pose, label: this.label?.text ?? '', jobId: this.job?.id ?? null } : null;
  }

  private targetX(pet: { x: number; width: number }) {
    const width = this.scene.scale.width;
    const half = (W * this.scalePx) / 2;
    const offset = pet.width / 2 + GAP + half;
    // stay on one side; switch only when there is no room left there
    if (pet.x + this.side * offset + this.side * half > width || pet.x + this.side * offset - half < 0) this.side = -this.side;
    return pet.x + this.side * offset;
  }

  private drawProgress() {
    const s = this.sprite;
    const job = this.job;
    if (!s || !job || !this.bar || !this.label) return;
    const total = Math.max(1, job.end - job.start);
    const left = Math.max(0, job.end - Date.now());
    const pct = Phaser.Math.Clamp(1 - left / total, 0, 1);
    const w = Math.round(22 * this.scalePx);
    const h = Math.max(4, Math.round(this.scalePx * 1.8));
    const x = s.x - w / 2;
    const y = s.y - H * this.scalePx - h - 4;
    this.bar.clear().fillStyle(0x000000, 0.45).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 3)
      .fillStyle(left > 0 ? 0xffd54a : 0x6fcf6f, 1).fillRect(x, y, w * pct, h);
    const sec = Math.ceil(left / 1000);
    const clock = left > 0 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : '待領取';
    this.label.setText(`${siteName(job.site)}  ${clock}`).setPosition(s.x, y - 4);
  }

  private show(name: PoseName) {
    if (!this.sprite || this.pose === name) return;
    this.pose = name;
    this.sprite.setTexture(`${PREFIX}${name}`);
  }

  private drawTextures(skin: Skin, build: Build) {
    const { res, smooth } = skin;
    for (const name of Object.keys(POSES) as PoseName[]) {
      const key = `${PREFIX}${name}`;
      if (this.scene.textures.exists(key)) {
        // swap the image away first so the texture can be replaced safely
        if (this.sprite && this.pose === name) this.sprite.setTexture('__DEFAULT');
        this.scene.textures.remove(key);
      }
      const tex = this.scene.textures.createCanvas(key, Math.ceil(W * res), Math.ceil(H * res));
      if (!tex) continue;
      drawPose(tex.getContext(), skin, POSES[name], build, name);
      tex.refresh();
      tex.setFilter(smooth ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST);
    }
  }

  private remove() {
    if (!this.sprite) { this.job = null; return; }
    const { sprite, bar, label } = this;
    this.sprite = this.bar = this.label = undefined;
    this.job = null;
    this.pose = '';
    bar?.destroy(); label?.destroy();
    this.scene.tweens.add({ targets: sprite, alpha: 0, duration: 400, onComplete: () => sprite.destroy() });
  }
}
