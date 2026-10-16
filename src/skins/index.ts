import type { PackInfo } from '../api';
import { flatSkin } from './flat';
import { createImageSkin, type PackManifest } from './image';
import { classicPixel, gameboyPixel } from './pixel';
import type { Skin } from './types';

// Picture packs: drop a folder with skin.json and PNG frames into ./packs and it shows up as a style.
const manifests = import.meta.glob<PackManifest>('./packs/*/skin.json', { eager: true, import: 'default' });
const files = import.meta.glob<string>('./packs/*/*.png', { eager: true, query: '?url', import: 'default' });

const packSkins: Skin[] = Object.entries(manifests).flatMap(([path, manifest]) => {
  if (manifest.enabled === false) return [];
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const urls: Record<string, string> = {};
  for (const [file, url] of Object.entries(files)) {
    if (file.startsWith(dir)) urls[file.slice(dir.length)] = url;
  }
  return [createImageSkin(`pack-${dir.split('/')[2]}`, manifest, urls)];
});

// To add a drawn style: create a Skin (see types.ts) and append it here.
const BUILT_IN: Skin[] = [classicPixel, gameboyPixel, flatSkin, ...packSkins];

/** Built-in styles first, then any packs downloaded from the server. Mutated by setRemoteSkins. */
export const SKINS: Skin[] = [...BUILT_IN];

export function setRemoteSkins(packs: PackInfo[]) {
  SKINS.length = BUILT_IN.length;
  for (const p of packs) {
    const urls = Object.fromEntries(Object.values(p.frames).map((file) => [file, p.base + file]));
    SKINS.push(createImageSkin(p.id, { name: p.name, pixelArt: p.pixelArt, dirt: p.dirt, frames: p.frames }, urls));
  }
}

export const getSkin = (id: string): Skin => SKINS.find((s) => s.id === id) ?? SKINS[0];
