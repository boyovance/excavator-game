import { armPoints } from '../geometry';
import { TOOL_PRIMS, partById } from '../shared/parts.mjs';
import { shade } from './color';
import type { Skin } from './types';

const STEEL = '#607d8b';
const TRACK = '#37474f';
const TIRE = '#263238';
const WHEEL = '#78909c';
const GLASS = '#bfe9f5';
const JOINT = '#455a64';

export const flatSkin: Skin = {
  id: 'flat',
  name: '扁平卡通',
  res: 4,
  smooth: true,
  dirt: ['#a1764a', '#8d6238', '#b88a58'],
  draw(ctx, pose, build) {
    const preset = partById(build.paint)?.colors ?? ['#f5b800', '#b07d00'];
    // custom colours override the preset paint region by region
    const tint = build.tint ?? {};
    const BODY = tint.body ?? preset[0];
    const BODY_DARK = tint.body ? shade(tint.body, -0.3) : preset[1];
    const CAB = tint.cab ?? BODY;
    const BOOM = tint.boom ?? BODY;
    const STICK = tint.stick ?? BODY_DARK;
    const WEIGHT = tint.counterweight ?? BODY_DARK;
    const TRACKS = tint.tracks ?? TRACK;
    const dy = pose.bob;
    const rr = (x: number, y: number, w: number, h: number, r: number, c: string) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fill();
    };
    const dot = (x: number, y: number, r: number, c: string) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    const stroke = (a: { x: number; y: number }, b: { x: number; y: number }, w: number, c: string) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };

    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(27, 39.4, 23, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const look = partById(build.tracks)?.look ?? 'steel';
    const shape = partById(build.bucket)?.shape ?? { thickness: 5 };

    // undercarriage
    if (look === 'wheels' || look === 'outrigger' || look === 'rail') {
      if (look === 'rail') {
        rr(3, 38.2, 50, 1.6, 0.6, '#90a4ae');
        rr(24, 35, 5, 4.4, 1, JOINT);
      }
      rr(20, 33.5, 14, 2.5, 1, JOINT);
      if (look === 'outrigger') {
        // hydraulic outriggers with foot pads
        for (const x of [19, 34]) {
          rr(x, 33, 3.4, 6, 1, JOINT);
          rr(x - 2, 38.6, 7.4, 1.4, 0.7, STEEL);
        }
      }
      for (const cx of [15, 38]) {
        dot(cx, 34.4, 5.4, TIRE);
        dot(cx, 34.4, 2.8, WHEEL);
        const a = pose.track * (Math.PI / 4);
        dot(cx + Math.cos(a) * 1.6, 34.4 + Math.sin(a) * 1.6, 0.7, TIRE);
        dot(cx - Math.cos(a) * 1.6, 34.4 - Math.sin(a) * 1.6, 0.7, TIRE);
      }
    } else if (look === 'spider' || look === 'spiderwheel') {
      rr(19, 31, 16, 2.4, 1, JOINT);
      const step = pose.track;
      const legs: [number, number, number, number][] = [
        [14, 32, 7 - step, 38],
        [22, 32, 20 + step, 38],
        [31, 32, 33 - step, 38],
        [40, 32, 47 + step, 38],
      ];
      for (const [x0, y0, x1, y1] of legs) {
        stroke({ x: x0, y: y0 }, { x: x1, y: y1 }, 2.8, JOINT);
        if (look === 'spiderwheel') {
          dot(x1, 37.6, 2.3, TIRE);
          dot(x1, 37.6, 1, WHEEL);
        } else {
          rr(x1 - 2.2, 37.8, 4.4, 1.8, 0.9, TRACKS);
          dot(x1, 38.4, 1.1, WHEEL);
        }
      }
    } else if (look === 'float') {
      rr(8, 32, 37, 8, 3.5, '#5b7c99');
      rr(9, 33, 35, 1.4, 0.7, '#8fb0cc');
      rr(9, 36.6, 35, 3, 1.5, '#2f4f6b');
      for (let x = 11 + pose.track * 2; x < 42; x += 6) rr(x, 37.6, 2.4, 0.7, 0.35, '#cfe8ff');
      rr(22, 30.6, 10, 2.4, 1, JOINT);
    } else {
      // steel, rubber, expanding rubber, wide steel and swamp pads share one drawing with different widths
      const x0 = look === 'expand' ? 6 : look === 'wide' || look === 'swamp' ? 7 : 9;
      const w = look === 'expand' ? 41 : look === 'wide' || look === 'swamp' ? 39 : 35;
      const rubber = look === 'rubber' || look === 'expand';
      rr(x0, 31, w, 8.5, 4.2, tint.tracks ?? (rubber ? '#22272b' : look === 'swamp' ? '#4e5a62' : TRACK));
      if (look !== 'swamp') {
        dot(x0 + 5, 35.2, 3, WHEEL);
        dot(x0 + w - 5, 35.2, 3, WHEEL);
        dot(26, 36, 2, WHEEL);
      }
      const off = pose.track * 3;
      if (rubber) {
        // a smooth belt: a thin highlight along the top and fine notches underneath
        rr(x0 + 3, 31.8, w - 6, 0.9, 0.45, '#4a5258');
        for (let x = x0 + 3 + (off % 2); x < x0 + w - 1; x += 2.4) dot(x, 38.7, 0.4, '#6b757c');
      } else if (look === 'swamp') {
        for (let x = x0 + 3 + off; x < x0 + w - 3; x += 5) rr(x, 36, 3.4, 1.2, 0.6, '#90a4ae');
      } else {
        for (let x = x0 + 3 + off; x < x0 + w - 2; x += 6) dot(x, 38.6, 0.7, '#90a4ae');
        if (look === 'wide') rr(x0 + 3, 31.8, w - 6, 0.9, 0.45, '#546e7a');
      }
    }

    // body
    const weight = partById(build.counterweight)?.look ?? 'long';
    if (weight === 'zts') {
      rr(10, 26 + dy, 4, 6, 2, WEIGHT);
    } else if (weight === 'mining') {
      rr(1, 20 + dy, 13, 12, 2.5, WEIGHT);
      for (const y of [24, 27, 30]) rr(2, y + dy, 11, 0.8, 0.4, BODY_DARK);
    } else if (weight === 'ballast') {
      rr(3, 21 + dy, 11, 11, 2.5, WEIGHT);
      rr(4, 25 + dy, 9, 0.9, 0.4, BODY);
      rr(4, 28 + dy, 9, 0.9, 0.4, BODY);
    } else if (weight === 'heavy') {
      rr(3.5, 23.5 + dy, 10.5, 8.5, 2.5, WEIGHT);
      rr(4.5, 27 + dy, 8.5, 1, 0.5, BODY);
    } else {
      rr(7, 25 + dy, 7, 7, 2, WEIGHT);
    }
    rr(12, 23 + dy, 29, 9, 2.5, BODY);
    rr(13, 28.5 + dy, 27, 1.2, 0.6, BODY_DARK);
    rr(15, 17 + dy, 3, 7, 1, STEEL);

    // cab: a closed cab, an open canopy, or a cab raised on a riser
    const cabLook = partById(build.cab)?.look;
    const lift = cabLook === 'raised' ? 6 : 0;
    if (lift) {
      rr(27, 17 + dy, 8, 7, 1.5, JOINT);
      rr(26, 22 + dy, 2.4, 2, 0.8, STEEL);
      rr(33.6, 22 + dy, 2.4, 2, 0.8, STEEL);
    }
    ctx.save();
    ctx.translate(0, -lift);
    if (cabLook === 'canopy') {
      rr(24.5, 17.6 + dy, 12.5, 6.4, 1.5, '#37474f');
      rr(25.5, 18.4 + dy, 3.6, 4.6, 1.2, JOINT);
      rr(22, 13 + dy, 1, 11, 0.5, STEEL);
      rr(38, 13 + dy, 1, 11, 0.5, STEEL);
      rr(21, 11 + dy, 19, 2.2, 1.1, CAB);
    } else if (cabLook === 'small') {
      rr(24, 14 + dy, 13, 10, 3, CAB);
      rr(27, 17 + dy, 7, 5, 1.5, GLASS);
      rr(27.6, 17.6 + dy, 2, 0.9, 0.4, '#ffffff');
    } else {
      rr(22, 11 + dy, 17, 13, 3.5, CAB);
      rr(25, 14 + dy, 11, 7.5, 2, GLASS);
      rr(26, 15 + dy, 3, 1.2, 0.6, '#ffffff');
    }

    // driver
    const pc = (id: string, fallback: string) => partById(id)?.colors?.[0] ?? fallback;
    const skinC = pc(build.skin, '#ffdbb4');
    const hairC = pc(build.haircolor, '#2b2420');
    const shirtC = pc(build.outfit, '#e5493a');
    const cx = 31.2;
    const cy = 17.3 + dy;
    const cap = (r: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy - 0.2, r, Math.PI, 0);
      ctx.fill();
    };
    rr(28.6, 19.4 + dy, 5.4, 2.4, 1.2, shirtC);
    if (build.hair === 'hair_long') rr(28.7, 15.4 + dy, 2.4, 5, 1.2, hairC);
    if (build.hair === 'hair_bun') dot(29.3, 15.3 + dy, 1.3, hairC);
    dot(cx, cy, 2.1, skinC);
    dot(32.3, cy + 0.3, 0.35, '#2b2b2b');
    if (build.hair !== 'hair_bald') cap(2.25, hairC);
    if (build.hair === 'hair_spiky') {
      ctx.fillStyle = hairC;
      ctx.beginPath();
      ctx.moveTo(30.3, 15.3 + dy);
      ctx.lineTo(31.2, 13.4 + dy);
      ctx.lineTo(32.1, 15.3 + dy);
      ctx.closePath();
      ctx.fill();
    }
    if (build.hat === 'hat_helmet') {
      cap(2.7, '#ffd23f');
      rr(28.5, cy - 0.7, 5.4, 0.9, 0.4, '#d9a400');
    } else if (build.hat === 'hat_cap') {
      cap(2.6, '#4a90e2');
      rr(31.4, cy - 0.7, 3.6, 0.9, 0.4, '#2a5ea8');
    } else if (build.hat === 'hat_crown') {
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.moveTo(29.6, cy - 1.6);
      ctx.lineTo(29.6, cy - 3.4);
      ctx.lineTo(30.6, cy - 2.4);
      ctx.lineTo(31.2, cy - 3.6);
      ctx.lineTo(31.8, cy - 2.4);
      ctx.lineTo(32.8, cy - 3.4);
      ctx.lineTo(32.8, cy - 1.6);
      ctx.closePath();
      ctx.fill();
    }

    if (build.cab === 'cab_cage' || cabLook === 'guarded') {
      stroke({ x: 28.5, y: 14.5 + dy }, { x: 28.5, y: 21 + dy }, 0.8, STEEL);
      stroke({ x: 32, y: 14.5 + dy }, { x: 32, y: 21 + dy }, 0.8, STEEL);
      stroke({ x: 25.5, y: 17.8 + dy }, { x: 35.5, y: 17.8 + dy }, 0.8, STEEL);
    } else if (build.cab === 'cab_visor') {
      rr(23.5, 13 + dy, 14, 2.6, 1.2, BODY_DARK);
    }

    // accessory
    if (build.accessory === 'acc_beacon') {
      rr(28.5, 8.6 + dy, 5, 3.4, 1.4, '#ff5252');
      rr(29.5, 9.2 + dy, 1.6, 1, 0.5, '#ffcdd2');
    } else if (build.accessory === 'acc_flag') {
      stroke({ x: 37.5, y: 11.5 + dy }, { x: 37.5, y: 3 + dy }, 0.9, JOINT);
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.moveTo(38, 3 + dy);
      ctx.lineTo(43.5, 4.8 + dy);
      ctx.lineTo(38, 6.6 + dy);
      ctx.closePath();
      ctx.fill();
    } else if (build.accessory === 'acc_gps') {
      stroke({ x: 30.5, y: 11.5 + dy }, { x: 30.5, y: 7.5 + dy }, 0.8, JOINT);
      dot(30.5, 6.4 + dy, 2.2, '#ffffff');
      dot(30.5, 6 + dy, 0.8, '#90a4ae');
    } else if (build.accessory === 'acc_antenna') {
      stroke({ x: 24.5, y: 11.5 + dy }, { x: 21.5, y: 2.5 + dy }, 0.9, JOINT);
      dot(21.5, 2.3 + dy, 1.3, '#ff5252');
    } else if (build.accessory === 'acc_battery') {
      ctx.translate(0, lift);
      rr(14, 19 + dy, 7, 5, 1.2, JOINT);
      rr(15.4, 20.8 + dy, 4.2, 1.2, 0.5, '#66bb6a');
    } else if (build.accessory === 'acc_dust') {
      rr(28.6, 8.8 + dy, 4.6, 3.2, 1.2, JOINT);
      stroke({ x: 31, y: 10 + dy }, { x: 38, y: 6 + dy }, 1.6, '#4fc3f7');
      dot(39.4, 5.4 + dy, 0.5, '#b3e5fc');
      dot(40.4, 7.2 + dy, 0.5, '#b3e5fc');
    } else if (build.accessory === 'acc_radius') {
      rr(33, 8 + dy, 5, 4, 1, JOINT);
      dot(35.5, 9.8 + dy, 0.8, '#42a5f5');
      stroke({ x: 35.5, y: 8 + dy }, { x: 35.5, y: 5 + dy }, 0.7, JOINT);
    } else if (build.accessory === 'acc_platform') {
      ctx.translate(0, lift);
      rr(13, 22 + dy, 9, 1.8, 0.8, STEEL);
      stroke({ x: 13.4, y: 17.5 + dy }, { x: 13.4, y: 22 + dy }, 0.8, JOINT);
      stroke({ x: 21.4, y: 17.5 + dy }, { x: 21.4, y: 22 + dy }, 0.8, JOINT);
      stroke({ x: 13.4, y: 17.8 + dy }, { x: 21.4, y: 17.8 + dy }, 0.8, JOINT);
    } else if (build.accessory === 'acc_dredgepump') {
      ctx.translate(0, lift);
      rr(14, 18 + dy, 8, 5, 1.4, JOINT);
      rr(15.4, 19.6 + dy, 5.2, 1.4, 0.7, '#42a5f5');
      stroke({ x: 22, y: 20 + dy }, { x: 36, y: 17 + dy }, 1.6, STEEL);
    } else if (build.accessory === 'acc_ladder') {
      ctx.translate(0, lift);
      stroke({ x: 9.5, y: 21 + dy }, { x: 9.5, y: 39 }, 0.8, JOINT);
      stroke({ x: 12.5, y: 21 + dy }, { x: 12.5, y: 39 }, 0.8, JOINT);
      for (let y = 23; y < 38; y += 3) stroke({ x: 9.5, y: y + dy }, { x: 12.5, y: y + dy }, 0.6, STEEL);
    } else if (build.accessory === 'acc_blade') {
      ctx.translate(0, lift);
      rr(44, 31.5, 3.6, 8.5, 1.2, STEEL);
      rr(44.4, 32.2, 1, 7, 0.5, '#90a4ae');
    } else if (build.accessory === 'acc_worklight') {
      ctx.translate(0, lift);
      rr(36, 16 + dy, 4.4, 3.4, 1.2, JOINT);
      rr(37, 16.8 + dy, 2.6, 1.8, 0.8, '#fff59d');
    }

    ctx.restore();

    // arm
    const { p1, p2, p3, boomJoints } = armPoints(pose, build);
    const tool = shape.tool ?? 'bucket';
    for (let i = 1; i < boomJoints.length; i++) stroke(boomJoints[i - 1], boomJoints[i], 4.6, BOOM);
    stroke(p1, p2, 3.4, STICK);
    stroke(p2, p3, shape.thickness + 0.2, tint.tool ?? (shape.dark || tool !== 'bucket' ? '#455a64' : STEEL));

    const len = Math.hypot(p3.x - p2.x, p3.y - p2.y) || 1;
    const ux = (p3.x - p2.x) / len;
    const uy = (p3.y - p2.y) / len;
    const along = (d: number, side = 0) => ({ x: p3.x + ux * d - uy * side, y: p3.y + uy * d + ux * side });
    if (shape.tilt) {
      dot(p2.x, p2.y, 2.6, '#455a64');
      dot(p2.x, p2.y, 1.2, '#ffd23f');
    }
    const primColor: Record<string, string> = { steel: STEEL, dark: '#455a64', light: '#cfd8dc', yellow: '#f5b800', red: '#d03a2a' };
    const drawPrims = (prims: ReadonlyArray<readonly (string | number)[]>) => {
      for (const pr of prims) {
        if (pr[0] === 'bar') {
          stroke(along(pr[1] as number, pr[2] as number), along(pr[3] as number, pr[4] as number), (pr[5] as number) * 0.9, primColor[pr[6] as string]);
        } else {
          const c = along(pr[1] as number, pr[2] as number);
          dot(c.x, c.y, pr[3] as number, primColor[pr[4] as string]);
        }
      }
    };
    if (TOOL_PRIMS[tool]) drawPrims(TOOL_PRIMS[tool]);
    if (shape.thumb) drawPrims(TOOL_PRIMS.thumb);
    if (tool === 'breaker') {
      stroke(p3, along(5), 2.4, '#cfd8dc');
    } else if (tool === 'grapple') {
      stroke(p3, along(4, 3.5), 2.2, STEEL);
      stroke(p3, along(4, -3.5), 2.2, STEEL);
    } else if (tool === 'auger') {
      for (let k = 1; k < 6; k++) {
        const t = k / 6;
        dot(p2.x + (p3.x - p2.x) * t + (k % 2 ? 0.7 : -0.7), p2.y + (p3.y - p2.y) * t, 0.55, '#cfd8dc');
      }
      stroke(p3, along(3), 1.6, '#cfd8dc');
    } else if (shape.teeth) {
      stroke(p3, along(2.4), 2.6, '#cfd8dc');
    }

    if (build.accessory === 'acc_coupler') {
      rr(p2.x - 2, p2.y - 2, 4.4, 4.4, 1, '#ff9800');
    }

    // joints: the boom foot and, on a 3-piece boom, the bend
    boomJoints.slice(0, -1).forEach((j, i) => dot(j.x, j.y, i === 0 ? 2.2 : 1.7, JOINT));
    dot(p1.x, p1.y, 1.4, JOINT);
    dot(p2.x, p2.y, 1.4, JOINT);
    if (pose.load && tool === 'bucket') {
      dot(p3.x - 0.5, p3.y - 1.6, 2.4, '#a1764a');
      dot(p3.x + 1, p3.y - 2.4, 1.4, '#b88a58');
    }
  },
};
