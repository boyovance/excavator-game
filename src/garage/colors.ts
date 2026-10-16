import { TINT_SLOTS, partById } from '../shared/parts.mjs';
import { ui } from './store';

/** What a region looks like with no custom colour, so the picker starts from the real colour. */
function defaultTint(region: string): string {
  const [body, dark] = partById(ui.state.equipped.paint)?.colors ?? ['#f5b800', '#b07d00'];
  const shades: Record<string, string> = {
    body,
    cab: body,
    boom: body,
    stick: dark,
    tool: '#7a8590',
    tracks: '#3a3a3a',
    counterweight: dark,
  };
  return shades[region] ?? '#888888';
}

export function renderColors(): string {
  const rows = TINT_SLOTS.map((t) => {
    const custom = ui.state.tint[t.id];
    return `<div class="tint-row">
      <label for="tint-${t.id}">${t.name}</label>
      <input type="color" id="tint-${t.id}" data-tint="${t.id}" value="${custom ?? defaultTint(t.id)}" />
      <span class="tint-state">${custom ? '自訂' : '預設'}</span>
      <button data-tint-reset="${t.id}" ${custom ? '' : 'disabled'}>恢復預設</button>
    </div>`;
  }).join('');
  const any = Object.keys(ui.state.tint).length > 0;
  return `${rows}<div class="tint-row"><button data-tint-reset="*" ${any ? '' : 'disabled'}>全部恢復預設</button></div>
    <p class="hint tint-hint">每個區域可以選任何顏色,免費。拖動調色盤時預覽會即時變化,放開後才會儲存。</p>`;
}
