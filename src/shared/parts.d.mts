export interface Slot {
  id: string;
  name: string;
  group: 'machine' | 'driver';
}

export interface Part {
  id: string;
  slot: string;
  name: string;
  /** null = cannot be bought, only found while working */
  price: number | null;
  desc?: string;
  colors?: string[];
  stats?: { coin?: number; speed?: number; jobCoin?: number };
  /** bucket slot: how the digging tool is drawn */
  shape?: { tool?: string; thickness: number; teeth?: boolean; dark?: boolean; tilt?: boolean; thumb?: boolean };
  /** tracks slot: steel / rubber / wheels. counterweight slot: long / zts / heavy */
  look?: string;
  /** cannot be bought: only found by sending a machine to work */
  workOnly?: boolean;
  /** machine types this part fits; missing means every machine */
  fits?: string[];
  /** only on parts of the "machine" slot */
  machine?: {
    /** how big it is on screen relative to the standard machine */
    size: number;
    /** how much the drawing is scaled down inside the picture so tall or long machines stay in frame */
    fit: number;
    drive: string;
    use: string;
    /** the part it comes with in each machine-specific slot */
    defaults: Record<string, string>;
  };
  /** boom slot: [length, bend in degrees] pieces from the house outwards */
  boom?: { segments: [number, number][] };
  /** stick slot */
  stick?: { length: number };
}

export interface Site {
  id: string;
  name: string;
  minutes: number;
  wear: number;
  xp: number;
  coins: [number, number];
  /** chance of a bumper haul that doubles the coins */
  jackpot: number;
  /** chance that the 1st, 2nd, 3rd part drop happens */
  drops: number[];
  loot: [string, number][];
  /** machine types allowed to work here; missing means every machine */
  machines?: string[];
}

export interface TintSlot {
  id: string;
  name: string;
}

/** Regions of the machine that can be given any colour. */
export const TINT_SLOTS: TintSlot[];
export const SLOTS: Slot[];
export const PARTS: Part[];
export const SITES: Site[];
export const DEFAULT_EQUIPPED: Record<string, string>;
export function partById(id: string): Part | undefined;
export function fitsMachine(part: Part | undefined, machineId: string): boolean;
/** Slots whose parts depend on the machine type; the rest (paint, driver looks) are shared. */
export const MACHINE_SLOTS: string[];
export function machineDefaults(machineId: string): Record<string, string>;
export function siteById(id: string): Site | undefined;
export function siteOpenTo(site: Site | undefined, machineId: string): boolean;


/** Shapes of the attachment tools: bars and discs in the tool's own frame (along, across). */
export const TOOL_PRIMS: Record<string, ReadonlyArray<readonly (string | number)[]>>;
