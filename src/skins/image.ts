import { H, W, type Skin } from './types';

export interface PackManifest {
  name: string;
  /** set false to keep a pack on disk without listing it */
  enabled?: boolean;
  /** true = keep hard pixel edges when scaling; false = smooth scaling */
  pixelArt?: boolean;
  /** dirt particle colors, defaults to brown */
  dirt?: string[];
  /** pose name -> file name inside the pack folder */
  frames: Record<string, string>;
}

// A missing pose borrows the nearest one that exists.
const FALLBACKS: Record<string, string[]> = {
  walk0: ['idle'],
  walk1: ['walk0', 'idle'],
  dig0: ['idle'],
  dig1: ['dig0', 'idle'],
  dig2: ['dig1', 'dig0', 'idle'],
  dig3: ['dig2', 'dig1', 'dig0', 'idle'],
  dump0: ['dig3', 'dig2', 'dig1', 'dig0', 'idle'],
  dump1: ['dump0', 'dig3', 'dig2', 'dig1', 'dig0', 'idle'],
  cheer0: ['idle'],
  cheer1: ['cheer0', 'idle'],
  stretch0: ['cheer0', 'idle'],
  stretch1: ['stretch0', 'cheer1', 'cheer0', 'idle'],
  wave0: ['cheer0', 'idle'],
  wave1: ['wave0', 'cheer1', 'cheer0', 'idle'],
  tinker0: ['dig1', 'dig0', 'idle'],
  tinker1: ['dig2', 'tinker0', 'dig1', 'dig0', 'idle'],
  sleep: ['idle'],
  lift: ['idle'],
  broken: ['sleep', 'idle'],
};

const loadImage = (url: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

/** Frames are whole-character pictures with the feet on the bottom edge, drawn at a 72:40 ratio. */
export function createImageSkin(id: string, manifest: PackManifest, urls: Record<string, string>): Skin {
  const images = new Map<string, HTMLImageElement>();
  let loading: Promise<void> | null = null;

  const fileFor = (pose?: string) => {
    for (const name of [pose ?? 'idle', ...(FALLBACKS[pose ?? 'idle'] ?? ['idle'])]) {
      const file = manifest.frames[name];
      if (file && images.has(file)) return file;
    }
    return undefined;
  };

  const skin: Skin = {
    id,
    name: manifest.name,
    res: 8,
    smooth: !manifest.pixelArt,
    dirt: manifest.dirt ?? ['#8b5a2b', '#6b4423', '#a9743b'],
    supportsParts: false,
    ready() {
      loading ??= (async () => {
        const files = [...new Set(Object.values(manifest.frames))];
        const loaded = await Promise.all(files.map((f) => (urls[f] ? loadImage(urls[f]) : null)));
        files.forEach((f, i) => loaded[i] && images.set(f, loaded[i]!));
        const first = images.values().next().value as HTMLImageElement | undefined;
        if (first) skin.res = first.naturalWidth / W;
      })();
      return loading;
    },
    draw(ctx, _pose, _build, poseName) {
      const file = fileFor(poseName);
      if (file) ctx.drawImage(images.get(file)!, 0, 0, W, H);
    },
  };
  return skin;
}
