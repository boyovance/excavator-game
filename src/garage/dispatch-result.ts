import { dispatchGrowth, xpForLevel, type DispatchGrowth } from '../shared/growth.mjs';
import { partName, siteName, type GameState } from '../shared/reducer.mjs';
import { siteById, siteOpenTo } from '../shared/parts.mjs';
import { requestGrowthReward } from './growth';
import { ui } from './store';

const dialog = () => document.getElementById('dispatch-result') as HTMLDialogElement;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const shown = new Set<string>();
let current: DispatchGrowth | null = null;
let busy = false;
let message = '';
let failed = false;
let returnFocus: HTMLElement | null = null;
let lastHtml = '';

export function showDispatchResult(before: GameState, after: GameState, jobId: string) {
  if (shown.has(jobId)) return;
  const result = dispatchGrowth(before, after, jobId);
  if (!result) return;
  shown.add(jobId);
  current = result; message = ''; failed = false; lastHtml = '';
  returnFocus = document.getElementById('jobs-to-growth');
  renderDispatchResult();
  dialog().showModal();
  dialog().scrollTop = 0;
}

export function renderDispatchResult() {
  if (!current) return;
  const { report: r, from, to, stages, sites } = current;
  const body = document.getElementById('dispatch-result-body')!;
  // Preserve focus and scroll when unrelated state pushes do not change this card.
  const html = `<div class="result-level">Lv.${from}<span aria-label="升級至">→</span>Lv.${to}</div>
    <section class="result-section"><h3>派遣收穫 · 已入庫</h3><p class="hint">${esc(siteName(r.site))} · ${esc(partName(r.machineId ?? 'm_std'))}</p>
      <div class="result-totals"><strong>+${r.coins} 金幣</strong><span>+${r.breakdown!.xp} 經驗</span><span>耐久 −${r.breakdown!.wear}</span></div>
      <div class="drop-list">${r.drops.length ? r.drops.map((d) => `<span class="drop-chip ${d.dup ? '' : 'new-drop'}"><b>${esc(partName(d.id))}</b>${d.dup ? `重複 · ${d.coins == null ? '已折現' : `+${d.coins} 金幣`}` : d.pity ? '新收藏 · 保底' : '新收藏'}</span>`).join('') : '<span class="hint">本次沒有帶回零件</span>'}</div>
      <p class="hint">以上金幣已包含裝備加成、大豐收與重複折現，不需再領一次。</p></section>
    <section class="result-section"><h3>${sites.length ? '新開放工地' : '等級成長'}</h3>${sites.length ? `<ul class="result-sites">${sites.map((id) => {
      const site = siteById(id)!;
      return `<li><b>${esc(site.name)}</b><span class="hint">${siteOpenTo(site, ui.state.equipped.machine) ? '目前機型適用' : `需 ${site.machines!.map(partName).map(esc).join('／')}`}</span></li>`;
    }).join('')}</ul>` : `<p class="hint">${stages.length ? '本次工地等級條件已達成；舊存檔的原有工地權限繼續保留。' : '本版工地路線已完成，仍可繼續升級與收集。'}</p>`}<p class="hint">工地已自動開放，無須先領取階段獎勵；派遣仍需適配機型與耐久。</p></section>
    <section class="result-section"><h3>階段獎勵 · 額外領取</h3>${stages.length ? stages.map((g) => {
      const claimed = ui.state.growthClaimed.includes(g.id);
      return `<div class="result-reward"><div><b>Lv.${g.level} 達成</b><span class="hint">${claimed ? '已入帳' : '待領取'} · ${g.coins} 金幣</span></div><button class="${claimed ? '' : 'primary'}" data-result-claim="${g.id}" ${busy || claimed || ui.state.xp < xpForLevel(g.level) ? 'disabled' : ''}>${claimed ? '已領取' : `領取 ${g.coins} 金幣`}</button></div>`;
    }).join('') : '<p class="hint">此等級沒有新增階段獎勵。</p>'}</section>`;
  if (lastHtml !== html) {
    const focused = (document.activeElement as HTMLElement | null)?.dataset.resultClaim;
    body.innerHTML = html;
    lastHtml = html;
    if (focused) body.querySelector<HTMLButtonElement>(`[data-result-claim="${focused}"]:not(:disabled)`)?.focus({ preventScroll: true });
  }
  const status = document.getElementById('dispatch-result-message')!;
  status.textContent = message; status.classList.toggle('error', failed);
  const close = document.getElementById('dispatch-result-close') as HTMLButtonElement;
  close.disabled = busy;
  close.textContent = stages.some((g) => !ui.state.growthClaimed.includes(g.id)) ? '稍後領取' : '完成';
}

export function bindDispatchResult() {
  document.getElementById('dispatch-result-close')!.addEventListener('click', () => { if (!busy) dialog().close(); });
  dialog().addEventListener('cancel', (event) => { if (busy) event.preventDefault(); });
  dialog().addEventListener('close', () => {
    if (dialog().open) return;
    current = null;
    returnFocus?.focus({ preventScroll: true });
  });
  document.getElementById('dispatch-result-body')!.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-result-claim]');
    if (!button || button.disabled || busy) return;
    busy = true; failed = false; message = '正在儲存階段獎勵…'; renderDispatchResult();
    try {
      const result = await requestGrowthReward(button.dataset.resultClaim!);
      failed = !result.ok; message = result.message;
    } finally { busy = false; renderDispatchResult(); }
  });
}
