export const W = 72;
export const H = 40;

export interface Pose {
  track: 0 | 1;
  bob: number;
  boom: number;
  stick: number;
  bucket: number;
  load?: boolean;
}

export interface Build {
  /** custom colours per machine region ("#rrggbb"); missing regions keep their default colour */
  tint?: Record<string, string>;
  machine: string;
  paint: string;
  cab: string;
  boom: string;
  stick: string;
  bucket: string;
  counterweight: string;
  tracks: string;
  accessory: string;
  skin: string;
  hair: string;
  haircolor: string;
  outfit: string;
  hat: string;
}

export interface Skin {
  id: string;
  name: string;
  /** texture pixels per logical unit */
  res: number;
  /** false = nearest-neighbour (pixel art), true = smooth scaling */
  smooth: boolean;
  /** particle colors for dug dirt */
  dirt: string[];
  /** false for skins made of fixed pictures: equipped parts cannot change what they show */
  supportsParts?: boolean;
  /** resolves once any pictures are loaded; await it before reading `res` or drawing */
  ready?(): Promise<void>;
  draw(ctx: CanvasRenderingContext2D, pose: Pose, build: Build, poseName?: string): void;
}
