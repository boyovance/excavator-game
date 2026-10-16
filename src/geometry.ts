import { POSES } from './poses';
import { partById } from './shared/parts.mjs';
import { W, type Build, type Pose } from './skins/types';

export interface Pt {
  x: number;
  y: number;
}

/** Machines are drawn scaled about the bottom of their body so tall and long ones stay inside the picture. */
const FIT_ORIGIN: Pt = { x: 14, y: 40 };

const fitCache = new Map<string, number>();

/**
 * How much the machine is drawn scaled down so nothing is cut off at the edge of the picture:
 * the machine type's own setting, or less when this arm and tool reach past the edge in some pose.
 */
export function machineFit(build?: Partial<Build>) {
  const base = partById(build?.machine ?? '')?.machine?.fit ?? 1;
  const key = `${build?.machine}|${build?.boom}|${build?.stick}|${build?.bucket}`;
  const known = fitCache.get(key);
  if (known !== undefined) return known;

  // the tool reaches about this far past the end of the stick, and about this far to each side
  const tool = partById(build?.bucket ?? '')?.shape;
  const reach = tool?.tool ? 10 : tool?.thumb || tool?.teeth ? 7 : 4;
  let need = 1;
  for (const pose of Object.values(POSES)) {
    const { p2, p3 } = armPoints(pose, build);
    const len = Math.hypot(p3.x - p2.x, p3.y - p2.y) || 1;
    const ux = (p3.x - p2.x) / len;
    const uy = (p3.y - p2.y) / len;
    for (const side of [-5, 0, 5]) {
      const x = p3.x + ux * reach - uy * side;
      const y = p3.y + uy * reach + ux * side;
      if (x > FIT_ORIGIN.x) need = Math.min(need, (W - 1 - FIT_ORIGIN.x) / (x - FIT_ORIGIN.x));
      if (y < FIT_ORIGIN.y) need = Math.min(need, (FIT_ORIGIN.y - 1) / (FIT_ORIGIN.y - y));
    }
  }
  // steps of 5%, so the drawing stays steady and pixel art is not shrunk by odd amounts
  const fit = Math.min(base, Math.max(0.6, Math.floor(need * 20) / 20));
  fitCache.set(key, fit);
  return fit;
}

/** Where a point of the arm ends up in the picture once the machine's fit is applied. */
export function toCanvas(p: Pt, build?: Partial<Build>): Pt {
  const f = machineFit(build);
  return { x: FIT_ORIGIN.x + (p.x - FIT_ORIGIN.x) * f, y: FIT_ORIGIN.y + (p.y - FIT_ORIGIN.y) * f };
}

export const fitOrigin = FIT_ORIGIN;

const DEFAULT_BOOM: [number, number][] = [[17, 0]];
const DEFAULT_STICK = 13;
export const TOOL = 7;

/** Poses whose tool tip touches the ground with the default arm; other arms are lowered to still touch it. */
const GROUND_Y = 34;

const next = (a: Pt, len: number, deg: number): Pt => ({
  x: a.x + len * Math.cos((deg * Math.PI) / 180),
  y: a.y - len * Math.sin((deg * Math.PI) / 180),
});

function chain(pose: Pose, boomAngle: number, segments: [number, number][], stickLength: number) {
  const p0 = { x: 35, y: 21 + pose.bob };
  const boomJoints: Pt[] = [p0];
  for (const [len, offset] of segments) {
    boomJoints.push(next(boomJoints[boomJoints.length - 1], len, boomAngle + offset));
  }
  const p1 = boomJoints[boomJoints.length - 1];
  const p2 = next(p1, stickLength, pose.stick);
  const p3 = next(p2, TOOL, pose.bucket);
  return { p0, p1, p2, p3, boomJoints };
}

/**
 * Joint positions of the digging arm for a pose and the equipped boom / stick.
 * `boomJoints` runs from the boom foot to the boom tip and has a bend in the middle for a 3-piece boom.
 * A short stick would dig in mid-air, so when the default arm touches the ground the boom is lowered to match.
 */
export function armPoints(pose: Pose, build?: Partial<Build>) {
  const segments = partById(build?.boom ?? '')?.boom?.segments ?? DEFAULT_BOOM;
  const stickLength = partById(build?.stick ?? '')?.stick?.length ?? DEFAULT_STICK;

  let boomAngle = pose.boom;
  const reference = chain(pose, pose.boom, DEFAULT_BOOM, DEFAULT_STICK).p3.y;
  if (reference >= GROUND_Y) {
    for (let i = 0; i < 25 && chain(pose, boomAngle, segments, stickLength).p3.y < reference - 0.3; i++) boomAngle -= 1;
  }
  return chain(pose, boomAngle, segments, stickLength);
}
