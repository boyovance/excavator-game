import { armPoints, type Pt } from '../geometry';
import { TOOL_PRIMS, partById } from '../shared/parts.mjs';
import { shade } from './color';
import type { Skin } from './types';

export interface PixelPalette {
  out: string;
  body: string;
  bodyDark: string;
  glass: string;
  glassHi: string;
  track: string;
  trackLight: string;
  steel: string;
  steelDark: string;
  accent: string;
  dirt: string[];
}

function thickLine(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, t: number, color: string) {
  ctx.fillStyle = color;
  let x0 = Math.round(a.x);
  let y0 = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  const h = Math.floor(t / 2);
  let err = dx - dy;
  for (;;) {
    ctx.fillRect(x0 - h, y0 - h, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** paintable skins take their body colors from the equipped paint part */
export function createPixelSkin(id: string, name: string, pal: PixelPalette, paintable = false): Skin {
  return {
    id,
    name,
    res: 1,
    smooth: false,
    dirt: pal.dirt,
    draw(ctx, pose, build) {
      const rect = (x: number, y: number, w: number, h: number, c: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, w, h);
      };
      const colors = paintable ? partById(build.paint)?.colors : undefined;
      // custom colours override the preset paint region by region; fixed-palette styles ignore them
      const tint = paintable ? (build.tint ?? {}) : {};
      const body = tint.body ?? colors?.[0] ?? pal.body;
      const bodyDark = tint.body ? shade(tint.body, -0.3) : (colors?.[1] ?? pal.bodyDark);
      const cabFill = tint.cab ?? body;
      const boomFill = tint.boom ?? body;
      const stickFill = tint.stick ?? bodyDark;
      const weightFill = tint.counterweight ?? bodyDark;
      const trackC = tint.tracks ?? pal.track;
      const trackL = tint.tracks ? shade(tint.tracks, 0.35) : pal.trackLight;
      const dy = pose.bob;
      const look = partById(build.tracks)?.look ?? 'steel';
      const shape = partById(build.bucket)?.shape ?? { thickness: 5 };

      // undercarriage
      if (look === 'wheels' || look === 'outrigger' || look === 'rail') {
        if (look === 'rail') {
          // two steel rails under the tyres, and small flanged guide wheels lowered between them
          rect(3, 38, 50, 2, pal.out);
          rect(3, 38, 50, 1, pal.steel);
          rect(24, 35, 5, 5, pal.out);
          rect(25, 36, 3, 3, pal.steel);
        }
        rect(21, 34, 11, 2, pal.steelDark);
        if (look === 'outrigger') {
          // hydraulic outriggers with foot pads, folded down beside the tyres
          for (const x of [19, 34]) {
            rect(x, 33, 4, 6, pal.out);
            rect(x + 1, 33, 2, 5, pal.steel);
            rect(x - 2, 39, 8, 1, pal.out);
          }
        }
        for (const x of [9, 32]) {
          rect(x + 2, 29, 8, 11, pal.out);
          rect(x + 1, 30, 10, 9, pal.out);
          rect(x, 31, 12, 7, pal.out);
          rect(x + 3, 30, 6, 9, trackC);
          rect(x + 2, 31, 8, 7, trackC);
          rect(x + 1, 32, 10, 5, trackC);
          rect(x + 4, 33, 4, 3, pal.steel);
          rect(x + 5, 34, 2, 1, pal.steelDark);
          if (pose.track === 0) {
            rect(x + 5, 31, 2, 1, trackL);
            rect(x + 5, 37, 2, 1, trackL);
          } else {
            rect(x + 2, 34, 1, 1, trackL);
            rect(x + 9, 34, 1, 1, trackL);
          }
        }
      } else if (look === 'spider' || look === 'spiderwheel') {
        // four steel legs that splay out, each ending in a small wheel on a foot pad
        rect(19, 31, 16, 2, pal.out);
        rect(20, 31, 14, 1, pal.steelDark);
        const step = pose.track;
        const legs: [number, number, number, number][] = [
          [14, 32, 7 - step, 38],
          [22, 32, 20 + step, 38],
          [31, 32, 33 - step, 38],
          [40, 32, 47 + step, 38],
        ];
        for (const [x0, y0, x1, y1] of legs) {
          thickLine(ctx, { x: x0, y: y0 }, { x: x1, y: y1 }, 4, pal.out);
          thickLine(ctx, { x: x0, y: y0 }, { x: x1, y: y1 }, 2, pal.steel);
          if (look === 'spiderwheel') {
            // the leg ends in its own driven wheel
            rect(x1 - 2, 36, 5, 4, pal.out);
            rect(x1 - 1, 37, 3, 2, trackC);
          } else {
            rect(x1 - 2, 38, 5, 2, pal.out);
            rect(x1 - 1, 38, 3, 1, trackC);
          }
        }
      } else if (look === 'float') {
        // two sealed pontoons that sit in the water
        rect(8, 32, 37, 8, pal.out);
        rect(9, 33, 35, 6, '#5b7c99');
        rect(9, 33, 35, 1, '#8fb0cc');
        rect(9, 37, 35, 2, '#2f4f6b');
        for (let x = 11 + pose.track * 2; x < 42; x += 6) rect(x, 38, 2, 1, '#cfe8ff');
        rect(22, 31, 10, 2, pal.out);
        rect(23, 31, 8, 1, pal.steelDark);
      } else {
        // steel, rubber, expanding rubber, wide steel and swamp pads share one drawing with different widths
        const x0 = look === 'expand' ? 6 : look === 'wide' || look === 'swamp' ? 7 : 9;
        const w = look === 'expand' ? 41 : look === 'wide' || look === 'swamp' ? 39 : 35;
        const pad = look === 'swamp' ? shade(trackC, 0.2) : trackC;
        rect(x0, 31, w, 9, pal.out);
        rect(x0 + 1, 32, w - 2, 7, pad);
        const off = pose.track * 3;
        if (look === 'rubber' || look === 'expand') {
          // a smooth rubber belt: a continuous seam and fine tread notches instead of steel plates
          rect(x0 + 1, 32, w - 2, 7, pal.out);
          rect(x0 + 2, 33, w - 4, 5, trackC);
          rect(x0 + 2, 35, w - 4, 1, pal.out);
          for (let x = x0 + 3 + (off % 2); x < x0 + w - 2; x += 3) rect(x, 38, 1, 1, trackL);
        } else if (look === 'swamp') {
          // broad flat pads: a long run of wide plates, no big sprocket wheels
          for (let x = x0 + 2 + off; x < x0 + w - 3; x += 5) {
            rect(x, 33, 3, 1, trackL);
            rect(x + 2, 38, 3, 1, trackL);
          }
        } else {
          for (let x = x0 + 2 + off; x < x0 + w - 4; x += 6) {
            rect(x, 33, 2, 1, trackL);
            rect(x + 3, 38, 2, 1, trackL);
          }
        }
        if (look !== 'swamp') {
          rect(x0 + 2, 34, 5, 4, pal.steel);
          rect(x0 + w - 8, 34, 5, 4, pal.steel);
          rect(x0 + 4, 35, 1, 2, pal.steelDark);
          rect(x0 + w - 6, 35, 1, 2, pal.steelDark);
        }
        rect(23, 35, 6, 3, pal.steelDark);
        if (look === 'wide') rect(x0 + 2, 31, w - 4, 1, trackL);
      }

      // upper body + counterweight
      rect(12, 23 + dy, 29, 9, pal.out);
      rect(13, 24 + dy, 27, 7, body);
      rect(13, 28 + dy, 27, 1, bodyDark);
      rect(13, 30 + dy, 27, 1, bodyDark);
      const weight = partById(build.counterweight)?.look ?? 'long';
      if (weight === 'zts') {
        // zero tail swing: the weight stays inside the width of the tracks
        rect(10, 26 + dy, 3, 6, pal.out);
        rect(11, 27 + dy, 1, 4, weightFill);
      } else if (weight === 'mining') {
        // a giant stack of weight plates
        rect(1, 20 + dy, 12, 12, pal.out);
        rect(2, 21 + dy, 10, 10, weightFill);
        for (const y of [24, 27, 30]) rect(2, y + dy, 10, 1, pal.out);
      } else if (weight === 'ballast') {
        // a tall ballast block for balancing a long or high arm
        rect(3, 21 + dy, 10, 11, pal.out);
        rect(4, 22 + dy, 8, 9, weightFill);
        rect(4, 25 + dy, 8, 1, pal.out);
        rect(4, 28 + dy, 8, 1, pal.out);
      } else if (weight === 'heavy') {
        rect(4, 23 + dy, 9, 9, pal.out);
        rect(5, 24 + dy, 7, 7, weightFill);
        rect(5, 27 + dy, 7, 1, pal.out);
      } else {
        rect(7, 25 + dy, 6, 7, pal.out);
        rect(8, 26 + dy, 4, 5, weightFill);
      }

      // exhaust
      rect(15, 17 + dy, 3, 7, pal.out);
      rect(16, 18 + dy, 1, 6, pal.steelDark);

      // cab: a closed cab, an open canopy, or a cab raised on a riser
      const cabLook = partById(build.cab)?.look;
      const lift = cabLook === 'raised' ? 6 : 0;
      if (lift) {
        rect(27, 17 + dy, 8, 7, pal.out);
        rect(28, 18 + dy, 6, 6, pal.steelDark);
        rect(28, 20 + dy, 6, 1, pal.out);
        rect(26, 22 + dy, 2, 2, pal.out);
        rect(34, 22 + dy, 2, 2, pal.out);
      }
      ctx.save();
      ctx.translate(0, -lift);
      if (cabLook === 'canopy') {
        rect(24, 17 + dy, 13, 7, pal.out);
        rect(25, 18 + dy, 4, 5, pal.steelDark);
        rect(21, 11 + dy, 19, 2, pal.out);
        rect(22, 11 + dy, 17, 1, cabFill);
        rect(22, 13 + dy, 1, 11, pal.out);
        rect(38, 13 + dy, 1, 11, pal.out);
      } else if (cabLook === 'small') {
        // a small closed cab for compact machines
        rect(24, 14 + dy, 13, 10, pal.out);
        rect(25, 15 + dy, 11, 8, cabFill);
        rect(25, 15 + dy, 11, 1, bodyDark);
        rect(27, 17 + dy, 7, 5, pal.out);
        rect(28, 18 + dy, 5, 3, pal.glass);
        rect(28, 18 + dy, 1, 1, pal.glassHi);
      } else {
        rect(22, 11 + dy, 17, 13, pal.out);
        rect(23, 12 + dy, 15, 11, cabFill);
        rect(23, 12 + dy, 15, 1, bodyDark);
        rect(25, 14 + dy, 11, 7, pal.out);
        rect(26, 15 + dy, 9, 5, pal.glass);
        rect(26, 15 + dy, 2, 1, pal.glassHi);
        rect(27, 16 + dy, 1, 1, pal.glassHi);
      }

      // driver
      const partColor = (id: string, fallback: string) =>
        paintable ? (partById(id)?.colors?.[0] ?? fallback) : fallback;
      const skinC = partColor(build.skin, pal.glassHi);
      const hairC = partColor(build.haircolor, pal.out);
      const shirtC = partColor(build.outfit, pal.bodyDark);
      const hat = {
        hat_helmet: paintable ? ['#ffd23f', '#d9a400'] : [pal.out, pal.bodyDark],
        hat_cap: paintable ? ['#4a90e2', '#2a5ea8'] : [pal.out, pal.bodyDark],
        hat_crown: paintable ? ['#ffd84a', '#8a6a00'] : [pal.out, pal.bodyDark],
      }[build.hat as 'hat_helmet' | 'hat_cap' | 'hat_crown'];
      const hx = 28;
      const hy = 16 + dy;
      if (build.hair === 'hair_long') rect(hx - 1, hy - 1, 1, 4, hairC);
      if (build.hair === 'hair_bun') rect(hx - 1, hy - 2, 2, 2, hairC);
      rect(hx, hy, 3, 3, skinC);
      rect(hx + 2, hy + 1, 1, 1, pal.out);
      rect(hx - 1, 19 + dy, 5, 1, shirtC);
      if (build.hair !== 'hair_bald') rect(hx, hy - 1, 3, 1, hairC);
      if (build.hair === 'hair_spiky') rect(hx + 1, hy - 2, 1, 1, hairC);
      if (build.hat === 'hat_helmet' && hat) {
        rect(hx, hy - 2, 3, 2, hat[0]);
        rect(hx - 1, hy - 1, 5, 1, hat[1]);
      } else if (build.hat === 'hat_cap' && hat) {
        rect(hx, hy - 2, 3, 2, hat[0]);
        rect(hx + 2, hy - 1, 3, 1, hat[1]);
      } else if (build.hat === 'hat_crown' && hat) {
        rect(hx, hy - 2, 3, 1, hat[0]);
        rect(hx, hy - 3, 1, 1, hat[0]);
        rect(hx + 2, hy - 3, 1, 1, hat[0]);
        rect(hx, hy - 1, 3, 1, hat[1]);
      }

      if (build.cab === 'cab_cage' || cabLook === 'guarded') {
        rect(28, 15 + dy, 1, 5, pal.out);
        rect(31, 15 + dy, 1, 5, pal.out);
        rect(26, 17 + dy, 9, 1, pal.out);
      } else if (build.cab === 'cab_visor') {
        rect(24, 13 + dy, 13, 2, bodyDark);
        rect(24, 15 + dy, 13, 1, pal.out);
      }

      // accessory
      if (build.accessory === 'acc_beacon') {
        rect(29, 9 + dy, 4, 3, pal.out);
        rect(30, 10 + dy, 2, 1, '#ff5252');
      } else if (build.accessory === 'acc_flag') {
        rect(37, 3 + dy, 1, 9, pal.out);
        rect(38, 3 + dy, 5, 3, '#e53935');
        rect(38, 3 + dy, 5, 1, '#ff8a80');
      } else if (build.accessory === 'acc_gps') {
        // 3D machine-guidance mast with a white GNSS dome
        rect(30, 7 + dy, 1, 5, pal.out);
        rect(28, 5 + dy, 5, 3, pal.out);
        rect(29, 6 + dy, 3, 1, '#ffffff');
        rect(24, 8 + dy, 1, 1, '#ffffff');
      } else if (build.accessory === 'acc_antenna') {
        rect(24, 8 + dy, 1, 4, pal.out);
        rect(23, 5 + dy, 1, 3, pal.out);
        rect(22, 2 + dy, 1, 3, pal.out);
        rect(21, 1 + dy, 3, 2, '#ff5252');
      } else if (build.accessory === 'acc_battery') {
        // battery pack on the back of the house
        ctx.translate(0, lift);
        rect(14, 19 + dy, 7, 5, pal.out);
        rect(15, 20 + dy, 5, 3, pal.steelDark);
        rect(16, 21 + dy, 3, 1, '#66bb6a');
      } else if (build.accessory === 'acc_dust') {
        // water-mist cannon on the cab roof
        rect(29, 9 + dy, 4, 3, pal.out);
        thickLine(ctx, { x: 31, y: 10 + dy }, { x: 38, y: 6 + dy }, 2, pal.out);
        thickLine(ctx, { x: 31, y: 10 + dy }, { x: 38, y: 6 + dy }, 1, '#4fc3f7');
        rect(39, 5 + dy, 1, 1, '#b3e5fc');
        rect(40, 7 + dy, 1, 1, '#b3e5fc');
      } else if (build.accessory === 'acc_radius') {
        // slewing-radius limiter: a sensor box with a blue lamp
        rect(33, 8 + dy, 5, 4, pal.out);
        rect(34, 9 + dy, 3, 1, '#42a5f5');
        rect(35, 5 + dy, 1, 3, pal.out);
      } else if (build.accessory === 'acc_platform') {
        // working platform with a railing beside the cab
        ctx.translate(0, lift);
        rect(13, 22 + dy, 9, 2, pal.out);
        rect(14, 22 + dy, 7, 1, pal.steel);
        rect(13, 17 + dy, 1, 5, pal.out);
        rect(21, 17 + dy, 1, 5, pal.out);
        rect(13, 17 + dy, 9, 1, pal.out);
      } else if (build.accessory === 'acc_dredgepump') {
        // dredge pump on the back of the house with a hose along the boom
        ctx.translate(0, lift);
        rect(14, 18 + dy, 8, 5, pal.out);
        rect(15, 19 + dy, 6, 3, pal.steelDark);
        rect(16, 20 + dy, 4, 1, '#42a5f5');
        thickLine(ctx, { x: 22, y: 20 + dy }, { x: 36, y: 17 + dy }, 2, pal.out);
        thickLine(ctx, { x: 22, y: 20 + dy }, { x: 36, y: 17 + dy }, 1, pal.steel);
      } else if (build.accessory === 'acc_ladder') {
        // boarding ladder on the side of the house
        ctx.translate(0, lift);
        rect(9, 21 + dy, 1, 18 - dy, pal.out);
        rect(12, 21 + dy, 1, 18 - dy, pal.out);
        for (let y = 23; y < 38; y += 3) rect(10, y + dy, 2, 1, pal.steel);
      } else if (build.accessory === 'acc_blade') {
        // dozer blade on the front of the undercarriage
        ctx.translate(0, lift);
        rect(44, 31, 5, 9, pal.out);
        rect(45, 32, 3, 7, pal.steel);
        rect(45, 32, 1, 7, pal.steelDark);
      } else if (build.accessory === 'acc_worklight') {
        // work light on the boom foot
        ctx.translate(0, lift);
        rect(36, 16 + dy, 5, 4, pal.out);
        rect(37, 17 + dy, 3, 2, '#fff59d');
      }

      ctx.restore();

      // arm
      const { p0, p1, p2, p3, boomJoints } = armPoints(pose, build);
      const tool = shape.tool ?? 'bucket';
      const segs: [Pt, Pt, number, string][] = [];
      for (let i = 1; i < boomJoints.length; i++) segs.push([boomJoints[i - 1], boomJoints[i], 4, boomFill]);
      segs.push([p1, p2, 3, stickFill]);
      segs.push([p2, p3, shape.thickness, tint.tool ?? (shape.dark || tool !== 'bucket' ? pal.steelDark : pal.steel)]);
      for (const [a, b, t] of segs) thickLine(ctx, a, b, t + 2, pal.out);
      for (const [a, b, t, c] of segs) thickLine(ctx, a, b, t, c);

      // direction along the tool and across it, for the tips and prongs
      const len = Math.hypot(p3.x - p2.x, p3.y - p2.y) || 1;
      const ux = (p3.x - p2.x) / len;
      const uy = (p3.y - p2.y) / len;
      const along = (d: number, side = 0, s = 0): Pt => ({ x: p3.x + ux * d - uy * side * s, y: p3.y + uy * d + ux * side * s });
      if (shape.tilt) {
        // tiltrotator: a rotating, tilting unit between the stick and the bucket
        rect(Math.round(p2.x) - 3, Math.round(p2.y) - 3, 6, 6, pal.out);
        rect(Math.round(p2.x) - 2, Math.round(p2.y) - 2, 4, 4, pal.steelDark);
        rect(Math.round(p2.x) - 1, Math.round(p2.y) - 1, 2, 2, '#ffd23f');
      }
      const primColor: Record<string, string> = { steel: pal.steel, dark: pal.steelDark, light: pal.glassHi, yellow: '#f5b800', red: '#d03a2a' };
      const drawPrims = (prims: ReadonlyArray<readonly (string | number)[]>) => {
        // outlines first, then the fills, so overlapping shapes read as one tool
        for (const pass of [0, 1]) {
          for (const pr of prims) {
            if (pr[0] === 'bar') {
              const a = along(pr[1] as number, pr[2] as number, 1);
              const b = along(pr[3] as number, pr[4] as number, 1);
              const w = Math.max(1, Math.round(pr[5] as number));
              thickLine(ctx, a, b, pass === 0 ? w + 2 : w, pass === 0 ? pal.out : primColor[pr[6] as string]);
            } else {
              const c = along(pr[1] as number, pr[2] as number, 1);
              const r = Math.max(1, Math.round(pr[3] as number));
              if (pass === 0) rect(Math.round(c.x) - r - 1, Math.round(c.y) - r - 1, 2 * r + 2, 2 * r + 2, pal.out);
              else rect(Math.round(c.x) - r, Math.round(c.y) - r, 2 * r, 2 * r, primColor[pr[4] as string]);
            }
          }
        }
      };
      if (TOOL_PRIMS[tool]) drawPrims(TOOL_PRIMS[tool]);
      if (shape.thumb) drawPrims(TOOL_PRIMS.thumb);
      if (tool === 'breaker') {
        thickLine(ctx, p3, along(5), 3, pal.out);
        thickLine(ctx, p3, along(5), 1, pal.glassHi);
      } else if (tool === 'grapple') {
        for (const s of [1, -1]) thickLine(ctx, p3, along(4, 3.5, s), 4, pal.out);
        for (const s of [1, -1]) thickLine(ctx, p3, along(4, 3.5, s), 2, pal.steel);
      } else if (tool === 'auger') {
        for (let k = 1; k < 6; k++) {
          const x = Math.round(p2.x + (p3.x - p2.x) * (k / 6));
          const y = Math.round(p2.y + (p3.y - p2.y) * (k / 6));
          rect(x - 1 + (k % 2), y - 1, 2, 1, pal.glassHi);
        }
        thickLine(ctx, p3, along(3), 2, pal.out);
        thickLine(ctx, p3, along(3), 1, pal.glassHi);
      } else if (shape.teeth) {
        thickLine(ctx, p3, along(3), 3, pal.out);
        thickLine(ctx, p3, along(3), 1, pal.glassHi);
      }

      if (build.accessory === 'acc_coupler') {
        rect(Math.round(p2.x) - 2, Math.round(p2.y) - 2, 5, 5, pal.out);
        rect(Math.round(p2.x) - 1, Math.round(p2.y) - 1, 3, 3, '#ff9800');
      }

      // joints: the boom foot and, on a 3-piece boom, the bend
      for (const j of boomJoints.slice(0, -1)) {
        rect(Math.round(j.x) - 2, Math.round(j.y) - 2, 4, 4, pal.out);
        rect(Math.round(j.x) - 1, Math.round(j.y) - 1, 2, 2, pal.steel);
      }
      if (pose.load && tool === 'bucket') {
        rect(Math.round(p3.x) - 3, Math.round(p3.y) - 2, 5, 3, pal.dirt[0]);
        rect(Math.round(p3.x) - 2, Math.round(p3.y) - 3, 3, 1, pal.dirt[1] ?? pal.dirt[0]);
      }
    },
  };
}

export const classicPixel = createPixelSkin(
  'pixel',
  '經典像素',
  {
    out: '#2b2b2b',
    body: '#f5b800',
    bodyDark: '#b07d00',
    glass: '#9fd8ff',
    glassHi: '#e8f7ff',
    track: '#3a3a3a',
    trackLight: '#5c5c5c',
    steel: '#7a8590',
    steelDark: '#4b535b',
    accent: '#ff5252',
    dirt: ['#8b5a2b', '#6b4423', '#a9743b'],
  },
  true,
);

export const gameboyPixel = createPixelSkin('gameboy', '掌機綠', {
  out: '#0f380f',
  body: '#8bac0f',
  bodyDark: '#306230',
  glass: '#9bbc0f',
  glassHi: '#c4d96a',
  track: '#306230',
  trackLight: '#8bac0f',
  steel: '#8bac0f',
  steelDark: '#0f380f',
  accent: '#306230',
  dirt: ['#306230', '#0f380f'],
});
