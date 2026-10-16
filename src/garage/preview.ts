import { POSES, type PoseName } from '../poses';
import { drawPose } from '../render';
import { getSkin } from '../skins';
import { H, W, type Build } from '../skins/types';
import { machineDefaults } from '../shared/parts.mjs';
import { $, canvas } from './dom';
import { ui } from './store';

const SHOW: PoseName[] = ['idle', 'walk0', 'idle', 'walk1', 'dig1', 'dig2', 'dig3', 'idle'];

function previewBuild(): Build {
  const b = { ...ui.state.equipped };
  if (ui.tryOn?.slot === 'machine') Object.assign(b, machineDefaults(ui.tryOn.id), { machine: ui.tryOn.id });
  else if (ui.tryOn) b[ui.tryOn.slot] = ui.tryOn.id;
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
}
