import { api } from '../api';
import { PARTS, SLOTS, fitsMachine, partById, type Part } from '../shared/parts.mjs';
import { buyable, catalogParts, equipmentStats, partSources, previewEquipment, type CatalogFilter } from '../shared/catalog.mjs';
import { renderColors } from './colors';
import { $, gridEl, tabsEl } from './dom';
import { drawPreview } from './preview';
import { ui } from './store';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const name = (id: string) => partById(id)?.name ?? id;
const dialog = () => $<HTMLDialogElement>('part-detail');
let selected: string | null = null;
let busy = false;
let message = '';
let failed = false;

function actionFor(p: Part) {
  if (!fitsMachine(p, ui.state.equipped.machine)) return { label: '目前機型不適用', disabled: true };
  if (ui.state.equipped[p.slot] === p.id) return { label: '已裝備', disabled: true };
  if (ui.state.owned.includes(p.id)) return { label: p.machine ? '切換此機型' : '裝備此零件', type: 'equip' as const, disabled: false };
  if (!buyable(p)) return { label: '請從下方來源取得', disabled: true };
  const missing = Math.max(0, p.price! - ui.state.coins);
  return { label: missing ? `還差 ${missing} 金幣` : `購買並裝備 · ${p.price} 金幣`, type: 'buy' as const, disabled: missing > 0 };
}

export function renderParts() {
  const { state, slot } = ui;
  const labels = { machine: '挖掘機', driver: '駕駛員' };
  let lastGroup = '';
  tabsEl.innerHTML = SLOTS.map((s) => {
    const colors = s.group === 'driver' && lastGroup === 'machine' ? `<button data-slot="colors" class="${slot === 'colors' ? 'on' : ''}">自訂顏色</button>` : '';
    const label = s.group !== lastGroup ? `<span class="group">${labels[s.group]}</span>` : '';
    lastGroup = s.group;
    return `${colors}${label}<button data-slot="${s.id}" aria-pressed="${s.id === slot}" class="${s.id === slot ? 'on' : ''}">${s.name}</button>`;
  }).join('');
  const ownedCount = PARTS.filter((p) => state.owned.includes(p.id)).length;
  $('catalog-count').textContent = `收藏 ${ownedCount} / ${PARTS.length}`;
  $('catalog-progress').style.width = `${ownedCount / PARTS.length * 100}%`;
  $('catalog-machine').textContent = `目前機型：${name(state.equipped.machine)}`;
  $('catalog-controls').hidden = slot === 'colors';
  if (slot === 'colors') {
    gridEl.innerHTML = renderColors();
    $('catalog-results').textContent = '自訂顏色不影響收益。';
  } else {
    const all = PARTS.filter((p) => p.slot === slot);
    const list = catalogParts(state, { slot, query: ui.catalogQuery, filter: ui.catalogFilter, compatibleOnly: ui.compatibleOnly });
    $('catalog-results').textContent = `本類已收集 ${all.filter((p) => state.owned.includes(p.id)).length} / ${all.length} · 顯示 ${list.length} 件`;
    gridEl.innerHTML = list.map((p) => {
      const owned = state.owned.includes(p.id);
      const equipped = state.equipped[p.slot] === p.id;
      const fits = fitsMachine(p, state.equipped.machine);
      const swatch = p.colors ? `<span class="swatch" style="background:${p.colors[0]}"></span>` : '';
      const source = p.price === 0 ? '初始收藏' : buyable(p) ? `商店 ${p.price} 金幣` : partSources(p, state.equipped.machine).some((s) => s.kind === 'machine') ? '派遣／機型附送' : '派遣限定';
      return `<article class="card catalog-card ${equipped ? 'equipped' : ''}" data-part="${p.id}"><div class="catalog-tags"><span class="catalog-tag ${owned ? 'owned' : ''}">${equipped ? '已裝備' : owned ? '已擁有' : '未擁有'}</span>${!fits ? '<span class="catalog-tag incompatible">機型不符</span>' : ''}</div>
        <b>${swatch}${esc(p.name)}</b><small class="catalog-description">${esc(p.desc ?? '外觀搭配，不影響收益。')}</small><small>${source}</small><button data-open-part="${p.id}">${fits ? '查看與試裝' : '查看適配與來源'}</button></article>`;
    }).join('') || '<div class="catalog-empty"><b>沒有符合條件的零件</b><p>試著清除搜尋或切換篩選條件。</p><button id="catalog-reset">清除篩選</button></div>';
  }
  if (dialog().open) renderDetail();
}

function renderDetail() {
  const p = selected ? partById(selected) : undefined;
  if (!p) return;
  const state = ui.state;
  const candidate = previewEquipment(state, p.id);
  ui.tryOn = candidate ? { slot: p.slot, id: p.id } : null;
  const before = equipmentStats(state.equipped, state.durability);
  const after = candidate ? equipmentStats(candidate, state.durability) : null;
  const action = actionFor(p);
  const rows = [ ['dig', '挖掘金幣／次'], ['job', '派遣收益倍率'], ['speed', '行走速度倍率'] ] as const;
  const fmt = (key: 'dig' | 'job' | 'speed', n: number) => key === 'dig' ? `${n}` : `×${n.toFixed(2)}`;
  const noChange = after && rows.every(([k]) => Math.abs(after[k] - before[k]) < 0.000001);
  const sources = partSources(p, state.equipped.machine, state);
  $('part-detail-title').textContent = p.name;
  $('part-detail-body').innerHTML = `
    <div class="catalog-tags"><span class="catalog-tag ${state.owned.includes(p.id) ? 'owned' : ''}">${state.owned.includes(p.id) ? '已擁有' : '未擁有'}</span><span class="catalog-tag">${esc(SLOTS.find((s) => s.id === p.slot)?.name ?? p.slot)}</span></div>
    <p>${esc(p.desc ?? '自由搭配喜歡的外觀。')}</p><p class="hint">${p.machine ? `行走：${esc(p.machine.drive)} · 用途：${esc(p.machine.use)}` : p.fits ? `適用機型：${p.fits.map((id) => esc(name(id))).join('、')}` : '適用所有機型'}</p>
    ${candidate ? `<div class="compare-previews"><figure><figcaption>目前配置</figcaption><div class="compare-stage"><canvas id="compare-current" aria-label="目前配置外觀"></canvas></div><small>${esc(name(state.equipped[p.slot]))}</small></figure>
      <figure><figcaption>${state.equipped[p.slot] === p.id ? '已裝備配置' : '試裝 · 尚未套用'}</figcaption><div class="compare-stage"><canvas id="compare-candidate" aria-label="試裝配置外觀"></canvas></div><small>${esc(p.name)}</small></figure></div>
      <p id="compare-skin-note" class="catalog-warning" hidden>目前畫風是整張圖片，不呈現換件差異；請在車庫切換為經典像素或其他支援零件的畫風。</p>
      <table class="compare-table"><caption>整機效果比較（目前 → 試裝）</caption><thead><tr><th>項目</th><th>目前</th><th>試裝</th><th>差異</th></tr></thead><tbody>${rows.map(([key, label]) => {
        const delta = after![key] - before[key];
        const text = Math.abs(delta) < 0.000001 ? '不變' : `${delta > 0 ? '+' : ''}${key === 'dig' ? delta : delta.toFixed(2)}`;
        return `<tr><th>${label}</th><td>${fmt(key, before[key])}</td><td>${fmt(key, after![key])}</td><td class="${delta > 0 ? 'stat-up' : delta < 0 ? 'stat-down' : ''}">${text}</td></tr>`;
      }).join('')}</tbody></table>
      <p class="hint">${noChange ? '這次試裝的上述數值不變，可依外觀喜好選擇。' : '比較已含整機裝備；派遣實際金幣仍受工地與掉落影響。'}${state.durability < 30 ? ' 目前低耐久，行走倍率含 ×0.6 減速。' : ''}</p>
      ${p.machine ? '<p class="hint">已有機型會恢復上次搭配；尚未擁有的機型預覽標配。</p>' : ''}` : `<p class="catalog-warning">目前的${esc(name(state.equipped.machine))}不能使用此零件。請先切換適配機型；不會在錯誤機型上試裝。</p>`}
    ${state.jobs.length ? '<p class="catalog-warning">正在派遣：本次換裝只改車庫配置，不改已出發工作的快照。</p>' : ''}
    `;
  $('part-detail-sources').innerHTML = `<h3>獲取來源</h3><ul class="part-sources">${sources.map((s) => `<li><div><b>${esc(s.name)}</b><small>${esc(s.note)}</small></div>${s.kind === 'site' ? `<button data-source-site="${s.id}" ${busy || !s.available ? 'disabled' : ''}>查看工地</button>` : s.kind === 'machine' ? `<button data-related-part="${s.id}" ${busy ? 'disabled' : ''}>查看機型</button>` : ''}</li>`).join('') || '<li>目前沒有可取得來源。</li>'}</ul><p class="hint">查看來源不會購買或自動派遣。工作中取得的重複零件仍按原規則折現。</p>`;
  const button = $<HTMLButtonElement>('part-apply');
  button.textContent = busy ? '儲存中…' : action.label;
  button.disabled = busy || action.disabled;
  $<HTMLButtonElement>('part-close').disabled = busy;
  $('part-message').textContent = message;
  $('part-message').classList.toggle('error', failed);
  drawPreview();
}

function openPart(id: string) {
  if (busy || !partById(id)) return;
  selected = id; message = ''; failed = false; renderDetail();
  if (!dialog().open) dialog().showModal();
  dialog().scrollTop = 0;
}

export function bindParts(render: () => void) {
  tabsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-slot]');
    if (!btn) return;
    ui.slot = btn.dataset.slot!; ui.tryOn = null; render(); drawPreview();
  });
  $('catalog-search').addEventListener('input', () => { ui.catalogQuery = $<HTMLInputElement>('catalog-search').value; renderParts(); });
  $('catalog-filter').addEventListener('change', () => { ui.catalogFilter = $<HTMLSelectElement>('catalog-filter').value as CatalogFilter; renderParts(); });
  $('catalog-compatible').addEventListener('change', () => { ui.compatibleOnly = $<HTMLInputElement>('catalog-compatible').checked; renderParts(); });
  $('open-catalog').addEventListener('click', () => $('catalog').scrollIntoView({ block: 'start' }));
  gridEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('#catalog-reset')) {
      ui.catalogQuery = ''; ui.catalogFilter = 'all'; ui.compatibleOnly = false;
      $<HTMLInputElement>('catalog-search').value = ''; $<HTMLSelectElement>('catalog-filter').value = 'all'; $<HTMLInputElement>('catalog-compatible').checked = false;
      renderParts(); return;
    }
    const reset = target.closest<HTMLElement>('[data-tint-reset]');
    if (reset) {
      const region = reset.dataset.tintReset!;
      if (region === '*') ui.liveTint = {}; else delete ui.liveTint[region];
      api.dispatch({ type: 'tint', slot: region, color: null }); return;
    }
    const btn = target.closest<HTMLElement>('[data-open-part]');
    if (btn) openPart(btn.dataset.openPart!);
  });
  gridEl.addEventListener('input', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-tint]');
    if (input) { ui.liveTint[input.dataset.tint!] = input.value; drawPreview(); }
  });
  gridEl.addEventListener('change', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-tint]');
    if (input) { delete ui.liveTint[input.dataset.tint!]; api.dispatch({ type: 'tint', slot: input.dataset.tint!, color: input.value }); }
  });
  dialog().addEventListener('cancel', (e) => { if (busy) e.preventDefault(); });
  dialog().addEventListener('close', () => {
    if (dialog().open) return;
    selected = null; ui.tryOn = null;
    $('part-detail-body').replaceChildren(); $('part-detail-sources').replaceChildren();
    drawPreview();
  });
  $('part-close').addEventListener('click', () => { if (!busy) dialog().close(); });
  $('part-detail-sources').addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.disabled || busy) return;
    if (button.dataset.relatedPart) openPart(button.dataset.relatedPart);
    if (button.dataset.sourceSite) {
      dialog().close();
      const site = document.querySelector<HTMLButtonElement>(`[data-site="${button.dataset.sourceSite}"]`);
      (site?.closest('article') ?? $('jobs')).scrollIntoView({ block: 'center' }); site?.focus({ preventScroll: true });
    }
  });
  $('part-apply').addEventListener('click', async () => {
    const p = selected ? partById(selected) : undefined;
    if (!p || busy) return;
    const action = actionFor(p);
    if (action.disabled || !action.type) return;
    busy = true; message = ''; failed = false; renderDetail();
    try {
      const result = await api.requestAction({ type: action.type, id: p.id });
      failed = !result.ok; message = result.ok ? `${p.name}已裝備並儲存。` : result.message;
      if (result.state) ui.state = result.state;
    } catch { failed = true; message = '暫時無法確認操作結果，請檢查目前收藏後重試。'; }
    finally { busy = false; render(); drawPreview(); }
  });
}
