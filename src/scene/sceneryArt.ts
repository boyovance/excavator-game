import type Phaser from 'phaser';

const DARK = 0x2b2b2b;

/** Small pixel-style drawing helpers. Coordinates are logical units from the pet's feet: y goes up as it gets more negative. */
class Pen {
  constructor(
    private g: Phaser.GameObjects.Graphics,
    private u: number,
  ) {}

  private n(v: number) {
    return Math.round(v * this.u);
  }

  rect(x: number, y: number, w: number, h: number, color: number, outline = true) {
    if (outline) this.g.fillStyle(DARK, 1).fillRect(this.n(x - 1), this.n(y - 1), this.n(w + 2), this.n(h + 2));
    this.g.fillStyle(color, 1).fillRect(this.n(x), this.n(y), this.n(w), this.n(h));
  }

  tri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: number) {
    const p = [this.n(x1), this.n(y1), this.n(x2), this.n(y2), this.n(x3), this.n(y3)] as const;
    this.g.fillStyle(color, 1).fillTriangle(...p);
    this.g.lineStyle(Math.max(1, this.n(1)), DARK, 1).strokeTriangle(...p);
  }

  disc(x: number, y: number, r: number, color: number) {
    this.g.fillStyle(color, 1).fillCircle(this.n(x), this.n(y), this.n(r));
    this.g.lineStyle(Math.max(1, this.n(1)), DARK, 1).strokeCircle(this.n(x), this.n(y), this.n(r));
  }
}

const SCENES: Record<string, (p: Pen) => void> = {
  // piles of crates, tyres and scrap on packed dirt
  yard(p) {
    p.rect(-74, -2, 148, 2, 0x8b6b43, false);
    p.rect(-68, -10, 10, 10, 0xc8924a);
    p.rect(-57, -10, 10, 10, 0xb97f38);
    p.rect(-63, -20, 10, 10, 0xd5a05a);
    p.rect(-66, -6, 6, 1, 0x8a5a22, false);
    p.disc(50, -5, 5, 0x33383d);
    p.disc(50, -5, 2, 0x8a97a3);
    p.disc(61, -5, 5, 0x33383d);
    p.disc(61, -5, 2, 0x8a97a3);
    p.rect(54, -16, 14, 6, 0x8a97a3);
    p.rect(58, -20, 6, 4, 0x6b747c);
  },
  // concrete pipes and traffic cones on asphalt
  alley(p) {
    p.rect(-74, -2, 148, 2, 0x555b61, false);
    for (const x of [-60, -40, -20, 0, 20, 40, 60]) p.rect(x, -1, 8, 1, 0xf2c94c, false);
    p.disc(-62, -9, 9, 0xb8bfc6);
    p.disc(-62, -9, 5, 0x3a3f45);
    p.disc(-46, -7, 7, 0xb8bfc6);
    p.disc(-46, -7, 3.5, 0x3a3f45);
    for (const x of [52, 64]) {
      p.tri(x, 0, x + 5, -14, x + 10, 0, 0xff7a1a);
      p.rect(x + 2, -8, 6, 2, 0xffffff, false);
    }
  },
  // a rock face and loose boulders on gravel
  quarry(p) {
    p.rect(-74, -2, 148, 2, 0x9a8f80, false);
    p.tri(-78, 0, -58, -30, -36, 0, 0xa39682);
    p.tri(-58, -30, -50, -12, -64, -12, 0xbdb09b);
    p.disc(52, -6, 6, 0x8d8579);
    p.disc(63, -4, 4, 0xa39a8c);
    p.disc(57, -13, 4, 0x9a9184);
    p.rect(44, -2, 3, 2, 0x7a736a, false);
  },
  // a heap of scrap metal and oil drums
  scrap(p) {
    p.rect(-74, -2, 148, 2, 0x4a4038, false);
    p.rect(-72, -8, 20, 8, 0x8a5a3a);
    p.rect(-68, -14, 16, 6, 0x7a8590);
    p.rect(-64, -19, 9, 5, 0xa0522d);
    p.tri(-72, -8, -66, -16, -60, -8, 0x6b747c);
    p.rect(48, -13, 9, 13, 0xd03a2a);
    p.rect(48, -9, 9, 2, DARK, false);
    p.rect(59, -13, 9, 13, 0x2f6fb0);
    p.rect(59, -9, 9, 2, DARK, false);
  },
  // open water between two grassy banks, with reeds
  river(p) {
    p.rect(-76, -5, 152, 5, 0x4a90c8, false);
    for (const x of [-48, -28, -8, 14, 36]) p.rect(x, -4, 8, 1, 0x9fd0f0, false);
    p.rect(-76, -8, 18, 8, 0x6b8f4a);
    p.rect(60, -8, 18, 8, 0x6b8f4a);
    for (const [x, h] of [[62, 14], [65, 18], [68, 12], [71, 16]] as const) p.rect(x, -8 - h, 1, h, 0x4a7a32, false);
  },
  // a grassy slope with pine trees
  slope(p) {
    p.rect(-74, -2, 148, 2, 0x8b6b43, false);
    p.tri(0, 0, 50, -34, 76, 0, 0x6aa84f);
    p.tri(36, 0, 60, -16, 76, 0, 0x5b9743);
    for (const [x, h] of [[-66, 26], [-52, 20]] as const) {
      p.tri(x, -6, x + 6, -6 - h, x + 12, -6, 0x2f6b3a);
      p.rect(x + 5, -6, 2, 6, 0x6b4a2a);
    }
  },
  // a railway: ballast, sleepers and two rails, with a signal and an overhead-line mast
  rail(p) {
    p.rect(-76, -3, 152, 3, 0x8d8a85, false);
    for (let x = -72; x < 76; x += 7) p.rect(x, -4, 4, 2, 0x6b4a2a, false);
    p.rect(-76, -5, 152, 1.5, 0xb0bec5, false);
    p.rect(-74, -36, 2, 33, 0x78909c);
    p.rect(-74, -36, 14, 2, 0x78909c);
    p.rect(-62, -34, 1, 5, 0x37474f, false);
    p.rect(56, -26, 2, 23, 0x37474f);
    p.rect(52, -33, 10, 8, 0x263238);
    p.disc(55, -31, 1.5, 0xe53935);
    p.disc(59, -27.5, 1.5, 0x66bb6a);
  },
  // a mine entrance with timber supports and an ore cart
  mine(p) {
    p.rect(-74, -2, 148, 2, 0x3a3330, false);
    p.rect(-74, -28, 24, 28, 0x5a4a3a);
    p.rect(-70, -19, 16, 19, 0x14100e);
    p.rect(-71, -22, 2, 22, 0x8a5a22);
    p.rect(-55, -22, 2, 22, 0x8a5a22);
    p.rect(-71, -23, 18, 3, 0x8a5a22);
    p.rect(48, -10, 16, 8, 0x6a737b);
    p.disc(52, -2, 3, 0x33383d);
    p.disc(61, -2, 3, 0x33383d);
    p.disc(53, -12, 3, 0xffd54a);
    p.disc(58, -13, 3, 0xc47f2c);
    p.disc(62, -11, 2, 0xffd54a);
  },
};

/** Draws the scenery for a work site, if it has one. */
export function drawScenery(g: Phaser.GameObjects.Graphics, siteId: string, unit: number) {
  g.clear();
  SCENES[siteId]?.(new Pen(g, unit));
}
