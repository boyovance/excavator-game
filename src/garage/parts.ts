import { api } from '../api';
import { PARTS, SLOTS, fitsMachine, partById } from '../shared/parts.mjs';
import { renderColors } from './colors';
import { gridEl, tabsEl } from './dom';
import { drawPreview } from './preview';
import { ui } from './store';

/** The extra line on a card: how a machine drives and what it is for, or which machines a part fits. */
function detail(p: (typeof PARTS)[number]): string {
  if (p.machine) return `<small class="fits">行走:${p.machine.drive}　用途:${p.machine.use}</small>`;
  if (p.fits && p.fits.length < 9) {
    return `<small class="fits">適用機型:${p.fits.map((id) => partById(id)?.name ?? id).join('、')}</small>`;
  }
  return '';
}

/** The slot tabs and the grid below them: parts to buy or equip, or the colour pickers. */
export function renderParts() {
  const { state, slot } = ui;
  const GROUP_LABEL = { machine: '挖掘機', driver: '駕駛員' };
  let lastGroup = '';
  tabsEl.innerHTML = SLOTS.map((s) => {
    // the colour tab closes the machine group, just before the driver group starts
    const colorsTab =
      s.group === 'driver' && lastGroup === 'machine'
        ? `<button data-slot="colors" class="${slot === 'colors' ? 'on' : ''}">自訂顏色</button>`
        : '';
    const label =
      s.group !== lastGroup ? `<span class="group">${GROUP_LABEL[s.group]}</span>` : '';
    lastGroup = s.group;
    return `${colorsTab}${label}<button data-slot="${s.id}" class="${s.id === slot ? 'on' : ''}">${s.name}</button>`;
  }).join('');

  if (slot === 'colors') {
    gridEl.innerHTML = renderColors();
    return;
  }

  const machineId = state.equipped.machine;
  gridEl.innerHTML = PARTS.filter((p) => p.slot === slot && fitsMachine(p, machineId))
    .map((p) => {
      const owned = state.owned.includes(p.id);
      const equipped = state.equipped[p.slot] === p.id;
      const swatch = p.colors ? `<span class="swatch" style="background:${p.colors[0]}"></span>` : '';
      let action: string;
      if (equipped) action = '<span class="tag">已裝備</span>';
      else if (owned) action = `<button data-act="equip" data-id="${p.id}">裝備</button>`;
      else if (p.price == null || p.workOnly) action = '<button disabled>派遣工作獲得</button>';
      else
        action = `<button class="primary" data-act="buy" data-id="${p.id}" ${
          state.coins < p.price ? 'disabled' : ''
        }>購買 ${p.price} 金幣</button>`;
      return `<div class="card ${equipped ? 'equipped' : ''}" data-part="${p.id}" data-slot="${p.slot}">
        <b>${swatch}${p.name}</b><small>${p.desc ?? ''}</small>${detail(p)}${action}</div>`;
    })
    .join('');
}

export function bindParts(render: () => void) {
  tabsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    if (!btn) return;
    ui.slot = btn.dataset.slot!;
    ui.tryOn = null;
    render();
  });

  gridEl.addEventListener('click', (e) => {
    const reset = (e.target as HTMLElement).closest<HTMLElement>('[data-tint-reset]');
    if (reset) {
      const region = reset.dataset.tintReset!;
      if (region === '*') ui.liveTint = {};
      else delete ui.liveTint[region];
      api.dispatch({ type: 'tint', slot: region, color: null });
      return;
    }
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!btn) return;
    api.dispatch({ type: btn.dataset.act as 'buy' | 'equip', id: btn.dataset.id! });
  });

  gridEl.addEventListener('input', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-tint]');
    if (!input) return;
    ui.liveTint[input.dataset.tint!] = input.value;
    drawPreview();
  });

  gridEl.addEventListener('change', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-tint]');
    if (!input) return;
    const region = input.dataset.tint!;
    delete ui.liveTint[region];
    api.dispatch({ type: 'tint', slot: region, color: input.value });
  });

  gridEl.addEventListener('mouseover', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('[data-part]');
    ui.tryOn = card ? { slot: card.dataset.slot!, id: card.dataset.part! } : null;
    drawPreview();
  });
  gridEl.addEventListener('mouseleave', () => {
    ui.tryOn = null;
    drawPreview();
  });
}
