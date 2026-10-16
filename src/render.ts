import { fitOrigin, machineFit } from './geometry';
import type { Build, Pose, Skin } from './skins/types';
import { H, W } from './skins/types';

export function drawPose(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  pose: Pose,
  build: Build,
  poseName?: string,
) {
  ctx.clearRect(0, 0, Math.ceil(W * skin.res), Math.ceil(H * skin.res));
  ctx.save();
  ctx.scale(skin.res, skin.res);
  const fit = machineFit(build);
  if (fit === 1 || skin.supportsParts === false) {
    skin.draw(ctx, pose, build, poseName);
  } else {
    // tall or long machines are drawn smaller so they stay in frame
    ctx.translate(fitOrigin.x, fitOrigin.y);
    ctx.scale(fit, fit);
    ctx.translate(-fitOrigin.x, -fitOrigin.y);
    if (skin.smooth) {
      skin.draw(ctx, pose, build, poseName);
    } else {
      // pixel art: draw at full size, then shrink with nearest-neighbour so the pixels stay hard.
      // The scratch canvas is bigger than the picture: a long arm reaches past the edge before it is shrunk.
      const pad = { x: 40, y: 30 };
      const off = document.createElement('canvas');
      off.width = Math.ceil((W + pad.x * 2) * skin.res);
      off.height = Math.ceil((H + pad.y * 2) * skin.res);
      const octx = off.getContext('2d')!;
      octx.scale(skin.res, skin.res);
      octx.translate(pad.x, pad.y);
      skin.draw(octx, pose, build, poseName);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, -pad.x, -pad.y, W + pad.x * 2, H + pad.y * 2);
    }
  }
  ctx.restore();
}
