import { H } from '../skins/types';
import { partById } from '../shared/parts.mjs';
import { partName, siteName, type Report } from '../shared/reducer.mjs';
import { FONT } from './constants';
import type { SceneHost } from './host';

/** Gold lines that float up above the speech bubble row, so a bubble can never cover them. */
export function popBanner(host: SceneHost, lines: string[], holdMs = 3500) {
  const { scene } = host;
  const s = host.sprite!;
  const y = s.y - H * host.scalePx - 62;
  const text = scene.add
    .text(s.x, y, lines.join('\n'), {
      fontFamily: FONT,
      fontSize: `${Math.max(13, host.scalePx * 5)}px`,
      fontStyle: 'bold',
      color: '#ffd54a',
      stroke: '#4a3600',
      strokeThickness: 4,
      align: 'center',
    })
    .setOrigin(0.5, 1);
  scene.tweens.add({ targets: text, y: y - 24, duration: holdMs + 1000, ease: 'Sine.easeOut' });
  scene.tweens.add({ targets: text, alpha: 0, delay: holdMs, duration: 1000, onComplete: () => text.destroy() });
}

export function reportLines(r: Report): string[] {
  const site = siteName(r.site);
  const lines = [r.jackpot ? `大豐收!${site}收工  +${r.coins} 金幣` : `${site}收工  +${r.coins} 金幣`];
  const isMachine = (id: string) => partById(id)?.slot === 'machine';
  const machines = r.drops.filter((d) => !d.dup && isMachine(d.id)).map((d) => partName(d.id));
  const fresh = r.drops.filter((d) => !d.dup && !isMachine(d.id)).map((d) => partName(d.id));
  const repeats = r.drops.filter((d) => d.dup).map((d) => partName(d.id));
  if (machines.length) lines.push(`獲得新機型:${machines.join('、')}`);
  if (fresh.length) lines.push(`獲得新零件:${fresh.join('、')}`);
  if (repeats.length) lines.push(`重複零件「${repeats.join('、')}」已折算成金幣`);
  return lines;
}
