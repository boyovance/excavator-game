import { ACCESSORIES, DRIVER, PAINTS } from './data/extras.mjs';
import { MACHINES } from './data/machines.mjs';
import { SITES } from './data/sites.mjs';
import { BOOMS, CABS, COUNTERWEIGHTS, STICKS, TRACKS } from './data/structure.mjs';
import { TOOLS } from './data/tools.mjs';

export { SITES };
export { TOOL_PRIMS } from './data/toolShapes.mjs';

export const SLOTS = [
  { id: 'machine', name: '機型', group: 'machine' },
  { id: 'paint', name: '塗裝', group: 'machine' },
  { id: 'cab', name: '駕駛室', group: 'machine' },
  { id: 'boom', name: '大臂', group: 'machine' },
  { id: 'stick', name: '小臂', group: 'machine' },
  { id: 'bucket', name: '鏟斗與屬具', group: 'machine' },
  { id: 'tracks', name: '行走裝置', group: 'machine' },
  { id: 'counterweight', name: '配重', group: 'machine' },
  { id: 'accessory', name: '配件', group: 'machine' },
  { id: 'skin', name: '膚色', group: 'driver' },
  { id: 'hair', name: '髮型', group: 'driver' },
  { id: 'haircolor', name: '髮色', group: 'driver' },
  { id: 'outfit', name: '衣服', group: 'driver' },
  { id: 'hat', name: '帽子', group: 'driver' },
];

// The first part of every slot is the free default (the standard machine's).
// Machine types come first: the type decides the look of the body, and which parts fit it (`fits`).
// The parts themselves live in ./data, one file per kind.
export const PARTS = [
  ...MACHINES,
  ...PAINTS,
  ...CABS,
  ...BOOMS,
  ...STICKS,
  ...TOOLS,
  ...TRACKS,
  ...COUNTERWEIGHTS,
  ...ACCESSORIES,
  ...DRIVER,
];

export const partById = (id) => PARTS.find((p) => p.id === id);

/** Does this part fit the machine type? Machine types themselves and shared slots fit everything. */
export const fitsMachine = (part, machineId) => !part?.fits || part.fits.includes(machineId);

/** Slots whose parts depend on the machine type; the others (paint, driver looks) are shared. */
export const MACHINE_SLOTS = ['cab', 'boom', 'stick', 'bucket', 'tracks', 'counterweight', 'accessory'];

/** The parts a machine comes with, by slot. */
export const machineDefaults = (machineId) => partById(machineId)?.machine?.defaults ?? partById('m_std').machine.defaults;

// Regions of the machine that can be given any colour, on top of the preset paint.
export const TINT_SLOTS = [
  { id: 'body', name: '車身' },
  { id: 'cab', name: '駕駛室' },
  { id: 'boom', name: '大臂' },
  { id: 'stick', name: '小臂' },
  { id: 'tool', name: '鏟斗與屬具' },
  { id: 'tracks', name: '履帶與輪胎' },
  { id: 'counterweight', name: '配重' },
];

export const siteById = (id) => SITES.find((s) => s.id === id);

/** Can this machine type work the site? A site without a list is open to every machine. */
export const siteOpenTo = (site, machineId) => !site?.machines || site.machines.includes(machineId);

export const DEFAULT_EQUIPPED = Object.fromEntries(
  SLOTS.map((s) => [s.id, PARTS.find((p) => p.slot === s.id).id]),
);
