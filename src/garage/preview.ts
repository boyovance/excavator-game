import { POSES, type PoseName } from '../poses';
import { drawPose } from '../render';
import { getSkin } from '../skins';
import { H, W, type Build } from '../skins/types';
import { previewEquipment } from '../shared/catalog.mjs';
import { $, canvas } from './dom';
import { ui } from './store';

const SHOW: PoseName[] = ['idle', 'walk0', 'idle', 'walk1', 'dig1', 'dig2', 'dig3', 'idle'];

function previewBuild(): Build {
  const b = ui.tryOn ? previewEquipment(ui.state, ui.tryOn.id) ?? ui.state.equipped : ui.state.equipped;
  return { ...b, tint: { ...ui.state.tint, ...ui.liveTint } } as unknown as Build;
}

function welcomeBuild(): Build {
  return { ...ui.state.equipped, ...ui.welcomePick, tint: ui.state.tint } as unknown as Build;
}

function paint(target: HTMLCanvasElement, build: Build) {
  const skin = getSkin(ui.settings.skin);
  const w = Math.ceil(W * skin.res);
  const h = Math.ceil(H * skin.res);
  if (target.width !== w || target.height !== h) {
    target.width = w;
    target.height = h;
  }
  target.style.imageRendering = skin.smooth ? 'auto' : 'pixelated';
  const name = SHOW[ui.frame % SHOW.length];
  drawPose(target.getContext('2d')!, skin, POSES[name], build, name);
  return skin;
}

export function drawPreview() {
  const skin = paint(canvas, previewBuild());
  $('parts-note').hidden = skin.supportsParts !== false;
  if (!$('view-welcome').hidden) paint($<HTMLCanvasElement>('welcome-preview'), welcomeBuild());
  const before = document.getElementById('compare-current') as HTMLCanvasElement | null;
  const after = document.getElementById('compare-candidate') as HTMLCanvasElement | null;
  if (before) paint(before, { ...ui.state.equipped, tint: ui.state.tint } as unknown as Build);
  if (after) paint(after, previewBuild());
  const note = document.getElementById('compare-skin-note');
  if (note) note.hidden = skin.supportsParts !== false;
}
