import { TOOL_PRIMS, type Part } from '../shared/parts.mjs';

type Ctx = CanvasRenderingContext2D;

const OUT = '#2b2113';
const STEEL = '#8a97a3';
const STEEL_D = '#4b535b';
const YEL = '#f5b800';
const YEL_D = '#b07d00';
const GLASS = '#9fd8ff';
const RUBBER = '#33383d';

// Icons are drawn inside the card's picture area, about x 20..228 and y 44..136.
const CX = 124;

function box(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUT;
  ctx.stroke();
}

function poly(ctx: Ctx, pts: [number, number][], fill: string) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUT;
  ctx.stroke();
}

function disc(ctx: Ctx, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = OUT;
  ctx.stroke();
}

function bar(ctx: Ctx, ax: number, ay: number, bx: number, by: number, w: number, color: string) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = w + 6;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

const PRIM_COLOR: Record<string, string> = { steel: STEEL, dark: STEEL_D, light: '#cfd8dc', yellow: YEL, red: '#d03a2a' };

/** Draws a tool shape from toolShapes: `d` runs down the picture from the hub, `s` runs across. */
function drawPrims(ctx: Ctx, prims: ReadonlyArray<readonly (string | number)[]>, x: number, y: number, unit: number) {
  const at = (d: number, s: number): [number, number] => [x + s * unit, y + d * unit];
  for (const pr of prims) {
    if (pr[0] === 'bar') {
      const [ax, ay] = at(pr[1] as number, pr[2] as number);
      const [bx, by] = at(pr[3] as number, pr[4] as number);
      bar(ctx, ax, ay, bx, by, (pr[5] as number) * unit, PRIM_COLOR[pr[6] as string]);
    } else {
      const [cx, cy] = at(pr[1] as number, pr[2] as number);
      disc(ctx, cx, cy, (pr[3] as number) * unit, PRIM_COLOR[pr[4] as string]);
    }
  }
}

function bucket(ctx: Ctx, part: Part) {
  const shape = part.shape ?? { thickness: 5 };
  const prims = shape.tool ? TOOL_PRIMS[shape.tool] : undefined;
  if (prims) {
    // the stick-end block, then the tool hanging from it
    box(ctx, CX - 12, 36, 24, 14, 4, STEEL_D);
    drawPrims(ctx, prims, CX, 50, 9);
    return;
  }
  if (shape.tool === 'grapple') {
    box(ctx, 100, 44, 48, 22, 5, STEEL_D);
    for (const s of [-1, 1]) {
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(CX + s * 16, 66);
      ctx.quadraticCurveTo(CX + s * 78, 78, CX + s * 36, 126);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 16;
      ctx.stroke();
      ctx.strokeStyle = STEEL;
      ctx.lineWidth = 10;
      ctx.stroke();
    }
    return;
  }
  if (shape.tool === 'breaker') {
    box(ctx, 98, 44, 52, 50, 8, STEEL_D);
    box(ctx, 108, 94, 32, 12, 3, STEEL);
    poly(ctx, [[114, 106], [134, 106], [124, 136]], '#cfd8dc');
    return;
  }
  if (shape.tool === 'auger') {
    box(ctx, 117, 44, 14, 76, 3, STEEL_D);
    for (let i = 0; i < 5; i++) bar(ctx, 108, 56 + i * 13, 140, 66 + i * 13, 6, STEEL);
    poly(ctx, [[112, 120], [136, 120], [124, 138]], '#cfd8dc');
    return;
  }
  // a plain bucket: wider for thicker shapes, with teeth and a dark finish where the part has them
  const tilt = shape.tilt;
  const top = tilt ? 76 : 56;
  const bottom = tilt ? 118 : 112;
  const w = 70 + shape.thickness * 12;
  const x0 = CX - w / 2;
  poly(ctx, [[x0, top], [x0 + w, top], [x0 + w - 10, bottom], [x0 + 10, bottom]], shape.dark ? STEEL_D : STEEL);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x0 + 8, top + 6, w - 16, 5);
  if (shape.teeth) {
    const n = Math.max(3, Math.floor((w - 24) / 22));
    for (let i = 0; i < n; i++) {
      const x = x0 + 14 + (i * (w - 38)) / Math.max(1, n - 1);
      poly(ctx, [[x, bottom], [x + 12, bottom], [x + 6, bottom + 14]], '#cfd8dc');
    }
  }
  if (shape.thumb) {
    bar(ctx, CX + 14, 60, CX + w / 2 + 14, 104, 11, '#cfd8dc');
    disc(ctx, CX + 14, 60, 8, STEEL_D);
  }
  if (tilt) {
    box(ctx, CX - 34, 46, 68, 30, 6, STEEL_D);
    disc(ctx, CX, 61, 10, YEL);
    disc(ctx, CX, 61, 4, STEEL_D);
  } else {
    disc(ctx, CX, top + 4, 8, YEL);
  }
}

function boom(ctx: Ctx, part: Part) {
  const segments = part.boom?.segments ?? [[17, 0]];
  const base = 40;
  const k = 9.5;
  const pts: [number, number][] = [[0, 0]];
  for (const [len, offset] of segments) {
    const a = ((base + offset) * Math.PI) / 180;
    const [x, y] = pts[pts.length - 1];
    pts.push([x + len * k * Math.cos(a), y - len * k * Math.sin(a)]);
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const dx = CX - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = 84 - (Math.min(...ys) + Math.max(...ys)) / 2;
  for (let i = 1; i < pts.length; i++) bar(ctx, pts[i - 1][0] + dx, pts[i - 1][1] + dy, pts[i][0] + dx, pts[i][1] + dy, 16, YEL);
  pts.forEach(([x, y]) => disc(ctx, x + dx, y + dy, 8, STEEL));
}

function stick(ctx: Ctx, part: Part) {
  const len = (part.stick?.length ?? 13) * 11;
  const a: [number, number] = [CX - len / 2, 104];
  const b: [number, number] = [CX + len / 2, 78];
  bar(ctx, a[0], a[1], b[0], b[1], 14, YEL_D);
  disc(ctx, a[0], a[1], 8, STEEL);
  disc(ctx, b[0], b[1], 8, STEEL);
}

function tracks(ctx: Ctx, part: Part) {
  switch (part.look) {
    case 'rail':
      box(ctx, 20, 120, 208, 8, 2, STEEL);
      box(ctx, 70, 98, 108, 10, 3, STEEL_D);
      for (const x of [70, 178]) {
        disc(ctx, x, 100, 24, '#263238');
        disc(ctx, x, 100, 10, STEEL);
      }
      box(ctx, 112, 100, 24, 24, 4, STEEL);
      break;
    case 'outrigger':
      box(ctx, 70, 98, 108, 10, 3, STEEL_D);
      for (const x of [70, 178]) {
        disc(ctx, x, 100, 28, '#263238');
        disc(ctx, x, 100, 12, STEEL);
      }
      for (const x of [104, 144]) {
        box(ctx, x - 7, 100, 14, 26, 3, STEEL_D);
        box(ctx, x - 16, 124, 32, 7, 2, STEEL);
      }
      break;
    case 'spiderwheel':
      box(ctx, 68, 66, 112, 16, 7, STEEL_D);
      for (const [x0, x1] of [[84, 44], [108, 100], [140, 148], [164, 204]]) {
        bar(ctx, x0, 82, x1, 112, 9, STEEL);
        disc(ctx, x1, 118, 12, '#263238');
        disc(ctx, x1, 118, 5, STEEL);
      }
      break;
    case 'expand':
      box(ctx, 18, 82, 212, 46, 23, RUBBER);
      ctx.fillStyle = '#5a636b';
      ctx.fillRect(48, 88, 152, 4);
      for (let x = 42; x < 210; x += 12) bar(ctx, x, 122, x + 4, 122, 3, '#6b757c');
      disc(ctx, 52, 105, 12, STEEL);
      disc(ctx, 196, 105, 12, STEEL);
      break;
    case 'wide':
      box(ctx, 24, 80, 200, 50, 22, '#3a3a3a');
      for (let x = 50; x < 200; x += 20) {
        bar(ctx, x, 88, x + 6, 88, 4, '#90a4ae');
        bar(ctx, x + 8, 123, x + 14, 123, 4, '#90a4ae');
      }
      disc(ctx, 54, 105, 14, STEEL);
      disc(ctx, 194, 105, 14, STEEL);
      break;
    case 'swamp':
      box(ctx, 24, 86, 200, 40, 14, '#4e5a62');
      for (let x = 40; x < 200; x += 28) box(ctx, x, 104, 20, 9, 3, '#90a4ae');
      break;
    case 'wheels':
      box(ctx, 70, 98, 108, 10, 3, STEEL_D);
      for (const x of [70, 178]) {
        disc(ctx, x, 100, 28, '#263238');
        disc(ctx, x, 100, 12, STEEL);
      }
      break;
    case 'spider':
      box(ctx, 68, 66, 112, 16, 7, STEEL_D);
      for (const [x0, x1] of [[84, 44], [108, 100], [140, 148], [164, 204]]) {
        bar(ctx, x0, 82, x1, 122, 9, STEEL);
        box(ctx, x1 - 12, 120, 24, 8, 3, RUBBER);
      }
      break;
    case 'float':
      box(ctx, 28, 84, 192, 44, 18, '#5b7c99');
      ctx.fillStyle = '#2f4f6b';
      ctx.fillRect(34, 112, 180, 12);
      ctx.fillStyle = '#8fb0cc';
      ctx.fillRect(40, 90, 168, 6);
      for (let x = 44; x < 200; x += 36) bar(ctx, x, 118, x + 14, 118, 3, '#cfe8ff');
      break;
    case 'rubber':
      box(ctx, 30, 82, 188, 46, 23, RUBBER);
      ctx.fillStyle = '#5a636b';
      ctx.fillRect(56, 88, 136, 4);
      for (let x = 50; x < 200; x += 12) bar(ctx, x, 122, x + 4, 122, 3, '#6b757c');
      disc(ctx, 58, 105, 12, STEEL);
      disc(ctx, 190, 105, 12, STEEL);
      break;
    default:
      box(ctx, 30, 82, 188, 46, 23, '#3a3a3a');
      for (let x = 52; x < 196; x += 20) {
        bar(ctx, x, 90, x + 6, 90, 4, '#90a4ae');
        bar(ctx, x + 8, 121, x + 14, 121, 4, '#90a4ae');
      }
      disc(ctx, 58, 105, 13, STEEL);
      disc(ctx, 190, 105, 13, STEEL);
      disc(ctx, CX, 112, 8, STEEL_D);
  }
}

function counterweight(ctx: Ctx, part: Part) {
  if (part.look === 'zts') {
    box(ctx, 84, 56, 80, 66, 24, YEL_D);
  } else if (part.look === 'mining') {
    box(ctx, 36, 46, 176, 84, 8, YEL_D);
    for (const y of [70, 92, 112]) bar(ctx, 48, y, 200, y, 5, YEL);
  } else if (part.look === 'ballast') {
    box(ctx, 52, 48, 144, 80, 10, YEL_D);
    for (const y of [72, 98]) bar(ctx, 62, y, 186, y, 5, YEL);
    for (const x of [88, 124, 160]) bar(ctx, x, 54, x, 122, 3, '#8a6000');
  } else if (part.look === 'heavy') {
    box(ctx, 44, 50, 160, 78, 10, YEL_D);
    for (const y of [74, 98]) bar(ctx, 56, y, 192, y, 4, YEL);
  } else {
    box(ctx, 58, 58, 132, 64, 22, YEL_D);
    for (const x of [90, 124, 158]) bar(ctx, x, 70, x, 110, 4, YEL);
  }
}

function cab(ctx: Ctx, part: Part) {
  if (part.look === 'canopy') {
    box(ctx, 88, 84, 40, 38, 8, STEEL_D);
    bar(ctx, 72, 62, 72, 126, 6, STEEL_D);
    bar(ctx, 176, 62, 176, 126, 6, STEEL_D);
    box(ctx, 62, 48, 124, 16, 5, YEL);
    return;
  }
  if (part.look === 'raised') {
    box(ctx, 106, 98, 36, 32, 4, STEEL_D);
    bar(ctx, 96, 128, 112, 100, 6, STEEL);
    bar(ctx, 152, 128, 136, 100, 6, STEEL);
    box(ctx, 76, 44, 96, 58, 10, YEL);
    box(ctx, 90, 56, 68, 32, 6, GLASS);
    return;
  }
  if (part.look === 'small') {
    box(ctx, 82, 62, 84, 66, 11, YEL);
    box(ctx, 96, 76, 56, 32, 5, GLASS);
    return;
  }
  box(ctx, 68, 52, 112, 76, 12, YEL);
  box(ctx, 84, 66, 80, 40, 6, GLASS);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(90, 71, 20, 6);
  if (part.id === 'cab_cage' || part.look === 'guarded') {
    for (const x of [104, 124, 144]) bar(ctx, x, 66, x, 106, 3, OUT);
    bar(ctx, 84, 86, 164, 86, 3, OUT);
  } else if (part.id === 'cab_visor') {
    box(ctx, 62, 52, 124, 14, 5, YEL_D);
  }
}

function accessory(ctx: Ctx, part: Part) {
  switch (part.id) {
    case 'acc_beacon':
      box(ctx, 84, 108, 80, 20, 6, STEEL_D);
      ctx.beginPath();
      ctx.arc(CX, 108, 36, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#ff5252';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      bar(ctx, 106, 90, 116, 80, 5, '#ffcdd2');
      break;
    case 'acc_flag':
      bar(ctx, 96, 128, 96, 48, 6, STEEL_D);
      poly(ctx, [[100, 48], [168, 62], [100, 80]], '#e53935');
      break;
    case 'acc_antenna':
      bar(ctx, 100, 128, 144, 56, 5, STEEL_D);
      disc(ctx, 146, 52, 9, '#ff5252');
      break;
    case 'acc_blade':
      box(ctx, 140, 48, 30, 82, 8, STEEL);
      bar(ctx, 140, 70, 84, 96, 9, STEEL_D);
      bar(ctx, 140, 112, 84, 112, 9, STEEL_D);
      disc(ctx, 84, 100, 8, YEL);
      break;
    case 'acc_worklight':
      box(ctx, 86, 70, 56, 36, 8, STEEL_D);
      box(ctx, 94, 78, 40, 20, 5, '#fff59d');
      for (const dy of [-14, 0, 14]) bar(ctx, 150, 88 + dy, 196, 88 + dy * 1.8, 4, '#ffee58');
      break;
    case 'acc_battery':
      box(ctx, 60, 72, 128, 54, 8, STEEL_D);
      box(ctx, 74, 88, 100, 20, 5, '#66bb6a');
      bar(ctx, 102, 72, 102, 58, 7, STEEL);
      bar(ctx, 146, 72, 146, 58, 7, STEEL);
      break;
    case 'acc_coupler':
      box(ctx, 84, 64, 80, 52, 8, STEEL_D);
      box(ctx, 98, 76, 52, 28, 5, '#ff9800');
      bar(ctx, 104, 90, 144, 90, 5, '#ffe0b2');
      break;
    case 'acc_platform':
      box(ctx, 56, 108, 136, 14, 3, STEEL);
      for (const x of [62, 124, 186]) bar(ctx, x, 62, x, 108, 6, STEEL_D);
      bar(ctx, 62, 66, 186, 66, 6, STEEL_D);
      bar(ctx, 62, 88, 186, 88, 5, STEEL_D);
      break;
    case 'acc_dredgepump':
      box(ctx, 56, 70, 90, 56, 10, STEEL_D);
      box(ctx, 68, 86, 66, 18, 5, '#42a5f5');
      bar(ctx, 146, 96, 204, 66, 14, STEEL);
      break;
    case 'acc_dust':
      box(ctx, 76, 100, 54, 24, 6, STEEL_D);
      bar(ctx, 104, 100, 168, 64, 14, '#4fc3f7');
      for (const [x, y] of [[186, 52], [196, 74], [182, 86]]) disc(ctx, x, y, 5, '#b3e5fc');
      break;
    case 'acc_radius':
      box(ctx, 84, 74, 80, 52, 8, STEEL_D);
      disc(ctx, CX, 98, 10, '#42a5f5');
      bar(ctx, CX, 74, CX, 48, 6, STEEL_D);
      break;
    case 'acc_ladder':
      bar(ctx, 94, 128, 94, 46, 7, STEEL_D);
      bar(ctx, 154, 128, 154, 46, 7, STEEL_D);
      for (let y = 56; y < 126; y += 18) bar(ctx, 94, y, 154, y, 6, STEEL);
      break;
    case 'acc_gps':
      bar(ctx, CX, 128, CX, 84, 7, STEEL_D);
      ctx.beginPath();
      ctx.arc(CX, 84, 32, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      bar(ctx, CX - 4, 70, CX + 14, 70, 4, '#cfd8dc');
      break;
  }
}

function paintCan(ctx: Ctx, part: Part) {
  box(ctx, 82, 58, 84, 70, 8, '#cfd8dc');
  box(ctx, 76, 48, 96, 16, 5, STEEL);
  box(ctx, 82, 80, 84, 26, 0, part.colors?.[0] ?? YEL);
  ctx.fillStyle = part.colors?.[1] ?? YEL_D;
  ctx.fillRect(85, 98, 78, 5);
  ctx.beginPath();
  ctx.arc(CX, 58, 36, Math.PI * 1.15, Math.PI * 1.85);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 4;
  ctx.stroke();
}

/**
 * Draws the part on its own, the way it looks off the machine.
 * Returns false for parts without a picture of their own (they fall back to the whole machine).
 */
export function drawPartIcon(ctx: Ctx, part: Part): boolean {
  switch (part.slot) {
    case 'bucket':
      bucket(ctx, part);
      return true;
    case 'boom':
      boom(ctx, part);
      return true;
    case 'stick':
      stick(ctx, part);
      return true;
    case 'tracks':
      tracks(ctx, part);
      return true;
    case 'counterweight':
      counterweight(ctx, part);
      return true;
    case 'cab':
      cab(ctx, part);
      return true;
    case 'accessory':
      accessory(ctx, part);
      return true;
    case 'paint':
      paintCan(ctx, part);
      return true;
    default:
      return false;
  }
}
