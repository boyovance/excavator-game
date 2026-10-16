import { api } from '../api';
import { PARTS, SLOTS } from '../shared/parts.mjs';
import { $ } from './dom';
import { drawPreview } from './preview';
import { ui } from './store';

// ---- first-run welcome: name the pet and dress the driver ----

const DRIVER_SLOTS = ['skin', 'hair', 'haircolor', 'outfit', 'hat'];

function renderWelcomePickers() {
  $('welcome-pickers').innerHTML = DRIVER_SLOTS.map((slotId) => {
    const slotInfo = SLOTS.find((s) => s.id === slotId)!;
    const chips = PARTS.filter((p) => p.slot === slotId && ui.state.owned.includes(p.id))
      .map((p) => {
        const dot = p.colors ? `<span class="dot" style="background:${p.colors[0]}"></span>` : '';
        const on = (ui.welcomePick[slotId] ?? ui.state.equipped[slotId]) === p.id;
        return `<button class="chip ${on ? 'on' : ''}" data-slot="${slotId}" data-id="${p.id}">${dot}${p.name}</button>`;
      })
      .join('');
    return `<div class="picker"><div class="label">${slotInfo.name}</div><div class="chips">${chips}</div></div>`;
  }).join('');
}

export function startWelcome() {
  ui.welcomePick = {};
  $<HTMLInputElement>('welcome-name').value = ui.state.name;
  renderWelcomePickers();
  drawPreview();
}

function finishWelcome(skip: boolean) {
  if (!skip) {
    const name = $<HTMLInputElement>('welcome-name').value.trim();
    if (name && name !== ui.state.name) api.dispatch({ type: 'rename', name });
    for (const [slotId, id] of Object.entries(ui.welcomePick)) {
      if (ui.state.equipped[slotId] !== id) api.dispatch({ type: 'equip', id });
    }
  }
  api.setSettings({ onboarding: skip ? 'done' : 'poke' });
  window.close();
}

export function bindWelcome() {
  $('welcome-pickers').addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
    if (!chip) return;
    ui.welcomePick[chip.dataset.slot!] = chip.dataset.id!;
    renderWelcomePickers();
    drawPreview();
  });
  $('welcome-start').addEventListener('click', () => finishWelcome(false));
  $('welcome-skip').addEventListener('click', () => finishWelcome(true));
  $('welcome-name').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') finishWelcome(false);
  });
}
