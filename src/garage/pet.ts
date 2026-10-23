import { api } from '../api';
import { companionDays, levelInfo, MILESTONES, moodLabel, repairCost } from '../shared/reducer.mjs';
import { $ } from './dom';
import { ui } from './store';

let restTimer: ReturnType<typeof setInterval> | null = null;
function stopRest() {
  if (restTimer !== null) clearInterval(restTimer);
  restTimer = null;
}

function renderPet() {
  const state = ui.state;
  const nameEl = $<HTMLInputElement>('pet-name');
  if (document.activeElement !== nameEl) nameEl.value = state.name;
  const lv = levelInfo(state.xp);
  $('pet-lv').textContent = `Lv.${lv.level}`;
  $('xp-bar').style.width = `${Math.min(100, (lv.into / lv.need) * 100)}%`;
  $('xp-text').textContent = `${lv.into} / ${lv.need}`;
  $('mood-bar').style.width = `${Math.round(state.mood)}%`;
  $('mood-text').textContent = moodLabel(state.mood);

  const days = companionDays(state);
  const next = MILESTONES.find(([day]) => day > state.milestone && day > days);
  $('pet-companion').innerHTML = `已陪伴 <b>${days}</b> 天${
    next ? `　下一個紀念日:第 ${next[0]} 天(還有 ${next[0] - days} 天)` : ''
  }`;
}

/** Coins, pet card and the machine's durability / repair button. */
export function renderStatus() {
  const state = ui.state;
  $('coins').textContent = `${state.coins} 金幣`;
  renderPet();

  const d = Math.round(state.durability);
  const bar = $('dur-bar');
  bar.style.width = `${d}%`;
  bar.style.background = d < 15 ? 'var(--bad)' : d < 40 ? 'var(--warn)' : 'var(--good)';
  $('dur-text').textContent = `${d}%`;
  const cost = repairCost(state.durability);
  const repair = $<HTMLButtonElement>('repair');
  repair.textContent = cost > 0 ? `維修(${cost} 金幣)` : '狀態良好';
  repair.disabled = cost <= 0 || state.coins < cost;
  if (state.durability >= 15) stopRest();
  const rest = $<HTMLButtonElement>('free-rest');
  rest.disabled = state.durability >= 15;
  rest.textContent = restTimer !== null ? '休息中 · 點此停止' : '免費休息至 15 耐久';
  // with several slots something is nearly always out, so resting no longer waits for jobs
  $('rest-note').textContent = restTimer !== null
    ? '每 3 秒恢復 1 點；可見車庫保持開啟才持續，不花金幣。'
    : '低於 15 耐久時可免費休息，再跑廢料場賺取維修費。';
}

function saveName() {
  const nameEl = $<HTMLInputElement>('pet-name');
  api.dispatch({ type: 'rename', name: nameEl.value });
  nameEl.blur();
}

export function bindPet() {
  $('free-rest').addEventListener('click', () => {
    if (restTimer !== null) stopRest();
    else if (ui.state.durability < 15) {
      restTimer = setInterval(() => {
        if (document.hidden || ui.state.durability >= 15) { stopRest(); renderStatus(); return; }
        api.dispatch({ type: 'rest' });
      }, 3000);
    }
    renderStatus();
  });
  window.addEventListener('beforeunload', stopRest);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopRest(); renderStatus(); } });
  $('repair').addEventListener('click', () => api.dispatch({ type: 'repair' }));
  $('pet-save').addEventListener('click', saveName);
  $('pet-name').addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') saveName();
  });
}
